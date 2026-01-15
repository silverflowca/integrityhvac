import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// Default statuses (used for reset function)
const DEFAULT_STATUSES = [
    { name: 'New', is_default: true, order: 1 },
    { name: 'Contacted', is_default: true, order: 2 },
    { name: 'No answer', is_default: true, order: 3 },
    { name: 'Phone number not in service', is_default: true, order: 4 },
    { name: 'Qualified', is_default: true, order: 5 },
    { name: 'Quoted', is_default: true, order: 6 },
    { name: 'Cleaning Lead', is_default: true, order: 7 },
    { name: 'Won', is_default: true, order: 8 },
    { name: 'Lost', is_default: true, order: 9 },
    { name: 'Do Not Call', is_default: true, order: 10 },
    { name: 'Call Back', is_default: true, order: 11 }
];

/**
 * Get all statuses
 */
router.get('/', async (req, res) => {
    try {
        const { data: statuses, error } = await supabase
            .from('statuses')
            .select('*')
            .order('order', { ascending: true });

        if (error) throw error;

        // Transform to frontend format
        const transformedStatuses = statuses.map(status => ({
            id: status.id,
            name: status.name,
            isDefault: status.is_default,
            order: status.order
        }));

        res.json({ success: true, statuses: transformedStatuses });
    } catch (error) {
        console.error('Error getting statuses:', error);
        res.status(500).json({ success: false, error: 'Failed to get statuses' });
    }
});

/**
 * Add a new status
 */
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Status name is required' });
        }

        // Check for duplicate
        const { data: existing, error: checkError } = await supabase
            .from('statuses')
            .select('id')
            .ilike('name', name.trim())
            .limit(1);

        if (checkError) throw checkError;

        if (existing && existing.length > 0) {
            return res.status(400).json({ success: false, error: 'Status already exists' });
        }

        // Get the max order value
        const { data: maxOrderResult, error: maxError } = await supabase
            .from('statuses')
            .select('order')
            .order('order', { ascending: false })
            .limit(1);

        if (maxError) throw maxError;

        const maxOrder = maxOrderResult && maxOrderResult.length > 0 ? maxOrderResult[0].order : 0;

        // Insert new status
        const { data: newStatus, error: insertError } = await supabase
            .from('statuses')
            .insert({
                name: name.trim(),
                is_default: false,
                order: maxOrder + 1
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Transform to frontend format
        const transformedStatus = {
            id: newStatus.id,
            name: newStatus.name,
            isDefault: newStatus.is_default,
            order: newStatus.order
        };

        res.status(201).json({ success: true, status: transformedStatus });
    } catch (error) {
        console.error('Error adding status:', error);
        res.status(500).json({ success: false, error: 'Failed to add status' });
    }
});

/**
 * Delete a status
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if status exists and is not default
        const { data: status, error: fetchError } = await supabase
            .from('statuses')
            .select('is_default')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Status not found' });
            }
            throw fetchError;
        }

        // Don't allow deleting default statuses
        if (status.is_default) {
            return res.status(400).json({ success: false, error: 'Cannot delete default status' });
        }

        // Delete the status
        const { error: deleteError } = await supabase
            .from('statuses')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        res.json({ success: true, message: 'Status deleted successfully' });
    } catch (error) {
        console.error('Error deleting status:', error);
        res.status(500).json({ success: false, error: 'Failed to delete status' });
    }
});

/**
 * Reset to default statuses
 */
router.post('/reset', async (req, res) => {
    try {
        // Delete all custom statuses (is_default = false)
        const { error: deleteError } = await supabase
            .from('statuses')
            .delete()
            .eq('is_default', false);

        if (deleteError) throw deleteError;

        // Get the current default statuses
        const { data: statuses, error: fetchError } = await supabase
            .from('statuses')
            .select('*')
            .eq('is_default', true)
            .order('order', { ascending: true });

        if (fetchError) throw fetchError;

        // Transform to frontend format
        const transformedStatuses = statuses.map(status => ({
            id: status.id,
            name: status.name,
            isDefault: status.is_default,
            order: status.order
        }));

        res.json({ success: true, statuses: transformedStatuses });
    } catch (error) {
        console.error('Error resetting statuses:', error);
        res.status(500).json({ success: false, error: 'Failed to reset statuses' });
    }
});

/**
 * Update status order (drag and drop reordering)
 */
router.put('/reorder', async (req, res) => {
    try {
        const { statuses: reorderedStatuses } = req.body;

        if (!reorderedStatuses || !Array.isArray(reorderedStatuses)) {
            return res.status(400).json({ success: false, error: 'Invalid statuses array' });
        }

        // Update order for each status using a transaction-like approach
        const updates = reorderedStatuses.map((status, index) => {
            return supabase
                .from('statuses')
                .update({ order: index + 1 })
                .eq('id', status.id);
        });

        // Execute all updates
        await Promise.all(updates);

        // Fetch updated statuses
        const { data: statuses, error } = await supabase
            .from('statuses')
            .select('*')
            .order('order', { ascending: true });

        if (error) throw error;

        // Transform to frontend format
        const transformedStatuses = statuses.map(status => ({
            id: status.id,
            name: status.name,
            isDefault: status.is_default,
            order: status.order
        }));

        res.json({ success: true, statuses: transformedStatuses });
    } catch (error) {
        console.error('Error reordering statuses:', error);
        res.status(500).json({ success: false, error: 'Failed to reorder statuses' });
    }
});

export default router;
