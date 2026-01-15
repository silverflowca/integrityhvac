/**
 * IntegrityHVAC Data Migration Script
 * Migrates data from JSON files to Supabase database
 *
 * Usage:
 *   node supabase/migrate-data.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
// For local development, use default local Supabase URL
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Initialize Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Data file paths
const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');
const STATUSES_FILE = path.join(DATA_DIR, 'statuses.json');

/**
 * Read JSON file
 */
function readJSONFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Migrate users from JSON to Supabase
 */
async function migrateUsers() {
  console.log('\n📦 Migrating users...');
  const users = readJSONFile(USERS_FILE);

  if (users.length === 0) {
    console.log('⚠️  No users to migrate');
    return new Map(); // Return empty map for ID mapping
  }

  const userIdMap = new Map(); // Map old ID to new UUID

  for (const user of users) {
    try {
      // Insert user with new UUID
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: user.email,
          password_hash: user.password_hash, // Already hashed from JSON
          name: user.name,
          role: user.role || 'user',
          created_at: user.created_at
        })
        .select()
        .single();

      if (error) throw error;

      // Map old ID to new UUID
      userIdMap.set(user.id, data.id);
      console.log(`✅ Migrated user: ${user.email} (${user.id} → ${data.id})`);
    } catch (error) {
      console.error(`❌ Failed to migrate user ${user.email}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${userIdMap.size}/${users.length} users`);
  return userIdMap;
}

/**
 * Migrate statuses from JSON to Supabase (custom statuses only)
 */
async function migrateStatuses() {
  console.log('\n📦 Migrating custom statuses...');
  const statuses = readJSONFile(STATUSES_FILE);

  if (statuses.length === 0) {
    console.log('⚠️  No statuses to migrate');
    return;
  }

  // Only migrate custom statuses (isDefault: false)
  const customStatuses = statuses.filter(s => !s.isDefault);

  if (customStatuses.length === 0) {
    console.log('✅ No custom statuses to migrate (defaults already in schema)');
    return;
  }

  let migratedCount = 0;

  for (const status of customStatuses) {
    try {
      const { error } = await supabase
        .from('statuses')
        .insert({
          name: status.name,
          is_default: false,
          order: status.order || 999
        });

      if (error) {
        if (error.code === '23505') {
          console.log(`⚠️  Status '${status.name}' already exists, skipping`);
        } else {
          throw error;
        }
      } else {
        console.log(`✅ Migrated status: ${status.name}`);
        migratedCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to migrate status ${status.name}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${migratedCount}/${customStatuses.length} custom statuses`);
}

/**
 * Migrate leads from JSON to Supabase
 */
async function migrateLeads(userIdMap) {
  console.log('\n📦 Migrating leads...');
  const leads = readJSONFile(LEADS_FILE);

  if (leads.length === 0) {
    console.log('⚠️  No leads to migrate');
    return new Map();
  }

  const leadIdMap = new Map(); // Map old ID to new UUID
  let migratedCount = 0;

  for (const lead of leads) {
    try {
      // Map assigned_to to new user UUID
      const assignedTo = lead.assignedTo ? userIdMap.get(lead.assignedTo) : null;

      // Insert lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert({
          company: lead.company || null,
          name: lead.name,
          phone: lead.phone,
          email: lead.email || null,
          location: lead.location || null,
          status: lead.status || 'new',
          priority: lead.priority || null,
          notes: lead.notes || null,
          assigned_to: assignedTo,
          callback_date: lead.callbackDate || null,
          created_at: lead.createdAt,
          updated_at: lead.updatedAt || lead.createdAt
        })
        .select()
        .single();

      if (leadError) throw leadError;

      leadIdMap.set(lead.id, leadData.id);

      // Migrate audit trail for this lead
      if (lead.auditTrail && Array.isArray(lead.auditTrail)) {
        for (const audit of lead.auditTrail) {
          try {
            const auditUserId = audit.userId ? userIdMap.get(audit.userId) : null;

            await supabase
              .from('audit_trails')
              .insert({
                lead_id: leadData.id,
                user_id: auditUserId,
                user_name: audit.userName || 'Unknown',
                action: audit.action,
                duration: audit.duration || null,
                notes: audit.notes || null,
                changes: audit.changes ? JSON.stringify(audit.changes) : null,
                timestamp: audit.timestamp
              });
          } catch (auditError) {
            console.error(`⚠️  Failed to migrate audit trail entry:`, auditError.message);
          }
        }
      }

      migratedCount++;
      if (migratedCount % 50 === 0) {
        console.log(`✅ Migrated ${migratedCount}/${leads.length} leads...`);
      }
    } catch (error) {
      console.error(`❌ Failed to migrate lead ${lead.id} (${lead.name}):`, error.message);
    }
  }

  console.log(`✅ Migrated ${migratedCount}/${leads.length} leads`);
  return leadIdMap;
}

/**
 * Migrate activities from JSON to Supabase
 */
async function migrateActivities(userIdMap, leadIdMap) {
  console.log('\n📦 Migrating activities...');
  const activities = readJSONFile(ACTIVITIES_FILE);

  if (activities.length === 0) {
    console.log('⚠️  No activities to migrate');
    return;
  }

  let migratedCount = 0;

  for (const activity of activities) {
    try {
      const userId = userIdMap.get(activity.userId);
      const leadId = leadIdMap.get(activity.leadId);

      if (!userId || !leadId) {
        console.log(`⚠️  Skipping activity ${activity.id} (missing user or lead reference)`);
        continue;
      }

      const { error } = await supabase
        .from('activities')
        .insert({
          user_id: userId,
          lead_id: leadId,
          type: activity.type,
          duration: activity.duration || null,
          notes: activity.notes || null,
          timestamp: activity.timestamp
        });

      if (error) throw error;

      migratedCount++;
    } catch (error) {
      console.error(`❌ Failed to migrate activity ${activity.id}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${migratedCount}/${activities.length} activities`);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting IntegrityHVAC data migration to Supabase...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📂 Data directory: ${DATA_DIR}\n`);

  try {
    // Test connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('❌ Failed to connect to Supabase:', error.message);
      console.log('\n💡 Make sure Supabase is running locally:');
      console.log('   npx supabase start\n');
      process.exit(1);
    }

    console.log('✅ Connected to Supabase successfully\n');

    // Run migrations in order
    const userIdMap = await migrateUsers();
    await migrateStatuses();
    const leadIdMap = await migrateLeads(userIdMap);
    await migrateActivities(userIdMap, leadIdMap);

    console.log('\n✅ Migration completed successfully! 🎉\n');
    console.log('Next steps:');
    console.log('1. Verify data in Supabase Studio: http://localhost:54323');
    console.log('2. Update backend to use Supabase client');
    console.log('3. Test the application\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
