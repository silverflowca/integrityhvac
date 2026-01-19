/**
 * Create Default Admin Users
 * Run this script to add default admin accounts to the database
 */

// Load environment variables FIRST
import '../config/env.js';

import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';

const ADMIN_PASSWORD_HASH = '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'; // Admin123!

const adminAccounts = [
    {
        email: 'admin@integrityhvac.com',
        name: 'System Administrator',
        role: 'admin',
        password_hash: ADMIN_PASSWORD_HASH
    },
    {
        email: 'admin1@integrityhvac.com',
        name: 'Admin User 1',
        role: 'admin',
        password_hash: ADMIN_PASSWORD_HASH
    },
    {
        email: 'admin2@integrityhvac.com',
        name: 'Admin User 2',
        role: 'admin',
        password_hash: ADMIN_PASSWORD_HASH
    },
    {
        email: 'admin3@integrityhvac.com',
        name: 'Admin User 3',
        role: 'admin',
        password_hash: ADMIN_PASSWORD_HASH
    }
];

async function createAdminUsers() {
    console.log('🔧 Creating default admin users...\n');

    for (const admin of adminAccounts) {
        try {
            // Check if user already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id, email, role')
                .eq('email', admin.email)
                .single();

            if (existingUser) {
                // Update existing user to admin
                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        role: admin.role,
                        name: admin.name
                    })
                    .eq('email', admin.email);

                if (updateError) throw updateError;
                console.log(`✅ Updated existing user: ${admin.email}`);
            } else {
                // Create new admin user
                const { error: insertError } = await supabase
                    .from('users')
                    .insert({
                        email: admin.email,
                        name: admin.name,
                        role: admin.role,
                        password_hash: admin.password_hash
                    });

                if (insertError) throw insertError;
                console.log(`✅ Created new admin user: ${admin.email}`);
            }
        } catch (error) {
            console.error(`❌ Error with ${admin.email}:`, error.message);
        }
    }

    console.log('\n📋 Admin Accounts Summary:');
    console.log('================================');
    adminAccounts.forEach(admin => {
        console.log(`  Email: ${admin.email}`);
        console.log(`  Name: ${admin.name}`);
    });
    console.log('\n  Default Password: Admin123!');
    console.log('================================\n');

    process.exit(0);
}

createAdminUsers();
