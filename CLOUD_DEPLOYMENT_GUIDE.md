# IntegrityHVAC - Cloud Deployment Quick Guide

This is a quick reference for deploying your staging and production databases to Supabase cloud.

---

## Prerequisites

- ✅ Local Supabase is working
- ✅ Data migrated locally (2,499 leads)
- ✅ Backend refactored to use Supabase
- ✅ Docker Desktop running
- ✅ Supabase account created

---

## Quick Deploy Checklist

### 1️⃣ Create Cloud Projects (5 minutes)

Go to https://supabase.com/dashboard

**Staging Project:**
- [ ] Click "New Project"
- [ ] Name: `integrityhvac-staging`
- [ ] Generate strong password ➜ **Save it!**
- [ ] Region: `us-east-1` (or closest to you)
- [ ] Plan: Free
- [ ] Wait 2-3 minutes for setup

**Production Project:**
- [ ] Click "New Project"
- [ ] Name: `integrityhvac-production`
- [ ] Generate strong password ➜ **Save it!**
- [ ] Region: Same as staging
- [ ] Plan: Free
- [ ] Wait 2-3 minutes for setup

---

### 2️⃣ Get Your Credentials (2 minutes)

For **each project** (staging and production):

1. Go to **Project Settings** ⚙️ → **API**
2. Copy these values:

```
Project URL: https://[project-ref].supabase.co
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Keep these safe!** You'll need them in the next step.

---

### 3️⃣ Update Environment Files (3 minutes)

**Staging** - Edit `server/.env.staging`:

```env
SUPABASE_URL=https://YOUR-STAGING-REF.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...YOUR-STAGING-KEY
JWT_SECRET=generate-random-32-char-string-for-staging
PORT=5000
NODE_ENV=staging
```

**Production** - Edit `server/.env.production`:

```env
SUPABASE_URL=https://YOUR-PRODUCTION-REF.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...YOUR-PRODUCTION-KEY
JWT_SECRET=generate-random-32-char-string-for-production
PORT=5000
NODE_ENV=production
```

💡 **Tip:** Generate JWT secrets using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 4️⃣ Push Schema to Cloud (2 minutes)

**Staging:**
```bash
# Link to staging
npx supabase link --project-ref YOUR-STAGING-REF

# Push schema
npx supabase db push
```

**Production:**
```bash
# Link to production
npx supabase link --project-ref YOUR-PRODUCTION-REF

# Push schema
npx supabase db push
```

✅ **Verify:** Check tables exist in Supabase dashboard → Table Editor

---

### 5️⃣ Migrate Data to Cloud (5 minutes)

**Staging:**
```powershell
# Windows PowerShell
$env:SUPABASE_URL="https://YOUR-STAGING-REF.supabase.co"
$env:SUPABASE_SERVICE_KEY="YOUR-STAGING-KEY"
node supabase/migrate-data.js
```

**Production:**
```powershell
# Windows PowerShell
$env:SUPABASE_URL="https://YOUR-PRODUCTION-REF.supabase.co"
$env:SUPABASE_SERVICE_KEY="YOUR-PRODUCTION-KEY"
node supabase/migrate-data.js
```

✅ **Verify:** Check dashboard → Table Editor → leads table shows 2,499 records

---

### 6️⃣ Test Connections (3 minutes)

**Test Staging:**
```powershell
$env:NODE_ENV="staging"
cd server
npm start
```

Open browser: http://localhost:5000/api/health

Expected: `{"status":"ok","message":"Integrity HVAC CRM API is running"}`

**Test Production:**
```powershell
$env:NODE_ENV="production"
cd server
npm start
```

Same test at http://localhost:5000/api/health

---

## Current Status

Your environment files are **ready but need credentials**:

📁 **Files to update:**
- `server/.env.staging` ← Needs staging credentials
- `server/.env.production` ← Needs production credentials

📁 **Files already configured:**
- `server/.env.local` ✅ (Local Supabase)
- `server/config/supabase.js` ✅ (Reads from env files)
- `supabase/migrations/` ✅ (Schema ready)
- `supabase/migrate-data.js` ✅ (Migration script ready)

---

## What Happens in Each Environment

### Local Development (`.env.local`)
- **URL:** http://localhost:54321
- **Data:** Your test data on your machine
- **Docker:** Required
- **Purpose:** Development and testing

### Staging (`.env.staging`)
- **URL:** https://staging-project.supabase.co
- **Data:** Copy of production for testing
- **Docker:** Not required
- **Purpose:** Pre-production testing

### Production (`.env.production`)
- **URL:** https://production-project.supabase.co
- **Data:** Real customer data
- **Docker:** Not required
- **Purpose:** Live system

---

## Deployment Workflow

```
┌──────────────┐
│ Local Dev    │  ← Develop features
│ (localhost)  │
└──────┬───────┘
       │ git push
       ▼
┌──────────────┐
│ Staging      │  ← Test in cloud
│ (cloud)      │
└──────┬───────┘
       │ Approve
       ▼
┌──────────────┐
│ Production   │  ← Live system
│ (cloud)      │
└──────────────┘
```

---

## Cost Breakdown

### Free Tier (Perfect for you!)

| Resource | Limit | Your Usage | Status |
|----------|-------|------------|--------|
| Database | 500 MB | ~100 MB | ✅ 20% |
| Bandwidth | 2 GB/month | <500 MB | ✅ 25% |
| Users | 50,000 MAU | 2-5 | ✅ 0.01% |
| API Requests | Unlimited | - | ✅ |
| Storage | 1 GB | ~50 MB | ✅ 5% |

**Both staging AND production fit in free tier!** 🎉

---

## Quick Commands Reference

```bash
# View Supabase projects
npx supabase projects list

# Check current link
npx supabase status

# Switch between projects
npx supabase link --project-ref STAGING-REF
npx supabase link --project-ref PRODUCTION-REF

# View remote database
npx supabase db remote inspect

# Run server in staging mode
$env:NODE_ENV="staging"; npm start

# Run server in production mode
$env:NODE_ENV="production"; npm start
```

---

## Troubleshooting

### "Project not found"
- Check project ref is correct (last part of dashboard URL)
- Login again: `npx supabase login`

### "Migration shows 0 leads migrated"
- Check environment variables are set correctly
- Verify `server/data/leads.json` exists and has data
- Check service_role key (not anon key!)

### "Can't connect to cloud database"
- Check internet connection
- Verify SUPABASE_URL is correct
- Ensure project finished setting up (wait 3 minutes)

### "RLS policy violation"
- You're using service_role key, right? (Not anon key)
- Check key is correct in .env file
- Restart server after changing .env

---

## Next Steps After Cloud Deployment

Once staging and production are set up:

1. **Deploy Backend**
   - Railway, Heroku, or DigitalOcean
   - Set environment variables
   - Connect to staging first, test

2. **Deploy Frontend**
   - Netlify, Vercel, or Cloudflare Pages
   - Update API URL
   - Test thoroughly

3. **Setup CI/CD**
   - Auto-deploy to staging on commit
   - Manual promotion to production
   - Automated tests

4. **Monitoring**
   - Supabase dashboard for database metrics
   - Application logs
   - Error tracking (Sentry)

---

## Support

Need help?

1. Check full guide: `SUPABASE_README.md`
2. Supabase Docs: https://supabase.com/docs
3. Discord: https://discord.supabase.com

---

**Ready to deploy?** Start with Step 1! ⬆️

**Total time:** ~20 minutes for both staging and production
