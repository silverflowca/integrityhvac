/**
 * Script to create admin users in Supabase Auth
 * Run with: node scripts/create-auth-users.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.production') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const adminUsers = [
    { email: 'admin@integrityhvac.com', password: 'Admin123!', name: 'System Administrator' },
    { email: 'admin1@integrityhvac.com', password: 'Admin123!', name: 'Admin User 1' },
    { email: 'admin2@integrityhvac.com', password: 'Admin123!', name: 'Admin User 2' },
    { email: 'admin3@integrityhvac.com', password: 'Admin123!', name: 'Admin User 3' }
];

async function createAuthUsers() {
    console.log('Creating admin users in Supabase Auth...\n');
    console.log(`Supabase URL: ${SUPABASE_URL}\n`);

    for (const user of adminUsers) {
        try {
            // Use admin API to create user
            const { data, error } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                    name: user.name
                }
            });

            if (error) {
                if (error.message.includes('already been registered')) {
                    console.log(`⚠️  ${user.email} - Already exists`);
                } else {
                    console.error(`❌ ${user.email} - Error: ${error.message}`);
                }
            } else {
                console.log(`✅ ${user.email} - Created successfully (ID: ${data.user.id})`);

                // Update the integrityhvac.users table to link the auth user
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ id: data.user.id })
                    .eq('email', user.email);

                if (updateError && !updateError.message.includes('Invalid schema')) {
                    console.log(`   ⚠️  Could not update users table: ${updateError.message}`);
                }
            }
        } catch (err) {
            console.error(`❌ ${user.email} - Exception: ${err.message}`);
        }
    }

    console.log('\n✅ Done!');
    console.log('\nAdmin credentials:');
    console.log('  Email: admin@integrityhvac.com (or admin1/2/3)');
    console.log('  Password: Admin123!');
}

createAuthUsers();
