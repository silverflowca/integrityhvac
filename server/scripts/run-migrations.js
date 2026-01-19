/**
 * Run Migrations on Staging and Production Supabase
 * Uses the Supabase Management API to execute SQL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configurations
const ENVIRONMENTS = {
    staging: {
        name: 'Staging',
        projectRef: 'mladgojbfyofgauiylxw',
        url: 'https://mladgojbfyofgauiylxw.supabase.co',
        serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE',
        accessToken: 'sbp_9338ef63509176e3972e30070068d340bf8b2199'
    },
    production: {
        name: 'Production',
        projectRef: 'dahiedmlyahahprojpbi',
        url: 'https://dahiedmlyahahprojpbi.supabase.co',
        serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaGllZG1seWFoYWhwcm9qcGJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMzAyNywiZXhwIjoyMDgzODc5MDI3fQ.q4nrdJ65pJvT5qyom03Df-f_VMYf_Ck89CowWBW-59w',
        accessToken: 'sbp_9338ef63509176e3972e30070068d340bf8b2199'
    }
};

async function runSQL(env, sql) {
    const { projectRef, accessToken, name } = env;

    console.log(`\n🔧 Running SQL on ${name}...`);

    try {
        // Use Supabase Management API to run SQL
        const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error (${response.status}):`, errorText);
            return false;
        }

        const result = await response.json();
        console.log(`✅ SQL executed successfully on ${name}`);
        return true;
    } catch (error) {
        console.error(`❌ Error on ${name}:`, error.message);
        return false;
    }
}

async function runMigrationWithPg(env, sql) {
    const { url, serviceKey, name } = env;

    console.log(`\n🔧 Running migration on ${name} via REST API...`);

    // Split SQL into statements and run them via the REST API
    // This is limited but can work for simple operations

    // For complex migrations, we need to use the postgres connection directly
    // Let's try a different approach - use the Supabase SQL Editor API

    try {
        // Try to create schema first using a simple approach
        const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            },
            body: JSON.stringify({ sql_query: sql })
        });

        if (!response.ok) {
            const errorText = await response.text();
            // This is expected to fail - rpc function doesn't exist
            console.log(`   Note: RPC not available, need to run SQL manually`);
            return false;
        }

        return true;
    } catch (error) {
        console.log(`   Note: ${error.message}`);
        return false;
    }
}

async function migrate() {
    console.log('🚀 IntegrityHVAC Database Migration');
    console.log('═'.repeat(60));

    // Read migration file
    const migrationPath = path.join(__dirname, '../../STAGING_MIGRATION_COMPLETE.sql');

    if (!fs.existsSync(migrationPath)) {
        console.error('❌ Migration file not found:', migrationPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📄 Loaded migration file (${sql.length} chars)`);

    // Try Management API first
    console.log('\n' + '─'.repeat(60));
    console.log('Attempting to run migrations via Supabase Management API...');
    console.log('─'.repeat(60));

    const stagingResult = await runSQL(ENVIRONMENTS.staging, sql);
    const productionResult = await runSQL(ENVIRONMENTS.production, sql);

    if (!stagingResult || !productionResult) {
        console.log('\n' + '═'.repeat(60));
        console.log('⚠️  Management API method failed (may need different permissions)');
        console.log('═'.repeat(60));
        console.log('\n📋 Please run the migration manually:');
        console.log('\n1. STAGING:');
        console.log('   https://supabase.com/dashboard/project/mladgojbfyofgauiylxw/sql');
        console.log('\n2. PRODUCTION:');
        console.log('   https://supabase.com/dashboard/project/dahiedmlyahahprojpbi/sql');
        console.log('\n3. Copy contents from: STAGING_MIGRATION_COMPLETE.sql');
        console.log('4. Paste into SQL Editor and click "Run"');
        console.log('\n' + '═'.repeat(60));
    } else {
        console.log('\n' + '═'.repeat(60));
        console.log('✅ Migrations completed successfully!');
        console.log('═'.repeat(60));
    }

    // Output the SQL for manual copy-paste
    console.log('\n📋 SQL Migration Content (copy this if needed):');
    console.log('─'.repeat(60));
    console.log('\nFile location: STAGING_MIGRATION_COMPLETE.sql');
    console.log('File size:', sql.length, 'characters');
    console.log('\nFirst 500 chars preview:');
    console.log(sql.substring(0, 500) + '...\n');
}

migrate().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
