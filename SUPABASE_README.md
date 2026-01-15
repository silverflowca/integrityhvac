# IntegrityHVAC - Supabase Implementation

Complete Supabase implementation for IntegrityHVAC CRM. This setup includes local development with Supabase and production-ready cloud deployment scripts.

---

## What's Been Implemented

### ✅ Database Schema
- **Users table** - Authentication and user management
- **Leads table** - Customer leads with full CRM fields
- **Statuses table** - Customizable lead statuses
- **Activities table** - Call logs, emails, notes
- **Audit Trails table** - Complete change history
- **Helper functions** - Dashboard stats aggregation
- **Indexes** - Optimized for fast queries
- **Triggers** - Automatic timestamp updates

### ✅ Row-Level Security (RLS)
- Users can only view/edit their assigned leads
- Admins can view/edit all leads
- Secure status management
- Activity and audit trail protection

### ✅ Migration Tools
- **Schema migration** - SQL migration file ready to deploy
- **Data migration script** - Automated JSON → Supabase migration
- Preserves all existing data including audit trails
- Maps old timestamp IDs to new UUIDs

### ✅ Development Scripts
- Quick-start commands for local Supabase
- One-command data migration
- Cloud deployment helpers
- Staging and production workflows

---

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Supabase Locally

```bash
npm run supabase:start
```

This starts local Supabase with PostgreSQL, Studio, and all services.

**Important:** Save the keys shown in the output:
- `anon key` - For frontend use
- `service_role key` - For backend use

### 3. Migrate Your Data

```bash
npm run supabase:migrate
```

This migrates all data from `server/data/*.json` files to Supabase.

### 4. Open Supabase Studio

Visit: http://localhost:54323

Verify:
- Tables created ✅
- Data migrated ✅
- RLS policies active ✅

---

## What Needs To Be Done Next

The foundation is complete! Here's what you need to do:

### Option A: Test Locally First (Recommended)

1. **Install Supabase client libraries**
   ```bash
   cd client && npm install @supabase/supabase-js
   cd ../server && npm install @supabase/supabase-js
   ```

2. **Create environment files**

   `client/.env.local`:
   ```env
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_ANON_KEY=your-anon-key-from-step-2
   ```

   `server/.env.local`:
   ```env
   SUPABASE_URL=http://localhost:54321
   SUPABASE_SERVICE_KEY=your-service-role-key-from-step-2
   ```

