# Run This SQL in Supabase Dashboard

The Management API returned success but the schema may not have been created. You need to run the SQL manually.

## For PRODUCTION

1. Open: https://supabase.com/dashboard/project/dahiedmlyahahprojpbi/sql/new
2. Copy ALL the SQL below
3. Paste and click "Run"

## For STAGING (if needed)

1. Open: https://supabase.com/dashboard/project/mladgojbfyofgauiylxw/sql/new
2. Copy ALL the SQL below
3. Paste and click "Run"

---

## SQL TO COPY:

```sql
-- Create separate schemas for each application
CREATE SCHEMA IF NOT EXISTS integrityhvac;

-- Grant usage on schemas
GRANT USAGE ON SCHEMA integrityhvac TO authenticated;
GRANT USAGE ON SCHEMA integrityhvac TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA integrityhvac TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA integrityhvac TO anon;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA integrityhvac GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA integrityhvac GRANT SELECT ON TABLES TO anon;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS integrityhvac.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON integrityhvac.users(email);

-- STATUSES TABLE
CREATE TABLE IF NOT EXISTS integrityhvac.statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_statuses_order ON integrityhvac.statuses("order");

-- Insert default statuses
INSERT INTO integrityhvac.statuses (id, name, is_default, "order") VALUES
    ('00000000-0000-0000-0000-000000000001', 'New', TRUE, 1),
    ('00000000-0000-0000-0000-000000000002', 'Contacted', TRUE, 2),
    ('00000000-0000-0000-0000-000000000003', 'No answer', TRUE, 3),
    ('00000000-0000-0000-0000-000000000004', 'Phone number not in service', TRUE, 4),
    ('00000000-0000-0000-0000-000000000005', 'Qualified', TRUE, 5),
    ('00000000-0000-0000-0000-000000000006', 'Quoted', TRUE, 6),
    ('00000000-0000-0000-0000-000000000007', 'Cleaning Lead', TRUE, 7),
    ('00000000-0000-0000-0000-000000000008', 'Won', TRUE, 8),
    ('00000000-0000-0000-0000-000000000009', 'Lost', TRUE, 9),
    ('00000000-0000-0000-0000-000000000010', 'Do Not Call', TRUE, 10),
    ('00000000-0000-0000-0000-000000000011', 'Call Back', TRUE, 11)
ON CONFLICT (name) DO NOTHING;

-- LEADS TABLE
CREATE TABLE IF NOT EXISTS integrityhvac.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    priority TEXT CHECK (priority IN ('hot', 'warm', 'cold')),
    notes TEXT,
    assigned_to UUID REFERENCES integrityhvac.users(id) ON DELETE SET NULL,
    callback_date DATE,
    campaign_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON integrityhvac.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON integrityhvac.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON integrityhvac.leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON integrityhvac.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON integrityhvac.leads(campaign_id);

-- ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS integrityhvac.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES integrityhvac.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES integrityhvac.leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('call', 'email', 'note')),
    duration INTEGER,
    notes TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON integrityhvac.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON integrityhvac.activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON integrityhvac.activities(timestamp DESC);

-- AUDIT_TRAILS TABLE
CREATE TABLE IF NOT EXISTS integrityhvac.audit_trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES integrityhvac.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES integrityhvac.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('called', 'updated', 'created')),
    duration INTEGER,
    notes TEXT,
    changes JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_trails_lead_id ON integrityhvac.audit_trails(lead_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_timestamp ON integrityhvac.audit_trails(timestamp DESC);

-- CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS integrityhvac.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_by UUID REFERENCES integrityhvac.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON integrityhvac.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON integrityhvac.campaigns(created_by);

-- CAMPAIGN_USERS TABLE
CREATE TABLE IF NOT EXISTS integrityhvac.campaign_users (
    campaign_id UUID NOT NULL REFERENCES integrityhvac.campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES integrityhvac.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_users_campaign ON integrityhvac.campaign_users(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_users_user ON integrityhvac.campaign_users(user_id);

-- Add foreign key for leads.campaign_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'leads_campaign_id_fkey'
        AND table_schema = 'integrityhvac'
    ) THEN
        ALTER TABLE integrityhvac.leads
        ADD CONSTRAINT leads_campaign_id_fkey
        FOREIGN KEY (campaign_id) REFERENCES integrityhvac.campaigns(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ROLES TABLE
CREATE TABLE IF NOT EXISTS integrityhvac.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO integrityhvac.roles (name, description) VALUES
    ('admin', 'Administrator with full system access'),
    ('staff', 'Staff member with standard access'),
    ('customer', 'Customer account'),
    ('contractor', 'Contractor account'),
    ('consultant', 'Consultant account'),
    ('other', 'Other role type')
ON CONFLICT (name) DO NOTHING;

-- GRANTS
GRANT USAGE ON SCHEMA integrityhvac TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA integrityhvac TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA integrityhvac TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA integrityhvac TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA integrityhvac TO postgres, service_role, authenticated;

-- Insert default admin accounts (Password: Admin123!)
INSERT INTO integrityhvac.users (email, name, role, password_hash) VALUES
    ('admin@integrityhvac.com', 'System Administrator', 'admin', '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'),
    ('admin1@integrityhvac.com', 'Admin User 1', 'admin', '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'),
    ('admin2@integrityhvac.com', 'Admin User 2', 'admin', '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'),
    ('admin3@integrityhvac.com', 'Admin User 3', 'admin', '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- Success message
SELECT 'IntegrityHVAC schema created successfully!' as message;
```

---

## After Running SQL

The schema and admin accounts will be created:

- **admin@integrityhvac.com** (Password: Admin123!)
- **admin1@integrityhvac.com** (Password: Admin123!)
- **admin2@integrityhvac.com** (Password: Admin123!)
- **admin3@integrityhvac.com** (Password: Admin123!)
