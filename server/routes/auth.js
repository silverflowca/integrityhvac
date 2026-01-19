import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get current user profile (protected route)
 * Frontend manages auth via Supabase client, backend just fetches user data
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // req.user comes from Supabase Auth (has id, email, etc.)
        const userId = req.user.id;

        // Fetch user profile from users table
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, role, created_at, updated_at')
            .eq('id', userId)
            .single();

        if (error) {
            // If user doesn't exist in users table yet, create it
            if (error.code === 'PGRST116') {
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert({
                        id: userId,
                        email: req.user.email,
                        name: req.user.user_metadata?.name || req.user.email.split('@')[0],
                        role: 'user'
                    })
                    .select('id, email, name, role, created_at, updated_at')
                    .single();

                if (insertError) throw insertError;

                return res.json({
                    success: true,
                    user: newUser
                });
            }
            throw error;
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, error: 'Failed to get user' });
    }
});

/**
 * Update user profile (protected route)
 */
router.put('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;

        const { data: user, error } = await supabase
            .from('users')
            .update({ name })
            .eq('id', userId)
            .select('id, email, name, role, created_at, updated_at')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
});

export default router;
