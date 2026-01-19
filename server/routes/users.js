import express from 'express';
import bcrypt from 'bcryptjs';
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

/**
 * Create a new user (admin only)
 */
router.post('/', async (req, res) => {
    try {
        // Check if requesting user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized. Admin access required.' });
        }

        const { email, name, role, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ success: false, error: 'User with this email already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                email,
                name: name || null,
                role: role || 'staff',
                password_hash: passwordHash
            })
            .select('id, email, name, role, created_at, updated_at')
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, user: newUser });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ success: false, error: 'Failed to create user' });
    }
});

/**
 * Update a user (admin only)
 */
router.put('/:id', async (req, res) => {
    try {
        // Check if requesting user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized. Admin access required.' });
        }

        const { id } = req.params;
        const { email, name, role, password } = req.body;

        const updates = {};
        if (email) updates.email = email;
        if (name !== undefined) updates.name = name;
        if (role) updates.role = role;

        // Only update password if provided
        if (password) {
            updates.password_hash = await bcrypt.hash(password, 10);
        }

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select('id, email, name, role, created_at, updated_at')
            .single();

        if (error) throw error;

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
});

/**
 * Delete a user (admin only)
 */
router.delete('/:id', async (req, res) => {
    try {
        // Check if requesting user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized. Admin access required.' });
        }

        const { id } = req.params;

        // Prevent deleting yourself
        if (id === req.user.id) {
            return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

/**
 * Get all available roles
 */
router.get('/roles/list', async (req, res) => {
    try {
        const { data: roles, error } = await supabase
            .from('roles')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        res.json({ success: true, roles: roles || [] });
    } catch (error) {
        console.error('Error getting roles:', error);
        res.status(500).json({ success: false, error: 'Failed to get roles' });
    }
});

/**
 * Create a new role (admin only)
 */
router.post('/roles', async (req, res) => {
    try {
        // Check if requesting user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized. Admin access required.' });
        }

        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Role name is required' });
        }

        // Check if role already exists
        const { data: existingRole } = await supabase
            .from('roles')
            .select('id')
            .eq('name', name.toLowerCase())
            .single();

        if (existingRole) {
            return res.status(400).json({ success: false, error: 'Role with this name already exists' });
        }

        const { data: newRole, error } = await supabase
            .from('roles')
            .insert({
                name: name.toLowerCase(),
                description: description || null
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, role: newRole });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ success: false, error: 'Failed to create role' });
    }
});

export default router;
