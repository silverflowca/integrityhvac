// IMPORTANT: Load environment variables FIRST before any other imports
import './config/env.js';

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import statusRoutes from './routes/statuses.js';
import userRoutes from './routes/users.js';
import leadsRoutes from './routes/leads.js';
import supabase from './config/supabase.js';
import { authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Leads routes (protected)
app.use('/api/leads', authenticateToken, leadsRoutes);

// Health check (public)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Integrity HVAC CRM API is running' });
});

// Get statistics (using Supabase)
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const { data: leads, error } = await supabase
            .from('leads')
            .select('status, priority');

        if (error) throw error;

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
        console.error('Error getting stats:', error);
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
