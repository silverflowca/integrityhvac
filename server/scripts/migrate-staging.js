/**
 * Migrate to Staging Database
 * Applies all integrityhvac migrations to staging Supabase instance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Staging database connection
// Connection string format: postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
const STAGING_CONNECTION = {
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.mladgojbfyofgauiylxw',
    password: process.env.SUPABASE_DB_PASSWORD || 'ENTER_PASSWORD_HERE',
    ssl: {
        rejectUnauthorized: false
    }
};

// Migrations to apply (in order)
const migrations = [
    '20250116000000_create_schemas.sql',
    '20250116000003_integrityhvac_schema.sql',
    '20250119000000_campaigns.sql',
    '20250120000000_create_roles_table.sql',
    '20250120000001_add_default_admin_users.sql'
];

async function runMigration(client, migrationFile) {
    const migrationPath = path.join(__dirname, '../../../supabase/migrations', migrationFile);

    if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Migration file not found: ${migrationFile}`);
        return false;
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`\n📝 Running migration: ${migrationFile}`);
    console.log('─'.repeat(60));

    try {
        // Execute the entire migration file
        await client.query(sql);
        console.log(`✅ Migration completed: ${migrationFile}`);
        return true;
    } catch (error) {
        // Check if error is due to already existing objects (which is okay)
        if (error.message.includes('already exists')) {
            console.log(`⚠️  Some objects already exist (this is okay): ${migrationFile}`);
            return true;
        }

        console.error(`❌ Migration failed: ${migrationFile}`);
        console.error('Error:', error.message);
        return false;
    }
}

async function migrateToStaging() {
    console.log('🚀 Starting migration to staging environment');
    console.log('─'.repeat(60));
    console.log(`📍 Target: ${STAGING_CONNECTION.host}`);
    console.log(`📍 Database: ${STAGING_CONNECTION.database}`);
    console.log(`📋 Migrations to apply: ${migrations.length}`);
    console.log('─'.repeat(60));

    const client = new Client(STAGING_CONNECTION);

    try {
        // Connect to database
        console.log('\n🔌 Connecting to staging database...');
        await client.connect();
        console.log('✅ Connected successfully');

        let successCount = 0;
        let failCount = 0;

        // Run each migration
        for (const migration of migrations) {
            const success = await runMigration(client, migration);
            if (success) {
                successCount++;
            } else {
                failCount++;
                // Don't stop on failure, continue with other migrations
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
            console.log('\n📋 Admin accounts created on staging:');
            console.log('   - admin@integrityhvac.com (Password: Admin123!)');
            console.log('   - admin1@integrityhvac.com (Password: Admin123!)');
            console.log('   - admin2@integrityhvac.com (Password: Admin123!)');
            console.log('   - admin3@integrityhvac.com (Password: Admin123!)');
        } else {
            console.log('\n⚠️  Some migrations had issues. Please check the errors above.');
        }

        return failCount === 0;
    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Make sure you have set SUPABASE_DB_PASSWORD environment variable');
        console.error('2. Check your Supabase project database password');
        console.error('3. Verify network connectivity to Supabase');
        return false;
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the migration
migrateToStaging()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