3. **Update backend to use Supabase** (you'll need to modify):
   - `server/routes/leads.js` - Replace JSON file operations with Supabase queries
   - `server/routes/auth.js` - Use Supabase Auth or keep JWT with Supabase data
   - `server/routes/statuses.js` - Query Supabase instead of JSON
   - `server/routes/dashboard.js` - Use Supabase aggregation functions

4. **Update frontend to use Supabase** (optional for now):
   - Can keep using existing API layer
   - Or add direct Supabase client calls for real-time features

5. **Test everything**
   ```bash
   npm run dev  # Starts both client and server
   ```

### Option B: Deploy to Cloud Immediately

1. **Create Supabase Cloud Project**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Choose Free tier
   - Save credentials

2. **Link and Deploy**
   ```bash
   npx supabase link --project-ref your-project-ref
   npx supabase db push
   ```

3. **Migrate data to cloud**
   ```bash
   # Set environment variables
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_KEY="your-service-role-key"

   # Run migration
   npm run supabase:migrate
   ```

4. **Update environment variables for production**
   - Update `.env.production` files with cloud URLs
   - Deploy your app

---

## Project Structure

```
integrityhvac/
├── supabase/
│   ├── migrations/
│   │   └── 20260113013409_initial_schema.sql  ← Database schema
│   ├── migrate-data.js                         ← Data migration script
│   └── config.toml                             ← Supabase config
├── server/
│   ├── data/                                   ← JSON files (legacy)
│   ├── routes/                                 ← API routes (need updating)
│   └── .env.local                              ← Environment config
├── client/
│   ├── src/
│   │   └── services/api.js                     ← API service (keep as-is)
│   └── .env.local                              ← Environment config
├── package.json                                ← Root scripts
├── SUPABASE_DEPLOYMENT.md                      ← Full deployment guide
└── SUPABASE_README.md                          ← This file
```

---

## Available Scripts

### Supabase Management

```bash
npm run supabase:start       # Start local Supabase
npm run supabase:stop        # Stop local Supabase
npm run supabase:status      # Check Supabase status
npm run supabase:studio      # Open Studio UI
npm run supabase:reset       # Reset database (deletes all data!)
npm run supabase:migrate     # Migrate JSON data to Supabase
```

### Development

```bash
npm run dev                  # Start both client & server
npm run dev:client           # Start client only
npm run dev:server           # Start server only
```

### Database Setup

```bash
npm run db:setup             # Start Supabase + migrate data (all-in-one)
```

### Cloud Deployment

```bash
npm run supabase:link        # Link to cloud project
npm run supabase:push        # Push schema to cloud
```

---

## Database Schema Overview

### Users
```sql
id              UUID PRIMARY KEY
email           TEXT UNIQUE
password_hash   TEXT
name            TEXT
role            TEXT (user|admin)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### Leads
```sql
id              UUID PRIMARY KEY
company         TEXT
name            TEXT
phone           TEXT
email           TEXT
location        TEXT
status          TEXT
priority        TEXT (hot|warm|cold)
notes           TEXT
assigned_to     UUID → users(id)
callback_date   DATE
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### Statuses
```sql
id              UUID PRIMARY KEY
name            TEXT UNIQUE
is_default      BOOLEAN
order           INTEGER
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### Activities
```sql
id              UUID PRIMARY KEY
user_id         UUID → users(id)
lead_id         UUID → leads(id)
type            TEXT (call|email|note)
duration        INTEGER (seconds)
notes           TEXT
timestamp       TIMESTAMPTZ
```

### Audit Trails
```sql
id              UUID PRIMARY KEY
lead_id         UUID → leads(id)
user_id         UUID → users(id)
user_name       TEXT
action          TEXT (called|updated|created)
duration        INTEGER
notes           TEXT
changes         JSONB
timestamp       TIMESTAMPTZ
```

---

## Migration Details

The migration script handles:

1. **ID Mapping**
   - Old timestamp IDs → New UUIDs
   - Maintains all relationships

2. **Data Preservation**
   - All user accounts with password hashes
   - All leads with complete history
   - All activities
   - All audit trail entries (extracted from nested JSON)

3. **Custom Statuses**
   - Default statuses come from schema
   - Custom statuses migrated from JSON

4. **Smart Handling**
   - Skips duplicates
   - Validates relationships
   - Provides detailed progress logs

---

## Environment Variables

### Local Development

**Client** (`.env.local`):
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Server** (`.env.local`):
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=eyJhbGc...
```

### Cloud Production

**Client** (`.env.production`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Server** (`.env.production`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

---

## Security

### Row-Level Security (RLS)

All tables have RLS enabled. Policies ensure:

- ✅ Users can only access their assigned leads
- ✅ Admins can access all data
- ✅ Everyone can read statuses
- ✅ Only admins can modify statuses
- ✅ Users can only create activities for themselves
- ✅ Audit trails are protected

### Authentication

Currently using JWT (existing system). You can:

**Option 1:** Keep JWT + Supabase data
- Store users in Supabase
- Continue using your JWT auth
- Map JWT user ID to Supabase user UUID

**Option 2:** Migrate to Supabase Auth
- Use Supabase's built-in authentication
- Email/password, OAuth, magic links
- Automatic session management

---

## Cost Breakdown

### Free Tier (Current Need)
- **Database:** 500 MB (you need ~100 MB)
- **Bandwidth:** 2 GB/month (you'll use <500 MB)
- **Users:** 50,000 MAU (you have 2-5)
- **Storage:** 1 GB
- **Backups:** 7 days
- **Cost:** $0/month ✅

You're well within free tier limits!

---

## Next Steps Summary

### Immediate (What You Should Do Now)

1. ✅ **Start Supabase locally**
   ```bash
   npm run supabase:start
   ```

2. ✅ **Migrate your data**
   ```bash
   npm run supabase:migrate
   ```

3. ✅ **Verify in Studio**
   - Open http://localhost:54323
   - Check tables and data

### Short-term (This Week)

4. **Update backend to use Supabase**
   - Replace JSON file operations
   - Use Supabase client for queries
   - Keep existing API structure

5. **Test locally**
   - Run existing frontend
   - Verify all features work
   - Check authentication

### Long-term (When Ready)

6. **Create cloud project**
   - Sign up at supabase.com
   - Create staging project
   - Push schema and data

7. **Deploy to production**
   - Create production project
   - Configure DNS/SSL
   - Monitor usage

---

## Helpful Links

- **Supabase Studio (Local):** http://localhost:54323
- **Supabase Docs:** https://supabase.com/docs
- **JavaScript Client:** https://supabase.com/docs/reference/javascript
- **Database Guide:** https://supabase.com/docs/guides/database
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security

---

## Cloud Deployment (Staging & Production)

### Step 1: Create Supabase Cloud Projects

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in or create account

2. **Create Staging Project**
   - Click "New Project"
   - Organization: Choose your org
   - Name: `integrityhvac-staging`
   - Database Password: Generate strong password (save it!)
   - Region: Choose closest to your users (e.g., `us-east-1`)
   - Pricing Plan: Free
   - Click "Create new project"
   - Wait 2-3 minutes for setup

3. **Create Production Project**
   - Repeat above steps
   - Name: `integrityhvac-production`
   - Use different strong password
   - Same region as staging
   - Click "Create new project"

### Step 2: Get Cloud Credentials

For **STAGING** project:
1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL**: `https://abcdefghijk.supabase.co`
   - **service_role key**: (Click "Reveal" in Project API keys section)
3. Keep these safe!

For **PRODUCTION** project:
1. Repeat above steps
2. Copy URL and service_role key
3. Keep separate from staging!

### Step 3: Update Environment Files

**Edit `server/.env.staging`:**
```env
# Staging Supabase Configuration
SUPABASE_URL=https://YOUR-STAGING-PROJECT-REF.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...YOUR-STAGING-KEY

# JWT Secret (generate a strong random string)
JWT_SECRET=your-staging-jwt-secret-here

# Server Configuration
PORT=5000
NODE_ENV=staging
```

**Edit `server/.env.production`:**
```env
# Production Supabase Configuration
SUPABASE_URL=https://YOUR-PRODUCTION-PROJECT-REF.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...YOUR-PRODUCTION-KEY

# JWT Secret (use a different strong secret than staging)
JWT_SECRET=your-production-jwt-secret-here

# Server Configuration
PORT=5000
NODE_ENV=production
```

### Step 4: Deploy Schema to Cloud

**For Staging:**
```bash
# Link to staging project
npx supabase link --project-ref YOUR-STAGING-PROJECT-REF

# Push schema to staging
npx supabase db push

# Verify in dashboard
# Go to: https://supabase.com/dashboard/project/YOUR-STAGING-PROJECT/editor
```

**For Production:**
```bash
# Link to production project
npx supabase link --project-ref YOUR-PRODUCTION-PROJECT-REF

# Push schema to production
npx supabase db push

# Verify in dashboard
```

### Step 5: Migrate Data to Cloud

**Migrate to Staging:**
```bash
# PowerShell (Windows)
$env:SUPABASE_URL="https://YOUR-STAGING-PROJECT.supabase.co"
$env:SUPABASE_SERVICE_KEY="YOUR-STAGING-SERVICE-KEY"
node supabase/migrate-data.js

# Bash (Linux/Mac)
export SUPABASE_URL="https://YOUR-STAGING-PROJECT.supabase.co"
export SUPABASE_SERVICE_KEY="YOUR-STAGING-SERVICE-KEY"
node supabase/migrate-data.js
```

**Migrate to Production:**
```bash
# PowerShell (Windows)
$env:SUPABASE_URL="https://YOUR-PRODUCTION-PROJECT.supabase.co"
$env:SUPABASE_SERVICE_KEY="YOUR-PRODUCTION-SERVICE-KEY"
node supabase/migrate-data.js

# Bash (Linux/Mac)
export SUPABASE_URL="https://YOUR-PRODUCTION-PROJECT.supabase.co"
export SUPABASE_SERVICE_KEY="YOUR-PRODUCTION-SERVICE-KEY"
node supabase/migrate-data.js
```

### Step 6: Test Your Deployments

**Test Staging:**
```bash
# PowerShell (Windows)
$env:NODE_ENV="staging"
cd server
npm start

# Bash (Linux/Mac)
NODE_ENV=staging npm start
```

**Test Production:**
```bash
# PowerShell (Windows)
$env:NODE_ENV="production"
cd server
npm start

# Bash (Linux/Mac)
NODE_ENV=production npm start
```

### Step 7: Deploy Your Application

Now deploy your Node.js backend to your hosting platform:
- **Railway**: Connect GitHub repo, set `NODE_ENV=production`
- **Heroku**: Push code, set environment variables
- **DigitalOcean**: Deploy droplet, configure nginx
- **AWS/Azure**: Deploy to EC2/App Service

Make sure to set environment variables in your hosting platform:
- `NODE_ENV=production`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_KEY=...`
- `JWT_SECRET=...`
- `PORT=5000`

---

## Troubleshooting

### "Supabase not running"
```bash
npm run supabase:start
```

### "Migration failed"
```bash
# Reset and try again
npm run supabase:reset
npm run supabase:migrate
```

### "Can't connect to database"
```bash
# Check status
npm run supabase:status

# View logs
npx supabase logs
```

### "Docker not running"
- Open Docker Desktop
- Wait for it to start
- Run `npm run supabase:start` again

### "Link failed - project not found"
- Verify project ref is correct (from Supabase dashboard URL)
- Check you're logged in: `npx supabase login`
- Try again with full project ref

### "Push failed - connection refused"
- Check internet connection
- Verify project URL is correct
- Ensure project has finished setup in dashboard

---

## Support

Need help? Check:
1. `SUPABASE_DEPLOYMENT.md` - Full deployment guide
2. Supabase Discord - https://discord.supabase.com
3. GitHub Issues - Report bugs

---

**Ready to get started?**

```bash
npm install
npm run db:setup
```

Then open http://localhost:54323 to see your data in Supabase! 🚀
