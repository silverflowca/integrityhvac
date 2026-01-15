import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

/**
 * Get all users (without password hashes)
 */
router.get('/', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, name, role, created_at, updated_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ success: false, error: 'Failed to get users' });
    }
});

export default router;
