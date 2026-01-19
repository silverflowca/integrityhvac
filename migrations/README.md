# IntegrityHVAC Database Migrations

## Migration Files

| File | Description |
|------|-------------|
| `001_complete_schema.sql` | Complete database schema with all tables, indexes, triggers, and default data |

## How to Run Migrations

### Option 1: Supabase SQL Editor (Recommended)

1. **Staging**: https://supabase.com/dashboard/project/mladgojbfyofgauiylxw/sql/new
2. **Production**: https://supabase.com/dashboard/project/dahiedmlyahahprojpbi/sql/new

Copy the contents of the migration file and paste into the SQL Editor, then click "Run".

### Option 2: Supabase CLI

```bash
# Link to project
npx supabase link --project-ref <project-ref>

# Push migrations
npx supabase db push
```

## Schema Overview

### Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with roles (admin, staff, customer, etc.) |
| `roles` | Available role definitions |
| `statuses` | Lead status options |
| `campaigns` | Marketing campaigns |
| `campaign_users` | Users assigned to campaigns |
| `leads` | Customer leads |
| `activities` | User activities (calls, emails, notes) |
| `audit_trails` | Audit log for lead changes |

### Default Data

**Admin Accounts** (Password: `Admin123!`):
- admin@integrityhvac.com
- admin1@integrityhvac.com
- admin2@integrityhvac.com
- admin3@integrityhvac.com

**Default Roles**:
- admin, staff, customer, contractor, consultant, other

**Default Statuses**:
- New, Contacted, No answer, Phone number not in service, Qualified, Quoted, Cleaning Lead, Won, Lost, Do Not Call, Call Back

## Environment Configuration

### Server (.env.staging / .env.production)

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
JWT_SECRET=<jwt-secret>
NODE_ENV=staging|production
PORT=5000
```

### Client (.env.staging / .env.production)

```env
VITE_API_URL=/api
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-key>
```

## Supabase Projects

| Environment | Project Ref | Dashboard |
|-------------|-------------|-----------|
| Staging | mladgojbfyofgauiylxw | [Link](https://supabase.com/dashboard/project/mladgojbfyofgauiylxw) |
| Production | dahiedmlyahahprojpbi | [Link](https://supabase.com/dashboard/project/dahiedmlyahahprojpbi) |

## Important Notes

1. **Schema Exposure**: The migration includes `ALTER ROLE` commands to expose the `integrityhvac` schema to the API
2. **Idempotent**: All migrations use `IF NOT EXISTS` and `ON CONFLICT` to be safely re-runnable
3. **Triggers**: Auto-update `updated_at` columns on all tables
4. **Indexes**: Optimized for common queries (status, priority, assignment, timestamps)
