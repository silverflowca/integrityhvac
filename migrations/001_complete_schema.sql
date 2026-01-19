-- ============================================================================
-- IntegrityHVAC Complete Database Migration
-- Version: 1.0.0
-- Run this on: STAGING and PRODUCTION Supabase instances
-- ============================================================================
--
-- !! IMPORTANT - MANUAL STEP REQUIRED !!
-- After running this SQL, you MUST expose the schema in the Supabase Dashboard:
--
-- 1. Go to: Supabase Dashboard > Settings > API
-- 2. Find "Exposed schemas" section
-- 3. Add "integrityhvac" to the list
-- 4. Click Save
--
-- The ALTER ROLE commands below set default search paths but do NOT expose
-- the schema to the PostgREST API. That must be done in the dashboard.
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE SCHEMA
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS integrityhvac;

-- ============================================================================
-- STEP 2: SET SEARCH PATHS (Note: This does NOT expose schema to API)
-- ============================================================================
-- These commands set the default search path for database sessions
-- but do NOT expose the schema to the Supabase REST API.
-- You must ALSO add 'integrityhvac' to exposed schemas in the Dashboard.
ALTER ROLE anon SET search_path TO public, integrityhvac;
ALTER ROLE authenticated SET search_path TO public, integrityhvac;
ALTER ROLE service_role SET search_path TO public, integrityhvac;

-- ============================================================================
-- STEP 3: GRANT PERMISSIONS ON SCHEMA
-- ============================================================================
GRANT USAGE ON SCHEMA integrityhvac TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA integrityhvac TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA integrityhvac TO anon;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA integrityhvac GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA integrityhvac GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA integrityhvac GRANT ALL ON SEQUENCES TO authenticated;

-- ============================================================================
-- STEP 4: ENABLE EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 5: CREATE TABLES
-- ============================================================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS integrityhvac.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'staff', 'customer', 'contractor', 'consultant', 'other')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON integrityhvac.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON integrityhvac.users(role);

-- ROLES TABLE
CREATE TABLE IF NOT EXISTS integrityhvac.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON integrityhvac.campaigns(created_at DESC);

-- CAMPAIGN_USERS TABLE (Junction table for user assignments)
CREATE TABLE IF NOT EXISTS integrityhvac.campaign_users (
    campaign_id UUID NOT NULL REFERENCES integrityhvac.campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES integrityhvac.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_users_campaign ON integrityhvac.campaign_users(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_users_user ON integrityhvac.campaign_users(user_id);

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
    campaign_id UUID REFERENCES integrityhvac.campaigns(id) ON DELETE SET NULL,
    callback_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON integrityhvac.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON integrityhvac.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON integrityhvac.leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON integrityhvac.leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON integrityhvac.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_callback_date ON integrityhvac.leads(callback_date) WHERE callback_date IS NOT NULL;

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
CREATE INDEX IF NOT EXISTS idx_activities_type ON integrityhvac.activities(type);

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
CREATE INDEX IF NOT EXISTS idx_audit_trails_user_id ON integrityhvac.audit_trails(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_timestamp ON integrityhvac.audit_trails(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trails_action ON integrityhvac.audit_trails(action);

-- ============================================================================
-- STEP 6: CREATE FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION integrityhvac.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at on all tables
DROP TRIGGER IF EXISTS update_users_updated_at ON integrityhvac.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON integrityhvac.users
    FOR EACH ROW EXECUTE FUNCTION integrityhvac.update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON integrityhvac.roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON integrityhvac.roles
    FOR EACH ROW EXECUTE FUNCTION integrityhvac.update_updated_at_column();

DROP TRIGGER IF EXISTS update_statuses_updated_at ON integrityhvac.statuses;
CREATE TRIGGER update_statuses_updated_at
    BEFORE UPDATE ON integrityhvac.statuses
    FOR EACH ROW EXECUTE FUNCTION integrityhvac.update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON integrityhvac.campaigns;
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON integrityhvac.campaigns
    FOR EACH ROW EXECUTE FUNCTION integrityhvac.update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON integrityhvac.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON integrityhvac.leads
    FOR EACH ROW EXECUTE FUNCTION integrityhvac.update_updated_at_column();

-- ============================================================================
-- STEP 7: INSERT DEFAULT DATA
-- ============================================================================

-- Default Roles
INSERT INTO integrityhvac.roles (name, description) VALUES
    ('admin', 'Administrator with full system access'),
    ('staff', 'Staff member with standard access'),
    ('customer', 'Customer account'),
    ('contractor', 'Contractor account'),
    ('consultant', 'Consultant account'),
    ('other', 'Other role type')
ON CONFLICT (name) DO NOTHING;

-- Default Statuses
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

-- Default Admin Accounts (Password: Admin123!)
-- bcrypt hash: $2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu
INSERT INTO integrityhvac.users (email, name, role, password_hash) VALUES
    ('admin@integrityhvac.com', 'System Administrator', 'admin', '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'),
    ('admin1@integrityhvac.com', 'Admin User 1', 'admin', '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'),
    ('admin2@integrityhvac.com', 'Admin User 2', 'admin', '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'),
    ('admin3@integrityhvac.com', 'Admin User 3', 'admin', '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu')
ON CONFLICT (email) DO UPDATE SET role = 'admin', name = EXCLUDED.name;

-- ============================================================================
-- STEP 8: FINAL GRANTS (ensure all new tables have proper permissions)
-- ============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA integrityhvac TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA integrityhvac TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA integrityhvac TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA integrityhvac TO postgres, service_role, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA integrityhvac TO authenticated, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
    table_count INTEGER;
    user_count INTEGER;
    status_count INTEGER;
    role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'integrityhvac';
    SELECT COUNT(*) INTO user_count FROM integrityhvac.users;
    SELECT COUNT(*) INTO status_count FROM integrityhvac.statuses;
    SELECT COUNT(*) INTO role_count FROM integrityhvac.roles;

    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║       INTEGRITYHVAC MIGRATION COMPLETE                     ║';
    RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║ Tables created: %                                          ', table_count;
    RAISE NOTICE '║ Admin users: %                                             ', user_count;
    RAISE NOTICE '║ Default statuses: %                                        ', status_count;
    RAISE NOTICE '║ Default roles: %                                           ', role_count;
    RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║ Admin Accounts (Password: Admin123!)                       ║';
    RAISE NOTICE '║   - admin@integrityhvac.com                                ║';
    RAISE NOTICE '║   - admin1@integrityhvac.com                               ║';
    RAISE NOTICE '║   - admin2@integrityhvac.com                               ║';
    RAISE NOTICE '║   - admin3@integrityhvac.com                               ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
END $$;

-- Return success
SELECT 'IntegrityHVAC migration completed successfully!' as status;

-- ============================================================================
-- REMINDER: MANUAL STEP REQUIRED
-- ============================================================================
-- After running this SQL, go to your Supabase Dashboard:
--   1. Project Settings > API
--   2. Under "Exposed schemas", add "integrityhvac"
--   3. Save changes
--
-- Without this step, you will get "Invalid schema: integrityhvac" errors.
-- ============================================================================
