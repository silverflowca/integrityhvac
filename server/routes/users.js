import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const readUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        const users = JSON.parse(data);
        // Remove password_hash from the response for security
        return users.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            created_at: user.created_at
        }));
    } catch (error) {
        console.error('Error reading users:', error);
        return [];
    }
};

// Get all users (without password hashes)
router.get('/', (req, res) => {
    try {
        const users = readUsers();
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ success: false, error: 'Failed to get users' });
    }
});

export default router;
