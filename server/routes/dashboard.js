import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// Get admin dashboard stats (team overview)
router.get('/admin', async (req, res) => {
    try {
        // Fetch all leads with status and priority
        const { data: leads, error: leadsError } = await supabase
            .from('leads')
            .select('id, status, priority, assigned_to');

        if (leadsError) throw leadsError;

        // Fetch all users
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, name, email');

        if (usersError) throw usersError;

        // Fetch all activities
        const { data: activities, error: activitiesError } = await supabase
            .from('activities')
            .select('*');

        if (activitiesError) throw activitiesError;

        // Calculate team stats
        const totalLeads = leads.length;
        const statusBreakdown = leads.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
        }, {});

        const priorityBreakdown = leads.reduce((acc, lead) => {
            acc[lead.priority] = (acc[lead.priority] || 0) + 1;
            return acc;
        }, {});

        // Calculate conversion rates
        const wonLeads = leads.filter(l => l.status === 'won').length;
        const lostLeads = leads.filter(l => l.status === 'lost').length;
        const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;

        // Activity stats
        const totalCalls = activities.filter(a => a.type === 'call').length;
        const totalEmails = activities.filter(a => a.type === 'email').length;
        const totalNotes = activities.filter(a => a.type === 'note').length;

        // User performance (calls per user)
        const userStats = users.map(user => {
            const userActivities = activities.filter(a => a.user_id === user.id);
            const userCallActivities = userActivities.filter(a => a.type === 'call');
            const userCalls = userCallActivities.length;

            // Calculate total call minutes
            const totalCallSeconds = userCallActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
            const totalCallMinutes = Math.round(totalCallSeconds / 60);

            const userLeads = leads.filter(l => l.assigned_to === user.id);
            const userWonLeads = userLeads.filter(l => l.status === 'won').length;

            return {
                userId: user.id,
                name: user.name,
                totalCalls: userCalls,
                totalCallMinutes: totalCallMinutes,
                totalLeads: userLeads.length,
                wonLeads: userWonLeads,
                conversionRate: userLeads.length > 0 ? ((userWonLeads / userLeads.length) * 100).toFixed(1) : 0
            };
        });

        // Calculate total call minutes by time period
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        const callActivities = activities.filter(a => a.type === 'call');

        const callMinutesToday = Math.round(
            callActivities
                .filter(a => new Date(a.created_at) >= todayStart)
                .reduce((sum, a) => sum + (a.duration || 0), 0) / 60
        );

        const callMinutesWeek = Math.round(
            callActivities
                .filter(a => new Date(a.created_at) >= weekStart)
                .reduce((sum, a) => sum + (a.duration || 0), 0) / 60
        );

        const callMinutesMonth = Math.round(
            callActivities
                .filter(a => new Date(a.created_at) >= monthStart)
                .reduce((sum, a) => sum + (a.duration || 0), 0) / 60
        );

        const callMinutesYear = Math.round(
            callActivities
                .filter(a => new Date(a.created_at) >= yearStart)
                .reduce((sum, a) => sum + (a.duration || 0), 0) / 60
        );

        // Recent activity timeline (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentActivities = activities
            .filter(a => new Date(a.created_at) >= sevenDaysAgo)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 20)
            .map(a => ({
                id: a.id,
                userId: a.user_id,
                leadId: a.lead_id,
                type: a.type,
                duration: a.duration,
                notes: a.notes,
                timestamp: a.created_at
            }));

        res.json({
            success: true,
            stats: {
                totalLeads,
                wonLeads,
                lostLeads,
                conversionRate,
                totalCalls,
                totalEmails,
                totalNotes,
                callMinutesToday,
                callMinutesWeek,
                callMinutesMonth,
                callMinutesYear,
                statusBreakdown,
                priorityBreakdown,
                userStats,
                recentActivities
            }
        });
    } catch (error) {
        console.error('Error getting admin dashboard:', error);
        res.status(500).json({ success: false, error: 'Failed to get dashboard stats' });
    }
});

