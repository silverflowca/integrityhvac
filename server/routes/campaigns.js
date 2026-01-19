import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// Note: authenticateToken is applied in server.js

// GET /api/campaigns/user/assigned - Get campaigns assigned to current user
// IMPORTANT: This must be defined BEFORE /:id routes to avoid "user" being matched as an id
router.get('/user/assigned', async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: assignments, error } = await supabase
            .from('campaign_users')
            .select(`
                campaign_id,
                assigned_at,
                campaign:campaigns(*)
            `)
            .eq('user_id', userId);

        if (error) throw error;

        const campaigns = assignments.map(a => a.campaign);
        res.json(campaigns);
    } catch (error) {
        console.error('Error fetching user campaigns:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/campaigns - Get all campaigns
router.get('/', async (req, res) => {
    try {
        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select(`
                *,
                created_by_user:users!campaigns_created_by_fkey(id, name, email),
                campaign_users(
                    user_id,
                    assigned_at,
                    user:users(id, name, email)
                )
            `)
            .order('created_at', { ascending: false })
            .limit(10000); // Set high limit to return all campaigns

        if (error) throw error;

        // Get lead counts for each campaign
        const campaignIds = campaigns.map(c => c.id);
        let counts = {};

        if (campaignIds.length > 0) {
            const { data: leadCounts, error: countError } = await supabase
                .from('leads')
                .select('campaign_id')
                .in('campaign_id', campaignIds)
                .not('campaign_id', 'is', null)
                .limit(100000); // Set high limit for lead counts

            if (countError) {
                console.error('Error fetching lead counts:', countError);
            } else {
                // Count leads per campaign
                leadCounts?.forEach(lead => {
                    counts[lead.campaign_id] = (counts[lead.campaign_id] || 0) + 1;
                });
            }
        }

        // Add lead counts to campaigns
        const campaignsWithCounts = campaigns.map(campaign => ({
            ...campaign,
            lead_count: counts[campaign.id] || 0,
            user_count: campaign.campaign_users?.length || 0
        }));

        console.log('Campaigns with counts:', JSON.stringify(campaignsWithCounts.map(c => ({ name: c.name, lead_count: c.lead_count, user_count: c.user_count })), null, 2));

        res.json({ campaigns: campaignsWithCounts });
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/campaigns/:id - Get single campaign
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: campaign, error } = await supabase
            .from('campaigns')
            .select(`
                *,
                created_by_user:users!campaigns_created_by_fkey(id, name, email),
                campaign_users(
                    user_id,
                    assigned_at,
                    user:users(id, name, email)
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Get lead count
        const { count, error: countError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', id);

        if (countError) throw countError;

        res.json({
            ...campaign,
            lead_count: count || 0,
            user_count: campaign.campaign_users?.length || 0
        });
    } catch (error) {
        console.error('Error fetching campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/campaigns - Create campaign (admin only)
router.post('/', async (req, res) => {
    try {
        const { name, description, status } = req.body;
        const userId = req.user.id;

        // Check if user is admin
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError) throw userError;
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can create campaigns' });
        }

        const { data: campaign, error } = await supabase
            .from('campaigns')
            .insert({
                name,
                description,
                status: status || 'active',
                created_by: userId
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ campaign });
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/campaigns/:id - Update campaign (admin only)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;
        const userId = req.user.id;

        // Check if user is admin
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError) throw userError;
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can update campaigns' });
        }

        const { data: campaign, error } = await supabase
            .from('campaigns')
            .update({ name, description, status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json(campaign);
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/campaigns/:id - Delete campaign (admin only)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if user is admin
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError) throw userError;
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can delete campaigns' });
        }

        const { error } = await supabase
            .from('campaigns')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/campaigns/:id/users - Assign users to campaign (admin only)
router.post('/:id/users', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_ids } = req.body; // Array of user IDs
        const userId = req.user.id;

        // Check if user is admin
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError) throw userError;
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can assign users to campaigns' });
        }

        // Insert campaign_users records
        const assignments = user_ids.map(uid => ({
            campaign_id: id,
            user_id: uid
        }));

        const { data, error } = await supabase
            .from('campaign_users')
            .upsert(assignments, { onConflict: 'campaign_id,user_id' })
            .select();

        if (error) throw error;

        res.json({ message: 'Users assigned successfully', data });
    } catch (error) {
        console.error('Error assigning users:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/campaigns/:id/users/:userId - Remove user from campaign (admin only)
router.delete('/:id/users/:userId', async (req, res) => {
    try {
        const { id, userId: targetUserId } = req.params;
        const userId = req.user.id;

        // Check if user is admin
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError) throw userError;
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can remove users from campaigns' });
        }

        const { error } = await supabase
            .from('campaign_users')
            .delete()
            .eq('campaign_id', id)
            .eq('user_id', targetUserId);

        if (error) throw error;

        res.json({ message: 'User removed from campaign successfully' });
    } catch (error) {
        console.error('Error removing user:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/campaigns/:id/users - Replace all users in campaign (admin only)
router.put('/:id/users', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_ids } = req.body; // Array of user IDs
        const userId = req.user.id;

        // Check if user is admin
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError) throw userError;
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can manage campaign users' });
        }

        // Delete existing assignments
        await supabase
            .from('campaign_users')
            .delete()
            .eq('campaign_id', id);

        // Insert new assignments
        if (user_ids && user_ids.length > 0) {
            const assignments = user_ids.map(uid => ({
                campaign_id: id,
                user_id: uid
            }));

            const { error } = await supabase
                .from('campaign_users')
                .insert(assignments);

            if (error) throw error;
        }

        res.json({ message: 'Campaign users updated successfully' });
    } catch (error) {
        console.error('Error updating campaign users:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/campaigns/:id/leads - Assign leads to campaign
router.post('/:id/leads', async (req, res) => {
    try {
        const { id } = req.params;
        const { lead_ids } = req.body; // Array of lead IDs

        const { data, error } = await supabase
            .from('leads')
            .update({ campaign_id: id })
            .in('id', lead_ids)
            .select();

        if (error) throw error;

        res.json({ message: `${data.length} leads assigned to campaign`, data });
    } catch (error) {
        console.error('Error assigning leads:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/campaigns/:id/leads - Remove leads from campaign (set to null)
router.delete('/:id/leads', async (req, res) => {
    try {
        const { id } = req.params;
        const { lead_ids } = req.body; // Array of lead IDs

        const { data, error } = await supabase
            .from('leads')
            .update({ campaign_id: null })
            .in('id', lead_ids)
            .eq('campaign_id', id)
            .select();

        if (error) throw error;

        res.json({ message: `${data.length} leads removed from campaign`, data });
    } catch (error) {
        console.error('Error removing leads:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/campaigns/:id/leads - Get leads for a campaign
router.get('/:id/leads', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .eq('campaign_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(leads);
    } catch (error) {
        console.error('Error fetching campaign leads:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
