# IntegrityHVAC - Supabase Deployment Guide

Complete guide for deploying IntegrityHVAC CRM to Supabase (local development → cloud production).

---

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Cloud Deployment](#cloud-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Data Migration](#data-migration)
5. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ installed
- Supabase CLI (already installed as dev dependency)

### Step 1: Start Local Supabase

```bash
cd integrityhvac
npx supabase start
```

**Expected Output:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:** Save the `anon key` and `service_role key` for later use.

### Step 2: Apply Database Migrations

The initial schema will be applied automatically when you start Supabase. To manually apply:

```bash
npx supabase db reset
```

This creates:
- `users` table
- `leads` table
- `statuses` table
- `activities` table
- `audit_trails` table
- RLS policies
- Helper functions

### Step 3: Migrate Existing Data

Install migration dependencies:

```bash
npm install @supabase/supabase-js
```

Run the migration script:

```bash
node supabase/migrate-data.js
```

This will:
- Migrate users from `server/data/users.json`
- Migrate leads from `server/data/leads.json`
- Migrate activities from `server/data/activities.json`
- Migrate custom statuses from `server/data/statuses.json`
- Preserve audit trails

### Step 4: Verify Local Setup

Open Supabase Studio: http://localhost:54323

**Check:**
- ✅ Tables created
- ✅ Data migrated
- ✅ RLS policies enabled

---

## Cloud Deployment

### Step 1: Create Supabase Cloud Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in details:
   - **Name:** integrityhvac-staging (or integrityhvac-production)
   - **Database Password:** (Generate strong password - SAVE IT!)
   - **Region:** Choose closest to your users
   - **Plan:** Free tier (upgrade to Pro when needed)
4. Click "Create new project"
5. Wait 2-3 minutes for provisioning

### Step 2: Get Project Credentials

Once project is ready, go to **Settings → API**:

Copy these values:
- **Project URL:** `https://xxxxxxxxxxxxx.supabase.co`
- **anon public key:** `eyJhbGc...`
- **service_role key:** `eyJhbGc...` (keep secret!)

### Step 3: Link Local Project to Cloud

```bash
npx supabase link --project-ref xxxxxxxxxxxxx
```

Enter your database password when prompted.

### Step 4: Push Migrations to Cloud

```bash
npx supabase db push
```

This applies all migrations from `supabase/migrations/` to your cloud database.

**Verify:** Check Supabase Studio (cloud) to ensure tables are created.

### Step 5: Migrate Data to Cloud

Update environment variables:

```bash
# Windows (PowerShell)
$env:SUPABASE_URL="https://xxxxxxxxxxxxx.supabase.co"
$env:SUPABASE_SERVICE_KEY="your-service-role-key"

# macOS/Linux
export SUPABASE_URL="https://xxxxxxxxxxxxx.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"
```

Run migration:

```bash
node supabase/migrate-data.js
```

---

## Environment Configuration

### Local Development (.env.local)

Create `client/.env.local`:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Create `server/.env.local`:

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Staging Environment (.env.staging)

Create `client/.env.staging`:

```env
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
```

Create `server/.env.staging`:

```env
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_SERVICE_KEY=your-staging-service-role-key
```

### Production Environment (.env.production)

Create `client/.env.production`:

```env
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

Create `server/.env.production`:

```env
SUPABASE_URL=https://your-production-project.supabase.co
SUPABASE_SERVICE_KEY=your-production-service-role-key
```

---

## Data Migration

### Full Migration Script

The migration script (`supabase/migrate-data.js`) handles:

1. **Users Migration**
   - Preserves password hashes
   - Maps old timestamp IDs to new UUIDs
   - Maintains roles

2. **Leads Migration**
   - Transfers all lead data
   - Re-links to new user UUIDs
   - Preserves creation/update timestamps

3. **Audit Trails Migration**
   - Extracts nested auditTrail from leads.json
   - Creates separate audit_trails entries
   - Maintains complete history

4. **Activities Migration**
   - Transfers call/email/note records
   - Links to new user and lead UUIDs

5. **Custom Statuses Migration**
   - Only migrates non-default statuses
   - Default statuses come from schema

### Selective Migration

To migrate specific data only, comment out functions in `migrate()`:

```javascript
async function migrate() {
  // const userIdMap = await migrateUsers();
  // await migrateStatuses();
  const leadIdMap = await migrateLeads(userIdMap); // Only migrate leads
  // await migrateActivities(userIdMap, leadIdMap);
}
```

---

## Troubleshooting

### Issue: "Failed to connect to Supabase"

**Solution:**
```bash
# Check if Supabase is running
npx supabase status

# Start if not running
npx supabase start
```

### Issue: "Migration already applied"

**Solution:**
```bash
# Reset local database
npx supabase db reset

# Re-apply migrations
npx supabase db push
```

### Issue: "RLS policy prevents access"

**Solution:**
The migration script uses `service_role` key which bypasses RLS. Make sure you're using the correct key.

### Issue: "Duplicate key error during migration"

**Solution:**
Data already exists. Either:
1. Reset database: `npx supabase db reset`
2. Or skip existing records (script will warn but continue)

### Issue: "Cannot find module '@supabase/supabase-js'"

**Solution:**
```bash
npm install @supabase/supabase-js
```

---

## Quick Reference Commands

```bash
# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop

# View Supabase status
npx supabase status

# Reset local database (WARNING: deletes all data)
npx supabase db reset

# Create new migration
npx supabase migration new migration_name

# Apply migrations locally
npx supabase db push

# Link to cloud project
npx supabase link --project-ref your-project-ref

# Push migrations to cloud
npx supabase db push

# Pull latest schema from cloud
npx supabase db pull

# Open Studio
# Local: http://localhost:54323
# Cloud: https://supabase.com/dashboard/project/your-project-ref
```

---

## Post-Deployment Checklist

### After Local Setup
- [ ] Supabase running (`npx supabase start`)
- [ ] Migrations applied (tables created)
- [ ] Data migrated successfully
- [ ] Can view data in Studio
- [ ] Backend connects to Supabase
- [ ] Frontend connects to Supabase
- [ ] Authentication works
- [ ] RLS policies tested

### After Cloud Deployment
- [ ] Cloud project created
- [ ] Migrations pushed to cloud
- [ ] Data migrated to cloud
- [ ] Environment variables updated
- [ ] DNS configured (if custom domain)
- [ ] SSL enabled
- [ ] Backups enabled (automatic on Free tier)
- [ ] Monitor usage in dashboard

---

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **CLI Reference:** https://supabase.com/docs/reference/cli
- **Discord:** https://discord.supabase.com
- **Status Page:** https://status.supabase.com

---

## Cost Estimates

### Free Tier (Perfect for starting)
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth/month
- 50,000 monthly active users
- 7-day backups
- **Cost: $0/month**

### Pro Tier (When you scale)
- 8 GB database
- 100 GB file storage
- 50 GB bandwidth/month
- 100,000 monthly active users
- Point-in-time recovery
- **Cost: $25/month**

### Your Estimated Usage (300-500 leads, 2-5 users)
- Database: ~50-100 MB
- Bandwidth: <500 MB/month
- **Recommended: Free Tier** ✅

---

## Next Steps

1. **Local Development:**
   ```bash
   npx supabase start
   node supabase/migrate-data.js
   npm run dev
   ```

2. **Deploy to Staging:**
   - Create Supabase project
   - Push migrations
   - Migrate data
   - Test thoroughly

3. **Deploy to Production:**
   - Create production project
   - Push migrations
   - Migrate data
   - Configure DNS
   - Monitor usage

---

**Need help?** Check the troubleshooting section or reach out to Supabase support.
