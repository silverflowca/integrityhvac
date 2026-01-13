import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATUSES_FILE = path.join(DATA_DIR, 'statuses.json');

// Default statuses
const DEFAULT_STATUSES = [
    { id: '1', name: 'New', isDefault: true, order: 1 },
    { id: '2', name: 'Contacted', isDefault: true, order: 2 },
    { id: '3', name: 'No answer', isDefault: true, order: 3 },
    { id: '4', name: 'Phone number not in service', isDefault: true, order: 4 },
    { id: '5', name: 'Qualified', isDefault: true, order: 5 },
    { id: '6', name: 'Quoted', isDefault: true, order: 6 },
    { id: '7', name: 'Cleaning Lead', isDefault: true, order: 7 },
    { id: '8', name: 'Won', isDefault: true, order: 8 },
    { id: '9', name: 'Lost', isDefault: true, order: 9 },
    { id: '10', name: 'Do Not Call', isDefault: true, order: 10 },
    { id: '11', name: 'Call Back', isDefault: true, order: 11 }
];

// Initialize statuses file with defaults if it doesn't exist
if (!fs.existsSync(STATUSES_FILE)) {
    fs.writeFileSync(STATUSES_FILE, JSON.stringify(DEFAULT_STATUSES, null, 2));
}

const readStatuses = () => {
    try {
        const data = fs.readFileSync(STATUSES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading statuses:', error);
        return DEFAULT_STATUSES;
    }
};

const writeStatuses = (statuses) => {
    try {
        fs.writeFileSync(STATUSES_FILE, JSON.stringify(statuses, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing statuses:', error);
        return false;
    }
};

// Get all statuses
router.get('/', (req, res) => {
    try {
        const statuses = readStatuses();
        // Sort by order field
        const sortedStatuses = statuses.sort((a, b) => (a.order || 0) - (b.order || 0));
        res.json({ success: true, statuses: sortedStatuses });
    } catch (error) {
        console.error('Error getting statuses:', error);
        res.status(500).json({ success: false, error: 'Failed to get statuses' });
    }
});

// Add a new status
router.post('/', (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Status name is required' });
        }

        const statuses = readStatuses();

        // Check for duplicate
        if (statuses.some(s => s.name.toLowerCase() === name.trim().toLowerCase())) {
            return res.status(400).json({ success: false, error: 'Status already exists' });
        }

        // Get the max order value
        const maxOrder = statuses.reduce((max, s) => Math.max(max, s.order || 0), 0);

        const newStatus = {
            id: Date.now().toString(),
            name: name.trim(),
            isDefault: false,
            order: maxOrder + 1
        };

        statuses.push(newStatus);
        writeStatuses(statuses);

        res.status(201).json({ success: true, status: newStatus });
    } catch (error) {
        console.error('Error adding status:', error);
        res.status(500).json({ success: false, error: 'Failed to add status' });
    }
});

// Delete a status
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const statuses = readStatuses();

        const statusIndex = statuses.findIndex(s => s.id === id);
        if (statusIndex === -1) {
            return res.status(404).json({ success: false, error: 'Status not found' });
        }

        // Don't allow deleting default statuses
        if (statuses[statusIndex].isDefault) {
            return res.status(400).json({ success: false, error: 'Cannot delete default status' });
        }

        statuses.splice(statusIndex, 1);
        writeStatuses(statuses);

        res.json({ success: true, message: 'Status deleted successfully' });
    } catch (error) {
        console.error('Error deleting status:', error);
        res.status(500).json({ success: false, error: 'Failed to delete status' });
    }
});

// Reset to default statuses
router.post('/reset', (req, res) => {
    try {
        writeStatuses(DEFAULT_STATUSES);
        res.json({ success: true, statuses: DEFAULT_STATUSES });
    } catch (error) {
        console.error('Error resetting statuses:', error);
        res.status(500).json({ success: false, error: 'Failed to reset statuses' });
    }
});

// Update status order
router.put('/reorder', (req, res) => {
    try {
        const { statuses: reorderedStatuses } = req.body;

        if (!reorderedStatuses || !Array.isArray(reorderedStatuses)) {
            return res.status(400).json({ success: false, error: 'Invalid statuses array' });
        }

        // Update order for each status
        const updatedStatuses = reorderedStatuses.map((status, index) => ({
            ...status,
            order: index + 1
        }));

        writeStatuses(updatedStatuses);
        res.json({ success: true, statuses: updatedStatuses });
    } catch (error) {
        console.error('Error reordering statuses:', error);
        res.status(500).json({ success: false, error: 'Failed to reorder statuses' });
    }
});

export default router;
