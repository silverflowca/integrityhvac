/**
 * Migrate to Production Database
 * Creates admin accounts on production Supabase instance
 */

import { createClient } from '@supabase/supabase-js';

// Production Supabase configuration
const PRODUCTION_URL = 'https://dahiedmlyahahprojpbi.supabase.co';
const PRODUCTION_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaGllZG1seWFoYWhwcm9qcGJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMzAyNywiZXhwIjoyMDgzODc5MDI3fQ.q4nrdJ65pJvT5qyom03Df-f_VMYf_Ck89CowWBW-59w';

const supabase = createClient(PRODUCTION_URL, PRODUCTION_SERVICE_KEY, {
    db: {
        schema: 'integrityhvac'
    }
});

async function testConnection() {
    console.log('🔌 Testing connection to production Supabase...');
    console.log(`📍 URL: ${PRODUCTION_URL}`);

    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (error) {
            console.error('❌ Connection failed:', error.message);
            return false;
        }

        console.log('✅ Connection successful!');
        return true;
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        return false;
    }
}

async function createAdminAccounts() {
    console.log('\n👤 Creating admin accounts on production...');

    const adminAccounts = [
        {
            email: 'admin@integrityhvac.com',
            name: 'System Administrator',
            role: 'admin',
            password_hash: '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'
        },
        {
            email: 'admin1@integrityhvac.com',
            name: 'Admin User 1',
            role: 'admin',
            password_hash: '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'
        },
        {
            email: 'admin2@integrityhvac.com',
            name: 'Admin User 2',
            role: 'admin',
            password_hash: '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'
        },
        {
            email: 'admin3@integrityhvac.com',
            name: 'Admin User 3',
            role: 'admin',
            password_hash: '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'
        }
    ];

    for (const admin of adminAccounts) {
        try {
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('email', admin.email)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from('users')
                    .update({ role: admin.role, name: admin.name })
                    .eq('email', admin.email);

                if (error) throw error;
                console.log(`   ✅ Updated: ${admin.email}`);
            } else {
                const { error } = await supabase
                    .from('users')
                    .insert(admin);

                if (error) throw error;
                console.log(`   ✅ Created: ${admin.email}`);
            }
        } catch (error) {
            console.error(`   ❌ Failed: ${admin.email} - ${error.message}`);
        }
    }
}

async function migrate() {
    console.log('🚀 Migrating to Production Environment');
    console.log('═'.repeat(60));

    const connected = await testConnection();

    if (!connected) {
        console.log('\n❌ Cannot connect to production database.');
        console.log('   The "integrityhvac" schema might not exist yet.');
        console.log('\n📋 To create the schema, run this SQL in Supabase SQL Editor:');
        console.log('   https://supabase.com/dashboard/project/dahiedmlyahahprojpbi/sql\n');
        console.log('   Copy the contents of: STAGING_MIGRATION_COMPLETE.sql');
        process.exit(1);
    }

    await createAdminAccounts();

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Production migration completed!');
    console.log('═'.repeat(60));
    console.log('\n📋 Admin accounts (Password: Admin123!):');
    console.log('   - admin@integrityhvac.com');
    console.log('   - admin1@integrityhvac.com');
    console.log('   - admin2@integrityhvac.com');
    console.log('   - admin3@integrityhvac.com\n');

    process.exit(0);
}

migrate().catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});
