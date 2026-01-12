import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import statusRoutes from './routes/statuses.js';
import userRoutes from './routes/users.js';
import { authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8677;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve static files from React build (for production)
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
}

// Data storage (using JSON file for simplicity - can be replaced with a database)
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize leads file if it doesn't exist
if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([]));
}

// Helper functions for data management
const readLeads = () => {
    try {
        const data = fs.readFileSync(LEADS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading leads:', error);
        return [];
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

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Dashboard routes (protected)
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Status routes (protected)
app.use('/api/statuses', authenticateToken, statusRoutes);

// User routes (protected)
app.use('/api/users', authenticateToken, userRoutes);

// Health check (public)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Integrity HVAC CRM API is running' });
});

// Protected routes - all leads endpoints require authentication
// Get all leads
app.get('/api/leads', authenticateToken, (req, res) => {
    try {
        const leads = readLeads();
        res.json({ success: true, leads });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get lead by ID
app.get('/api/leads/:id', authenticateToken, (req, res) => {
    try {
        const leads = readLeads();
        const lead = leads.find(l => l.id === req.params.id);

        if (lead) {
            res.json({ success: true, lead });
        } else {
            res.status(404).json({ success: false, error: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new lead
app.post('/api/leads', authenticateToken, (req, res) => {
    try {
        const leads = readLeads();
        const newLead = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        leads.push(newLead);

        if (writeLeads(leads)) {
            res.status(201).json({ success: true, lead: newLead });
        } else {
            res.status(500).json({ success: false, error: 'Failed to save lead' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update lead
app.put('/api/leads/:id', authenticateToken, (req, res) => {
    try {
        const leads = readLeads();
        const index = leads.findIndex(l => l.id === req.params.id);

        if (index !== -1) {
            const oldLead = leads[index];
            const newData = req.body;

            // Initialize audit trail if it doesn't exist
            if (!oldLead.auditTrail) {
                oldLead.auditTrail = [];
            }

            // Track changes
            const changes = [];
            const fieldsToTrack = ['status', 'priority', 'assignedTo', 'company', 'name', 'phone', 'email', 'location', 'callbackDate'];

            fieldsToTrack.forEach(field => {
                if (newData[field] !== undefined && newData[field] !== oldLead[field]) {
                    changes.push({
                        field,
                        oldValue: oldLead[field] || '',
                        newValue: newData[field] || ''
                    });
                }
            });

            // Add audit entry if there are changes
            if (changes.length > 0) {
                oldLead.auditTrail.push({
                    timestamp: new Date().toISOString(),
                    userId: req.user.id,
                    userName: req.user.name || req.user.email,
                    action: 'updated',
                    changes
                });
            }

            leads[index] = {
                ...oldLead,
                ...newData,
                updatedAt: new Date().toISOString()
            };

            if (writeLeads(leads)) {
                res.json({ success: true, lead: leads[index] });
            } else {
                res.status(500).json({ success: false, error: 'Failed to update lead' });
            }
        } else {
            res.status(404).json({ success: false, error: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete lead
app.delete('/api/leads/:id', authenticateToken, (req, res) => {
    try {
        const leads = readLeads();
        const filteredLeads = leads.filter(l => l.id !== req.params.id);

        if (filteredLeads.length < leads.length) {
            if (writeLeads(filteredLeads)) {
                res.json({ success: true, message: 'Lead deleted successfully' });
            } else {
                res.status(500).json({ success: false, error: 'Failed to delete lead' });
            }
        } else {
            res.status(404).json({ success: false, error: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get leads by status
app.get('/api/leads/status/:status', authenticateToken, (req, res) => {
    try {
        const leads = readLeads();
        const filteredLeads = leads.filter(l => l.status === req.params.status);
        res.json({ success: true, leads: filteredLeads });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get statistics
app.get('/api/stats', authenticateToken, (req, res) => {
    try {
        const leads = readLeads();

        const stats = {
            total: leads.length,
            byStatus: {
                new: leads.filter(l => l.status === 'new').length,
                contacted: leads.filter(l => l.status === 'contacted').length,
                qualified: leads.filter(l => l.status === 'qualified').length,
                quoted: leads.filter(l => l.status === 'quoted').length,
                won: leads.filter(l => l.status === 'won').length,
                lost: leads.filter(l => l.status === 'lost').length
            },
            byPriority: {
                hot: leads.filter(l => l.priority === 'hot').length,
                warm: leads.filter(l => l.priority === 'warm').length,
                cold: leads.filter(l => l.priority === 'cold').length
            }
        };

        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Catch-all handler: serve index.html for any route not matched above
// This enables client-side routing in React
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ error: 'Application not built. Run npm run build in client folder.' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`\n✓ Integrity HVAC CRM API Server running on http://localhost:${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
    console.log(`✓ Leads API: http://localhost:${PORT}/api/leads\n`);
});
