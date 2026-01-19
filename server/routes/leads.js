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
 * Delete lead
 */
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

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
 */
router.post('/bulk-assign-campaign', async (req, res) => {
    try {
        const { leadIds, campaignId } = req.body;

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ success: false, error: 'leadIds array is required' });
        }

        // Update all leads with the campaign_id
        const { data: updatedLeads, error } = await supabase
            .from('leads')
            .update({ campaign_id: campaignId || null })
            .in('id', leadIds)
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: `${updatedLeads.length} leads ${campaignId ? 'assigned to campaign' : 'removed from campaign'}`,
            count: updatedLeads.length
        });
    } catch (error) {
        console.error('Error bulk assigning leads to campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
