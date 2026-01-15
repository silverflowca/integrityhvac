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
                assigned_user:assigned_to(id, name, email, role)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

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
            // Fetch audit trail separately if needed
            auditTrail: []
        }));

        res.json({ success: true, leads: transformedLeads });
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
            callback_date: req.body.callbackDate || null
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

        // Prepare update data
        const updateData = {
            company: req.body.company || null,
            name: req.body.name,
            phone: req.body.phone,
            email: req.body.email || null,
            location: req.body.location || null,
            status: req.body.status,
            priority: req.body.priority || null,
            notes: req.body.notes || null,
            assigned_to: req.body.assignedTo || null,
            callback_date: req.body.callbackDate || null
        };

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

export default router;
