import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');

// Ensure activities file exists
if (!fs.existsSync(ACTIVITIES_FILE)) {
    fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify([]));
}

const readLeads = () => {
    try {
        const data = fs.readFileSync(LEADS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const readUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const readActivities = () => {
    try {
        const data = fs.readFileSync(ACTIVITIES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeActivities = (activities) => {
    try {
        fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(activities, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing activities:', error);
        return false;
    }
};

const writeLeads = (leads) => {
    try {
        fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing leads:', error);
        return false;
    }
};

// Get admin dashboard stats (team overview)
router.get('/admin', (req, res) => {
    try {
        const leads = readLeads();
        const users = readUsers();
        const activities = readActivities();

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
            const userActivities = activities.filter(a => a.userId === user.id);
            const userCalls = userActivities.filter(a => a.type === 'call').length;
            const userLeads = leads.filter(l => l.assignedTo === user.id);
            const userWonLeads = userLeads.filter(l => l.status === 'won').length;

            return {
                userId: user.id,
                name: user.name,
                totalCalls: userCalls,
                totalLeads: userLeads.length,
                wonLeads: userWonLeads,
                conversionRate: userLeads.length > 0 ? ((userWonLeads / userLeads.length) * 100).toFixed(1) : 0
            };
        });

        // Recent activity timeline (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentActivities = activities
            .filter(a => new Date(a.timestamp) >= sevenDaysAgo)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 20);

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
router.get('/individual', (req, res) => {
    try {
        const userId = req.user.id;
        const leads = readLeads();
        const activities = readActivities();

        // User's leads
        const userLeads = leads.filter(l => l.assignedTo === userId || !l.assignedTo);
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
        const userActivities = activities.filter(a => a.userId === userId);
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
            const dateStr = activity.timestamp.split('T')[0];
            if (activityByDay[dateStr]) {
                activityByDay[dateStr][activity.type + 's'] = (activityByDay[dateStr][activity.type + 's'] || 0) + 1;
            }
        });

        // Goals and progress
        const dailyCallGoal = 20;
        const today = new Date().toISOString().split('T')[0];
        const todayCalls = userActivities.filter(a =>
            a.type === 'call' && a.timestamp.startsWith(today)
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
router.post('/activity', (req, res) => {
    try {
        const { type, leadId, duration, notes } = req.body;
        const userId = req.user.id;

        const activities = readActivities();

        const newActivity = {
            id: Date.now().toString(),
            userId,
            leadId,
            type, // 'call', 'email', 'note'
            duration, // in seconds (for calls)
            notes,
            timestamp: new Date().toISOString()
        };

        activities.push(newActivity);
        writeActivities(activities);

        // If this is a call activity with notes and a leadId, append notes to the lead
        if (type === 'call' && notes && notes.trim() && leadId) {
            const leads = readLeads();
            const leadIndex = leads.findIndex(l => l.id === leadId);

            if (leadIndex !== -1) {
                const timestamp = new Date().toLocaleString();
                const callNote = `[Call - ${timestamp}] ${notes.trim()}`;

                // Append to existing notes or create new notes field
                if (leads[leadIndex].notes && leads[leadIndex].notes.trim()) {
                    leads[leadIndex].notes = leads[leadIndex].notes.trim() + '\n\n' + callNote;
                } else {
                    leads[leadIndex].notes = callNote;
                }

                writeLeads(leads);
                console.log(`Call notes appended to lead ${leadId}`);
            }
        }

        res.status(201).json({
            success: true,
            activity: newActivity
        });
    } catch (error) {
        console.error('Error logging activity:', error);
        res.status(500).json({ success: false, error: 'Failed to log activity' });
    }
});

export default router;
