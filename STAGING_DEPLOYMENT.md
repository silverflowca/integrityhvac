# Staging Deployment Guide

## Quick Migration Status

✅ **Admin accounts created on staging:**
- admin@integrityhvac.com
- admin1@integrityhvac.com
- admin2@integrityhvac.com
- admin3@integrityhvac.com

**Password for all accounts:** `Admin123!`

---

## Full Schema Migration

### Option 1: Run Combined SQL File (Recommended)

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/mladgojbfyofgauiylxw/sql
2. Open the file: `STAGING_MIGRATION_COMPLETE.sql`
3. Copy all the SQL content
4. Paste into the SQL Editor
5. Click "Run" or press Ctrl+Enter
6. Wait for execution to complete

This will create:
- `integrityhvac` schema
- All tables (users, leads, campaigns, roles, etc.)
- Indexes and constraints
- Default admin accounts
- Sample data (if included)

### Option 2: Run Individual Migrations

Apply migrations in this order:

1. **Create Schemas** (20250116000000_create_schemas.sql)
2. **Integrity HVAC Schema** (20250116000003_integrityhvac_schema.sql)
3. **Campaigns** (20250119000000_campaigns.sql)
4. **Roles Table** (20250120000000_create_roles_table.sql)
5. **Default Admin Users** (20250120000001_add_default_admin_users.sql)

### Option 3: Use Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Set your access token
export SUPABASE_ACCESS_TOKEN=sbp_9338ef63509176e3972e30070068d340bf8b2199

# Link to staging project
cd silverflow
supabase link --project-ref mladgojbfyofgauiylxw

# Push all migrations
supabase db push
```

### Option 4: Use Migration Script

```bash
cd integrityhvac/server
node scripts/migrate-staging-simple.js
```

This script:
- Connects to staging database
- Creates admin accounts
- Provides instructions for schema migration

---

## Environment Configuration

### Server Environment (.env.staging)

The server is configured with these staging credentials:

```env
SUPABASE_URL=https://mladgojbfyofgauiylxw.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=c4472b46c0974013fb3512737292dd85f66d6aa26f383827e20fb06df591c8f4
PORT=5000
NODE_ENV=staging
```

### Client Environment

Update the client `.env` file for staging:

```env
VITE_API_URL=https://your-staging-server.com/api
VITE_SUPABASE_URL=https://mladgojbfyofgauiylxw.supabase.co
VITE_SUPABASE_ANON_KEY=[get from Supabase dashboard]
```

Get the anon key from:
https://supabase.com/dashboard/project/mladgojbfyofgauiylxw/settings/api

---

## Deployment Steps

### 1. Database Migration ✅

- [x] Schema created (via SQL Editor or CLI)
- [x] Admin accounts created
- [x] Default roles inserted

### 2. Deploy Server

```bash
# Build and deploy server to your hosting platform
cd integrityhvac/server
npm install --production
NODE_ENV=staging node server.js
```

Or deploy to:
- **Render**: https://render.com
- **Railway**: https://railway.app
- **Vercel**: https://vercel.com
- **AWS EC2/ECS**: https://aws.amazon.com

### 3. Deploy Client

```bash
# Build client
cd integrityhvac/client
npm install
npm run build

# Deploy dist folder to:
# - Vercel
# - Netlify
# - AWS S3 + CloudFront
# - GitHub Pages
```

---

## Verification Checklist

After deployment, verify:

- [ ] Server is running and accessible
- [ ] Database connection works
- [ ] Admin login works (admin@integrityhvac.com / Admin123!)
- [ ] User Management page loads (admin only)
- [ ] Can create leads
- [ ] Can create campaigns
- [ ] CSV import works
- [ ] Dashboard displays data
- [ ] API endpoints respond correctly

---

## Testing Admin Accounts

1. Navigate to your staging URL
2. Click "Login"
3. Enter credentials:
   - Email: `admin@integrityhvac.com`
   - Password: `Admin123!`
4. Verify admin features:
   - User Management in sidebar
   - Can create users
   - Can manage roles
   - Full system access

---

## Troubleshooting

### Database Connection Issues

1. Check Supabase project status: https://supabase.com/dashboard/project/mladgojbfyofgauiylxw
2. Verify service role key in `.env.staging`
3. Check database URL is correct
4. Ensure no IP restrictions on Supabase project

### Schema Not Found

If you see "schema integrityhvac does not exist":

1. Run `20250116000000_create_schemas.sql` first
2. Then run other migrations

### Admin Accounts Not Working

Re-run the admin creation script:

```bash
cd integrityhvac/server
node scripts/migrate-staging-simple.js
```

Or manually insert via SQL Editor:

```sql
INSERT INTO integrityhvac.users (email, name, role, password_hash)
VALUES (
    'admin@integrityhvac.com',
    'System Administrator',
    'admin',
    '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin';
```

---

## Migration Files

All migration files are located in:
```
silverflow/supabase/migrations/
```

Key files:
- `20250116000000_create_schemas.sql` - Creates integrityhvac schema
- `20250116000003_integrityhvac_schema.sql` - Main database schema
- `20250119000000_campaigns.sql` - Campaigns feature
- `20250120000000_create_roles_table.sql` - Roles management
- `20250120000001_add_default_admin_users.sql` - Admin accounts

Combined file for easy deployment:
- `STAGING_MIGRATION_COMPLETE.sql` - All migrations in one file

---

## Security Notes

⚠️ **Important:**

1. Change default admin password after first login
2. Keep service role key secret
3. Use environment variables, never commit secrets
4. Enable RLS (Row Level Security) policies
5. Set up proper CORS on server
6. Use HTTPS in production

---

## Support

For issues or questions:
1. Check Supabase logs: https://supabase.com/dashboard/project/mladgojbfyofgauiylxw/logs/explorer
2. Review server logs
3. Check browser console for client errors
4. Verify all environment variables are set correctly

---

## Next Steps

1. ✅ Database migrated to staging
2. ✅ Admin accounts created
3. Deploy server to hosting platform
4. Deploy client to CDN/hosting
5. Configure custom domain (optional)
6. Set up monitoring and alerts
7. Load test with sample data
8. Train users on staging environment
