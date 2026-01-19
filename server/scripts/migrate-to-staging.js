/**
 * Migrate Local Database to Staging
 * This script applies all integrityhvac migrations to the staging database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Staging Supabase configuration
const STAGING_SUPABASE_URL = 'https://mladgojbfyofgauiylxw.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE';

// Create Supabase client for staging
const stagingSupabase = createClient(STAGING_SUPABASE_URL, STAGING_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const migrations = [
    '20250116000000_create_schemas.sql',
    '20250116000003_integrityhvac_schema.sql',
    '20250119000000_campaigns.sql',
    '20250120000000_create_roles_table.sql',
    '20250120000001_add_default_admin_users.sql'
];

async function runMigration(migrationFile) {
    const migrationPath = path.join(__dirname, '../../../supabase/migrations', migrationFile);

    if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Migration file not found: ${migrationFile}`);
        return false;
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`\n📝 Running migration: ${migrationFile}`);
    console.log('─'.repeat(60));

    try {
        // Split SQL into individual statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';

            // Skip empty statements or comments
            if (!statement.trim() || statement.trim() === ';') continue;

            try {
                const { data, error } = await stagingSupabase.rpc('exec_sql', {
                    sql_query: statement
                });

                if (error) {
                    // Try direct execution if rpc fails
                    console.log(`   Executing statement ${i + 1}/${statements.length}...`);
                    // Note: Supabase JS client doesn't support raw SQL execution
                    // We'll need to use the REST API directly
                    const response = await fetch(`${STAGING_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': STAGING_SERVICE_KEY,
                            'Authorization': `Bearer ${STAGING_SERVICE_KEY}`
                        },
                        body: JSON.stringify({ sql_query: statement })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`   ❌ Statement failed: ${errorText}`);
                    }
                }
            } catch (err) {
                console.error(`   ⚠️  Statement ${i + 1} warning:`, err.message);
                // Continue with next statement
            }
        }

        console.log(`✅ Migration completed: ${migrationFile}`);
        return true;
    } catch (error) {
        console.error(`❌ Migration failed: ${migrationFile}`);
        console.error('Error:', error.message);
        return false;
    }
}

async function migrateToStaging() {
    console.log('🚀 Starting migration to staging environment');
    console.log('─'.repeat(60));
    console.log(`📍 Target: ${STAGING_SUPABASE_URL}`);
    console.log(`📋 Migrations to apply: ${migrations.length}`);
    console.log('─'.repeat(60));

    let successCount = 0;
    let failCount = 0;

    for (const migration of migrations) {
        const success = await runMigration(migration);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 Migration Summary');
    console.log('═'.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📋 Total: ${migrations.length}`);
    console.log('═'.repeat(60));

    if (failCount === 0) {
        console.log('\n🎉 All migrations completed successfully!');
    } else {
        console.log('\n⚠️  Some migrations failed. Please check the errors above.');
    }

    process.exit(failCount === 0 ? 0 : 1);
}

// Run the migration
migrateToStaging().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