// Get individual user dashboard stats
router.get('/individual', async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user's leads (only assigned to this user)
        const { data: userLeads, error: leadsError } = await supabase
            .from('leads')
            .select('id, status, priority, assigned_to')
            .eq('assigned_to', userId);

        if (leadsError) throw leadsError;

        const totalLeads = userLeads.length;

        // Status breakdown
        const statusBreakdown = userLeads.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
        }, {});

        // Priority breakdown
        const priorityBreakdown = userLeads.reduce((acc, lead) => {
            acc[lead.priority] = (acc[lead.priority] || 0) + 1;
            return acc;
        }, {});

        // User's activities
        const { data: userActivities, error: activitiesError } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', userId);

        if (activitiesError) throw activitiesError;

        const totalCalls = userActivities.filter(a => a.type === 'call').length;
        const totalEmails = userActivities.filter(a => a.type === 'email').length;
        const totalNotes = userActivities.filter(a => a.type === 'note').length;

        // Calculate call duration stats
        const callActivities = userActivities.filter(a => a.type === 'call' && a.duration);
        const totalCallDuration = callActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
        const avgCallDuration = callActivities.length > 0 ? (totalCallDuration / callActivities.length).toFixed(0) : 0;

        // Activity by day (last 7 days)
        const activityByDay = {};
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            activityByDay[dateStr] = { calls: 0, emails: 0, notes: 0 };
        }

        userActivities.forEach(activity => {
            const dateStr = activity.created_at.split('T')[0];
            if (activityByDay[dateStr]) {
                activityByDay[dateStr][activity.type + 's'] = (activityByDay[dateStr][activity.type + 's'] || 0) + 1;
            }
        });

        // Goals and progress
        const dailyCallGoal = 20;
        const today = new Date().toISOString().split('T')[0];
        const todayCalls = userActivities.filter(a =>
            a.type === 'call' && a.created_at.startsWith(today)
        ).length;
        const callProgress = Math.min(100, (todayCalls / dailyCallGoal * 100).toFixed(0));

        // Conversion stats
        const wonLeads = userLeads.filter(l => l.status === 'won').length;
        const lostLeads = userLeads.filter(l => l.status === 'lost').length;
        const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;

        res.json({
            success: true,
            stats: {
                totalLeads,
                wonLeads,
                lostLeads,
                conversionRate,
                totalCalls,
                totalEmails,
                totalNotes,
                totalCallDuration,
                avgCallDuration,
                statusBreakdown,
                priorityBreakdown,
                activityByDay,
                todayCalls,
                dailyCallGoal,
                callProgress
            }
        });
    } catch (error) {
        console.error('Error getting individual dashboard:', error);
        res.status(500).json({ success: false, error: 'Failed to get dashboard stats' });
    }
});

// Log activity (for tracking calls, emails, notes)
router.post('/activity', async (req, res) => {
    try {
        const { type, leadId, duration, notes } = req.body;
        const userId = req.user.id;

        // Insert new activity into Supabase
        const { data: newActivity, error: activityError } = await supabase
            .from('activities')
            .insert({
                user_id: userId,
                lead_id: leadId,
                type, // 'call', 'email', 'note'
                duration, // in seconds (for calls)
                notes
            })
            .select()
            .single();

        if (activityError) throw activityError;

        // If this is a call activity with a leadId, update the lead's notes and audit trail
        if (type === 'call' && leadId) {
            // Get the lead
            const { data: lead, error: leadError } = await supabase
                .from('leads')
                .select('notes')
                .eq('id', leadId)
                .single();

            if (leadError) throw leadError;

            // Add audit trail entry for the call
            await supabase
                .from('audit_trails')
                .insert({
                    lead_id: leadId,
                    user_id: userId,
                    user_name: req.user.name || req.user.email,
                    action: 'called',
                    changes: {
                        duration,
                        notes: notes?.trim() || ''
                    }
                });

            // If there are notes, append them to the lead's notes field
            if (notes && notes.trim()) {
                const timestamp = new Date().toLocaleString();
                const callNote = `[Call - ${timestamp}] ${notes.trim()}`;

                let updatedNotes;
                if (lead.notes && lead.notes.trim()) {
                    updatedNotes = lead.notes.trim() + '\n\n' + callNote;
                } else {
                    updatedNotes = callNote;
                }

                await supabase
                    .from('leads')
                    .update({ notes: updatedNotes })
                    .eq('id', leadId);

                console.log(`Call activity added to audit trail for lead ${leadId}`);
            }
        }

        // Transform the response to match the expected format
        const transformedActivity = {
            id: newActivity.id,
            userId: newActivity.user_id,
            leadId: newActivity.lead_id,
            type: newActivity.type,
            duration: newActivity.duration,
            notes: newActivity.notes,
            timestamp: newActivity.created_at
        };

        res.status(201).json({
            success: true,
            activity: transformedActivity
        });
    } catch (error) {
        console.error('Error logging activity:', error);
        res.status(500).json({ success: false, error: 'Failed to log activity' });
    }
});

export default router;
