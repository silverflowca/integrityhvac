import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

/**
 * Run database migrations (admin only)
 */
router.post('/migrate/roles', async (req, res) => {
    try {
        // Check if requesting user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized. Admin access required.' });
        }

        // Create roles table
        await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS integrityhvac.roles (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(50) UNIQUE NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_roles_name ON integrityhvac.roles(name);
            `
        });

        // Insert default roles
        const { error: insertError } = await supabase
            .from('roles')
            .upsert([
                { name: 'admin', description: 'Full system access with user management capabilities' },
                { name: 'staff', description: 'Regular staff member with standard access' },
                { name: 'customer', description: 'Customer account with limited access' },
                { name: 'contractor', description: 'External contractor with project-specific access' },
                { name: 'consultant', description: 'Consultant with advisory access' },
                { name: 'other', description: 'Other role type' }
            ], { onConflict: 'name' });

        if (insertError) throw insertError;

        res.json({ success: true, message: 'Roles table created and populated successfully' });
    } catch (error) {
        console.error('Error running migration:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to run migration' });
    }
});

export default router;
