import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

/**
 * Get all leads
 * Returns all leads from Supabase database
 */
router.get('/', async (req, res) => {
    try {
        const { data: leads, error } = await supabase
            .from('leads')
            .select(`
                *,
                assigned_user:assigned_to(id, name, email, role),
                campaign:campaign_id(id, name, status)
            `)
            .neq('status', 'deleted') // Exclude soft-deleted leads
            .order('created_at', { ascending: false })
            .limit(100000); // Set high limit to return all leads

        if (error) throw error;

        // Get call counts for all leads from audit_trails
        // Fetch all 'called' actions and count them, avoiding URI too long error
        let callCounts = {};

        const { data: callData, error: callError } = await supabase
            .from('audit_trails')
            .select('lead_id')
            .eq('action', 'called')
            .limit(100000); // Set high limit for audit trails

        if (callError) {
            console.error('Error fetching call counts:', callError);
        } else {
            // Count calls per lead
            callData?.forEach(audit => {
                if (audit.lead_id) {
                    callCounts[audit.lead_id] = (callCounts[audit.lead_id] || 0) + 1;
                }
            });
        }

        // Transform Supabase data to match frontend expectations
        const transformedLeads = leads.map(lead => ({
            id: lead.id,
            company: lead.company,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            location: lead.location,
            status: lead.status,
            priority: lead.priority,
            notes: lead.notes,
            assignedTo: lead.assigned_to,
            callbackDate: lead.callback_date,
            createdAt: lead.created_at,
            updatedAt: lead.updated_at,
            campaignId: lead.campaign_id,
            campaign: lead.campaign,
            callCount: callCounts[lead.id] || 0,
            // Fetch audit trail separately if needed
            auditTrail: []
        }));

        console.log(`[Leads API] Returning ${transformedLeads.length} leads`);
        res.json({ success: true, leads: transformedLeads, count: transformedLeads.length });
    } catch (error) {
        console.error('Error getting leads:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get call history for current user
 * Returns leads that the user has called, ordered by most recent call
 * IMPORTANT: This route must be defined BEFORE /:id routes
 */
router.get('/call-history', async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // Get all 'called' audit trail entries for this user, ordered by timestamp desc
        const { data: callRecords, error: callError } = await supabase
            .from('audit_trails')
            .select('lead_id, timestamp, changes')
            .eq('user_id', userId)
            .eq('action', 'called')
            .order('timestamp', { ascending: false });

        if (callError) throw callError;

        if (!callRecords || callRecords.length === 0) {
            return res.json({
                success: true,
                calls: [],
                total: 0,
                page,
                totalPages: 0
            });
        }

        // Get unique lead IDs while preserving order (most recent call first)
        const seenLeadIds = new Set();
        const uniqueCallRecords = [];
        for (const record of callRecords) {
            if (!seenLeadIds.has(record.lead_id)) {
                seenLeadIds.add(record.lead_id);
                uniqueCallRecords.push(record);
            }
        }

        const total = uniqueCallRecords.length;
        const totalPages = Math.ceil(total / limit);

        // Apply pagination
        const paginatedRecords = uniqueCallRecords.slice(offset, offset + limit);
        const leadIds = paginatedRecords.map(r => r.lead_id);

        // Fetch lead details for these leads
        const { data: leads, error: leadsError } = await supabase
            .from('leads')
            .select(`
                id, company, name, phone, email, location, status, priority,
                campaign_id, assigned_to, notes, created_at, updated_at,
                campaign:campaigns(id, name)
            `)
            .in('id', leadIds);

        if (leadsError) throw leadsError;

        // Create a map for quick lookup
        const leadMap = {};
        leads?.forEach(lead => {
            leadMap[lead.id] = lead;
        });

        // Build response with call time info, maintaining order from callRecords
        const calls = paginatedRecords.map(record => {
            const lead = leadMap[record.lead_id];
            if (!lead) return null;

            return {
                id: lead.id,
                company: lead.company,
                name: lead.name,
                phone: lead.phone,
                email: lead.email,
                location: lead.location,
                status: lead.status,
                priority: lead.priority,
                campaignId: lead.campaign_id,
                campaignName: lead.campaign?.name || null,
                assignedTo: lead.assigned_to,
                notes: lead.notes,
                createdAt: lead.created_at,
                updatedAt: lead.updated_at,
                lastCallTime: record.timestamp,
                callDuration: record.changes?.duration || 0,
                callNotes: record.changes?.notes || ''
            };
        }).filter(Boolean);

        res.json({
            success: true,
            calls,
            total,
            page,
            totalPages
        });
    } catch (error) {
        console.error('Error getting call history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get next unassigned lead and acquire lock atomically
 * Returns the next available lead that is not assigned to any user and not locked
 * IMPORTANT: This route must be defined BEFORE /:id routes to avoid matching issues
 */
router.post('/next-unassigned', async (req, res) => {
    try {
        const userId = req.user.id;
        const userName = req.user.name || req.user.email;
        const { currentLeadId } = req.body;

        console.log('[Next Unassigned] Request received, userId:', userId, 'currentLeadId:', currentLeadId);

        // Clean up expired locks first
        await supabase
            .from('lead_locks')
            .delete()
            .lt('expires_at', new Date().toISOString());

        // Get all currently locked lead IDs
        const { data: activeLocks, error: locksError } = await supabase
            .from('lead_locks')
            .select('lead_id')
            .gt('expires_at', new Date().toISOString());

        if (locksError) throw locksError;

        const lockedLeadIds = activeLocks?.map(l => l.lead_id) || [];
        console.log('[Next Unassigned] Active locks:', lockedLeadIds.length);

        // Build query for unassigned leads that are not locked and not in terminal states
        let query = supabase
            .from('leads')
            .select('id, name, phone, company, status, priority, campaign_id')
            .is('assigned_to', null)
            .not('status', 'in', '("won","lost","deleted")')
            .order('created_at', { ascending: true })
            .limit(10); // Get a few candidates in case some get locked

        // Exclude currently locked leads
        if (lockedLeadIds.length > 0) {
            query = query.not('id', 'in', `(${lockedLeadIds.join(',')})`);
        }

        // Exclude current lead if provided
        if (currentLeadId) {
            query = query.neq('id', currentLeadId);
        }

        const { data: availableLeads, error: leadsError } = await query;

        if (leadsError) throw leadsError;

        console.log('[Next Unassigned] Available leads found:', availableLeads?.length || 0);

        if (!availableLeads || availableLeads.length === 0) {
            return res.json({
                success: true,
                nextLead: null,
                message: 'No unassigned leads available'
            });
        }

        // Try to acquire lock on the first available lead
        for (const lead of availableLeads) {
            // Check if this lead got locked in the meantime
            const { data: existingLock, error: checkError } = await supabase
                .from('lead_locks')
                .select('*')
                .eq('lead_id', lead.id)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                continue; // Skip this lead if there's an error
            }

            if (existingLock) {
                continue; // Lead is locked, try next one
            }

            // Try to create lock
            const { data: newLock, error: insertError } = await supabase
                .from('lead_locks')
                .insert({
                    lead_id: lead.id,
                    user_id: userId,
                    user_name: userName,
                    locked_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
                })
                .select()
                .single();

            if (insertError) {
                // Race condition - another user locked it, try next lead
                if (insertError.code === '23505') {
                    continue;
                }
                throw insertError;
            }

            // Successfully locked this lead
            console.log('[Next Unassigned] Returning lead:', lead.id, lead.company || lead.name);
            return res.json({
                success: true,
                nextLead: {
                    id: lead.id,
                    name: lead.name,
                    phone: lead.phone,
                    company: lead.company,
                    status: lead.status,
                    priority: lead.priority,
                    campaignId: lead.campaign_id
                },
                lock: newLock,
                message: 'Lead locked successfully'
            });
        }

        // All candidates got locked by other users
        return res.json({
            success: true,
            nextLead: null,
            message: 'All available leads are currently being dialed by others'
        });

    } catch (error) {
        console.error('Error getting next unassigned lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get lead by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { data: lead, error } = await supabase
            .from('leads')
            .select(`
                *,
                assigned_user:assigned_to(id, name, email, role)
            `)
            .eq('id', req.params.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Lead not found' });
            }
            throw error;
        }

        // Fetch audit trail for this lead
        const { data: auditTrail, error: auditError } = await supabase
            .from('audit_trails')
            .select('*')
            .eq('lead_id', req.params.id)
            .order('timestamp', { ascending: false });

        if (auditError) throw auditError;

        // Count calls from audit trail
        const callCount = auditTrail.filter(a => a.action === 'called').length;

        // Transform to frontend format
        const transformedLead = {
            id: lead.id,
            company: lead.company,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            location: lead.location,
            status: lead.status,
            priority: lead.priority,
            notes: lead.notes,
            assignedTo: lead.assigned_to,
            callbackDate: lead.callback_date,
            createdAt: lead.created_at,
            updatedAt: lead.updated_at,
            callCount: callCount,
            auditTrail: auditTrail.map(audit => ({
                timestamp: audit.timestamp,
                userId: audit.user_id,
                userName: audit.user_name,
                action: audit.action,
                duration: audit.duration,
                notes: audit.notes,
                changes: audit.changes
            }))
        };

        res.json({ success: true, lead: transformedLead });
    } catch (error) {
        console.error('Error getting lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Create new lead
 */
router.post('/', async (req, res) => {
    try {
        const newLeadData = {
            company: req.body.company || null,
            name: req.body.name,
            phone: req.body.phone,
            email: req.body.email || null,
            location: req.body.location || null,
            status: req.body.status || 'new',
            priority: req.body.priority || null,
            notes: req.body.notes || null,
            assigned_to: req.body.assignedTo || null,
            callback_date: req.body.callbackDate || null,
            campaign_id: req.body.campaignId || null
        };

        const { data: lead, error } = await supabase
            .from('leads')
            .insert(newLeadData)
            .select()
            .single();

        if (error) throw error;

        // Create audit trail entry for lead creation
        const { error: auditError } = await supabase
            .from('audit_trails')
            .insert({
                lead_id: lead.id,
                user_id: req.user.id,
                user_name: req.user.name || req.user.email,
                action: 'created',
                timestamp: new Date().toISOString()
            });

        if (auditError) console.error('Failed to create audit trail:', auditError);

        // Transform to frontend format
        const transformedLead = {
            id: lead.id,
            company: lead.company,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            location: lead.location,
            status: lead.status,
            priority: lead.priority,
            notes: lead.notes,
            assignedTo: lead.assigned_to,
            callbackDate: lead.callback_date,
            createdAt: lead.created_at,
            updatedAt: lead.updated_at
        };

        res.status(201).json({ success: true, lead: transformedLead });
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update lead
 */
router.put('/:id', async (req, res) => {
    try {
        // First, get the old lead data to track changes
        const { data: oldLead, error: fetchError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Lead not found' });
            }
            throw fetchError;
        }

        // Prepare update data - only include fields that are provided
        const updateData = {};
        if (req.body.company !== undefined) updateData.company = req.body.company || null;
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.phone !== undefined) updateData.phone = req.body.phone;
        if (req.body.email !== undefined) updateData.email = req.body.email || null;
        if (req.body.location !== undefined) updateData.location = req.body.location || null;
        if (req.body.status !== undefined) updateData.status = req.body.status;
        if (req.body.priority !== undefined) updateData.priority = req.body.priority || null;
        if (req.body.notes !== undefined) updateData.notes = req.body.notes || null;
        if (req.body.assignedTo !== undefined) updateData.assigned_to = req.body.assignedTo || null;
        if (req.body.callbackDate !== undefined) updateData.callback_date = req.body.callbackDate || null;
        if (req.body.campaignId !== undefined) updateData.campaign_id = req.body.campaignId || null;
        if (req.body.campaign_id !== undefined) updateData.campaign_id = req.body.campaign_id;

        // Track changes
        const changes = [];
        const fieldsToTrack = [
            { db: 'status', frontend: 'status' },
            { db: 'priority', frontend: 'priority' },
            { db: 'assigned_to', frontend: 'assignedTo' },
            { db: 'company', frontend: 'company' },
            { db: 'name', frontend: 'name' },
            { db: 'phone', frontend: 'phone' },
            { db: 'email', frontend: 'email' },
            { db: 'location', frontend: 'location' },
            { db: 'callback_date', frontend: 'callbackDate' }
        ];

        fieldsToTrack.forEach(({ db, frontend }) => {
            const oldValue = oldLead[db];
            const newValue = updateData[db];
            if (newValue !== undefined && newValue !== oldValue) {
                changes.push({
                    field: frontend,
                    oldValue: oldValue || '',
                    newValue: newValue || ''
                });
            }
        });

        // Update the lead
        const { data: updatedLead, error: updateError } = await supabase
            .from('leads')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Add audit trail entry if there are changes
        if (changes.length > 0) {
            const { error: auditError } = await supabase
                .from('audit_trails')
                .insert({
                    lead_id: req.params.id,
                    user_id: req.user.id,
                    user_name: req.user.name || req.user.email,
                    action: 'updated',
                    changes: changes,
                    timestamp: new Date().toISOString()
                });

            if (auditError) console.error('Failed to create audit trail:', auditError);
        }

        // Transform to frontend format
        const transformedLead = {
            id: updatedLead.id,
            company: updatedLead.company,
            name: updatedLead.name,
            phone: updatedLead.phone,
            email: updatedLead.email,
            location: updatedLead.location,
            status: updatedLead.status,
            priority: updatedLead.priority,
            notes: updatedLead.notes,
            assignedTo: updatedLead.assigned_to,
            callbackDate: updatedLead.callback_date,
            createdAt: updatedLead.created_at,
            updatedAt: updatedLead.updated_at
        };

        res.json({ success: true, lead: transformedLead });
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Delete lead (soft delete - sets status to 'deleted')
 */
router.delete('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leads')
            .update({ status: 'deleted' })
            .eq('id', req.params.id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead not found' });
        }

        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get leads by status
 */
router.get('/status/:status', async (req, res) => {
    try {
        // Don't allow fetching deleted leads via this endpoint
        if (req.params.status === 'deleted') {
            return res.json({ success: true, leads: [] });
        }

        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .eq('status', req.params.status)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform to frontend format
        const transformedLeads = leads.map(lead => ({
            id: lead.id,
            company: lead.company,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            location: lead.location,
            status: lead.status,
            priority: lead.priority,
            notes: lead.notes,
            assignedTo: lead.assigned_to,
            callbackDate: lead.callback_date,
            createdAt: lead.created_at,
            updatedAt: lead.updated_at
        }));

        res.json({ success: true, leads: transformedLeads });
    } catch (error) {
        console.error('Error getting leads by status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Bulk assign leads to a campaign
 * Handles large batches by chunking to avoid Supabase limits
 */
router.post('/bulk-assign-campaign', async (req, res) => {
    try {
        const { leadIds, campaignId } = req.body;

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ success: false, error: 'leadIds array is required' });
        }

        // Chunk the leadIds to avoid Supabase URI length limits
        const CHUNK_SIZE = 100;
        const chunks = [];
        for (let i = 0; i < leadIds.length; i += CHUNK_SIZE) {
            chunks.push(leadIds.slice(i, i + CHUNK_SIZE));
        }

        let totalUpdated = 0;

        // Process each chunk
        for (const chunk of chunks) {
            const { data: updatedLeads, error } = await supabase
                .from('leads')
                .update({ campaign_id: campaignId || null })
                .in('id', chunk)
                .select();

            if (error) throw error;
            totalUpdated += updatedLeads?.length || 0;
        }

        res.json({
            success: true,
            message: `${totalUpdated} leads ${campaignId ? 'assigned to campaign' : 'removed from campaign'}`,
            count: totalUpdated
        });
    } catch (error) {
        console.error('Error bulk assigning leads to campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Bulk action on leads (filter-based for large datasets)
 * Supports: move_campaign, change_status, change_priority, assign_user, delete
 */
router.post('/bulk-action', async (req, res) => {
    try {
        const { filters, action, leadIds, targetValue } = req.body;

        if (!action) {
            return res.status(400).json({ success: false, error: 'Action is required' });
        }

        // Chunk size to avoid Supabase URI length limits
        const CHUNK_SIZE = 100;

        // Helper function to process in chunks
        const processInChunks = async (ids, updateData) => {
            let totalCount = 0;
            for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
                const chunk = ids.slice(i, i + CHUNK_SIZE);
                const { data, error } = await supabase
                    .from('leads')
                    .update(updateData)
                    .in('id', chunk)
                    .select();

                if (error) throw error;
                totalCount += data?.length || 0;
            }
            return totalCount;
        };

        // If specific leadIds provided (client-side selection)
        if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
            // For delete action - soft delete by setting status to 'deleted'
            if (action === 'delete') {
                const totalDeleted = await processInChunks(leadIds, { status: 'deleted' });

                return res.json({
                    success: true,
                    message: `Deleted ${totalDeleted} leads`,
                    count: totalDeleted
                });
            }

            // For update actions
            let updateData = {};
            switch (action) {
                case 'move_campaign':
                    updateData.campaign_id = targetValue || null;
                    break;
                case 'change_status':
                    updateData.status = targetValue;
                    break;
                case 'change_priority':
                    updateData.priority = targetValue || null;
                    break;
                case 'assign_user':
                    updateData.assigned_to = targetValue || null;
                    break;
                default:
                    return res.status(400).json({ success: false, error: 'Invalid action' });
            }

            const totalUpdated = await processInChunks(leadIds, updateData);

            return res.json({
                success: true,
                message: `Updated ${totalUpdated} leads`,
                count: totalUpdated
            });
        }

        // Filter-based bulk action (server-side for > 250 leads)
        if (filters) {
            // First, get IDs of matching leads (exclude already deleted)
            let countQuery = supabase.from('leads').select('id')
                .neq('status', 'deleted');

            if (filters.campaign_id !== undefined) {
                if (filters.campaign_id === null || filters.campaign_id === '') {
                    countQuery = countQuery.is('campaign_id', null);
                } else {
                    countQuery = countQuery.eq('campaign_id', filters.campaign_id);
                }
            }
            if (filters.status) {
                countQuery = countQuery.eq('status', filters.status);
            }
            if (filters.priority) {
                countQuery = countQuery.eq('priority', filters.priority);
            }
            if (filters.assigned_to !== undefined) {
                if (filters.assigned_to === null || filters.assigned_to === '') {
                    countQuery = countQuery.is('assigned_to', null);
                } else {
                    countQuery = countQuery.eq('assigned_to', filters.assigned_to);
                }
            }

            const { data: matchingLeads, error: countError } = await countQuery;

            if (countError) throw countError;

            if (!matchingLeads || matchingLeads.length === 0) {
                return res.json({
                    success: true,
                    message: 'No leads match the specified filters',
                    count: 0
                });
            }

            const matchingIds = matchingLeads.map(l => l.id);

            // For delete action - soft delete by setting status to 'deleted'
            if (action === 'delete') {
                const totalDeleted = await processInChunks(matchingIds, { status: 'deleted' });

                return res.json({
                    success: true,
                    message: `Deleted ${totalDeleted} leads`,
                    count: totalDeleted
                });
            }

            // For update actions
            let updateData = {};
            switch (action) {
                case 'move_campaign':
                    updateData.campaign_id = targetValue || null;
                    break;
                case 'change_status':
                    updateData.status = targetValue;
                    break;
                case 'change_priority':
                    updateData.priority = targetValue || null;
                    break;
                case 'assign_user':
                    updateData.assigned_to = targetValue || null;
                    break;
                default:
                    return res.status(400).json({ success: false, error: 'Invalid action' });
            }

            const totalUpdated = await processInChunks(matchingIds, updateData);

            return res.json({
                success: true,
                message: `Updated ${totalUpdated} leads`,
                count: totalUpdated
            });
        }

        return res.status(400).json({ success: false, error: 'Either leadIds or filters are required' });

    } catch (error) {
        console.error('Error performing bulk action:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get count of leads matching filters (for preview)
 */
router.post('/bulk-count', async (req, res) => {
    try {
        const { filters } = req.body;

        let query = supabase.from('leads').select('id')
            .neq('status', 'deleted'); // Exclude soft-deleted leads

        if (filters) {
            if (filters.campaign_id !== undefined) {
                if (filters.campaign_id === null || filters.campaign_id === '') {
                    query = query.is('campaign_id', null);
                } else {
                    query = query.eq('campaign_id', filters.campaign_id);
                }
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.priority) {
                query = query.eq('priority', filters.priority);
            }
            if (filters.assigned_to !== undefined) {
                if (filters.assigned_to === null || filters.assigned_to === '') {
                    query = query.is('assigned_to', null);
                } else {
                    query = query.eq('assigned_to', filters.assigned_to);
                }
            }
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            count: data?.length || 0
        });
    } catch (error) {
        console.error('Error counting leads:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// LEAD LOCKING ENDPOINTS - Prevent multiple users dialing same lead
// ============================================================================

/**
 * Get lock status for a lead
 * Returns lock info if locked, null if not locked
 */
router.get('/:id/lock', async (req, res) => {
    try {
        // First, clean up any expired locks
        await supabase
            .from('lead_locks')
            .delete()
            .lt('expires_at', new Date().toISOString());

        // Check if lead is locked
        const { data: lock, error } = await supabase
            .from('lead_locks')
            .select('*')
            .eq('lead_id', req.params.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned (not locked)
            throw error;
        }

        res.json({
            success: true,
            locked: !!lock,
            lock: lock || null
        });
    } catch (error) {
        console.error('Error checking lead lock:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Acquire lock on a lead (before dialing)
 * Fails if already locked by another user
 */
router.post('/:id/lock', async (req, res) => {
    try {
        const leadId = req.params.id;
        const userId = req.user.id;
        const userName = req.user.name || req.user.email;

        // First, clean up any expired locks
        await supabase
            .from('lead_locks')
            .delete()
            .lt('expires_at', new Date().toISOString());

        // Check if already locked
        const { data: existingLock, error: checkError } = await supabase
            .from('lead_locks')
            .select('*')
            .eq('lead_id', leadId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existingLock) {
            // Already locked
            if (existingLock.user_id === userId) {
                // Same user - extend the lock
                const { data: updatedLock, error: updateError } = await supabase
                    .from('lead_locks')
                    .update({
                        locked_at: new Date().toISOString(),
                        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
                    })
                    .eq('lead_id', leadId)
                    .select()
                    .single();

                if (updateError) throw updateError;

                return res.json({
                    success: true,
                    lock: updatedLock,
                    message: 'Lock extended'
                });
            } else {
                // Different user - reject
                return res.status(409).json({
                    success: false,
                    error: 'Lead is currently being dialed by another user',
                    lockedBy: existingLock.user_name,
                    lock: existingLock
                });
            }
        }

        // Create new lock
        const { data: newLock, error: insertError } = await supabase
            .from('lead_locks')
            .insert({
                lead_id: leadId,
                user_id: userId,
                user_name: userName,
                locked_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            })
            .select()
            .single();

        if (insertError) {
            // Handle race condition - another user locked it first
            if (insertError.code === '23505') { // unique violation
                return res.status(409).json({
                    success: false,
                    error: 'Lead was just locked by another user'
                });
            }
            throw insertError;
        }

        res.json({
            success: true,
            lock: newLock,
            message: 'Lock acquired'
        });
    } catch (error) {
        console.error('Error acquiring lead lock:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Release lock on a lead (after hanging up)
 */
router.delete('/:id/lock', async (req, res) => {
    try {
        const leadId = req.params.id;
        const userId = req.user.id;

        // Only delete if it's the user's own lock
        const { data, error } = await supabase
            .from('lead_locks')
            .delete()
            .eq('lead_id', leadId)
            .eq('user_id', userId)
            .select();

        if (error) throw error;

        res.json({
            success: true,
            released: data && data.length > 0,
            message: data && data.length > 0 ? 'Lock released' : 'No lock to release'
        });
    } catch (error) {
        console.error('Error releasing lead lock:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get all active locks for a campaign (for UI display)
 */
router.get('/campaign/:campaignId/locks', async (req, res) => {
    try {
        // Clean up expired locks first
        await supabase
            .from('lead_locks')
            .delete()
            .lt('expires_at', new Date().toISOString());

        // Get all active locks for leads in this campaign
        const { data: locks, error } = await supabase
            .from('lead_locks')
            .select(`
                *,
                lead:lead_id(id, name, campaign_id)
            `)
            .gt('expires_at', new Date().toISOString());

        if (error) throw error;

        // Filter to only locks for leads in this campaign
        const campaignLocks = locks.filter(lock =>
            lock.lead && lock.lead.campaign_id === req.params.campaignId
        );

        res.json({
            success: true,
            locks: campaignLocks
        });
    } catch (error) {
        console.error('Error getting campaign locks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
