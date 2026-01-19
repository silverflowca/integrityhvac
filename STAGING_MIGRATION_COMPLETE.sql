-- Create separate schemas for each application
-- This allows multiple apps to share the same Supabase instance without table conflicts

-- Create FreedomBus schema
CREATE SCHEMA IF NOT EXISTS freedombus;

-- Create IntegrityHVAC schema
CREATE SCHEMA IF NOT EXISTS integrityhvac;

-- Grant usage on schemas to authenticated users
GRANT USAGE ON SCHEMA freedombus TO authenticated;
GRANT USAGE ON SCHEMA integrityhvac TO authenticated;
GRANT USAGE ON SCHEMA freedombus TO anon;
GRANT USAGE ON SCHEMA integrityhvac TO anon;

-- Grant all privileges on all tables in schemas to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA freedombus TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA integrityhvac TO authenticated;

-- Grant select on all tables in schemas to anon users
GRANT SELECT ON ALL TABLES IN SCHEMA freedombus TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA integrityhvac TO anon;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA freedombus GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA integrityhvac GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA freedombus GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA integrityhvac GRANT SELECT ON TABLES TO anon;

-- Enable UUID extension (shared across all schemas)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

COMMENT ON SCHEMA freedombus IS 'FreedomBus volunteer management application schema';
COMMENT ON SCHEMA integrityhvac IS 'IntegrityHVAC CRM application schema';
-- IntegrityHVAC CRM Database Schema
-- Migration: Initial Schema
-- All tables are in the integrityhvac schema

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE integrityhvac.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX idx_users_email ON integrityhvac.users(email);

-- ============================================================================
-- STATUSES TABLE
-- ============================================================================
CREATE TABLE integrityhvac.statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX idx_statuses_order ON integrityhvac.statuses("order");

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

-- ============================================================================
-- LEADS TABLE
-- ============================================================================
CREATE TABLE integrityhvac.leads (
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_leads_assigned_to ON integrityhvac.leads(assigned_to);
CREATE INDEX idx_leads_status ON integrityhvac.leads(status);
CREATE INDEX idx_leads_priority ON integrityhvac.leads(priority);
CREATE INDEX idx_leads_created_at ON integrityhvac.leads(created_at DESC);
CREATE INDEX idx_leads_callback_date ON integrityhvac.leads(callback_date) WHERE callback_date IS NOT NULL;

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================
CREATE TABLE integrityhvac.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES integrityhvac.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES integrityhvac.leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('call', 'email', 'note')),
    duration INTEGER, -- Duration in seconds for calls
    notes TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX idx_activities_user_id ON integrityhvac.activities(user_id);
CREATE INDEX idx_activities_lead_id ON integrityhvac.activities(lead_id);
CREATE INDEX idx_activities_timestamp ON integrityhvac.activities(timestamp DESC);
CREATE INDEX idx_activities_type ON integrityhvac.activities(type);

-- ============================================================================
-- AUDIT_TRAILS TABLE
-- ============================================================================
CREATE TABLE integrityhvac.audit_trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES integrityhvac.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES integrityhvac.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('called', 'updated', 'created')),
    duration INTEGER, -- Duration in seconds for calls
    notes TEXT,
    changes JSONB, -- Store field changes as JSON
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit trail queries
CREATE INDEX idx_audit_trails_lead_id ON integrityhvac.audit_trails(lead_id);
CREATE INDEX idx_audit_trails_timestamp ON integrityhvac.audit_trails(timestamp DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON integrityhvac.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statuses_updated_at BEFORE UPDATE ON integrityhvac.statuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON integrityhvac.leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup (for integrityhvac schema)
CREATE OR REPLACE FUNCTION integrityhvac.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO integrityhvac.users (id, email, password_hash, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    '', -- Password is managed by Supabase Auth
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile when signing up
DROP TRIGGER IF EXISTS on_auth_user_created_integrityhvac ON auth.users;
CREATE TRIGGER on_auth_user_created_integrityhvac
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION integrityhvac.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE integrityhvac.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrityhvac.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrityhvac.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrityhvac.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrityhvac.audit_trails ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
-- Users can read their own record
CREATE POLICY "Users can view own record"
    ON integrityhvac.users FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
    ON integrityhvac.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM integrityhvac.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- STATUSES POLICIES
-- Everyone can read statuses
CREATE POLICY "Anyone can view statuses"
    ON integrityhvac.statuses FOR SELECT
    USING (true);

-- Only admins can modify statuses
CREATE POLICY "Admins can modify statuses"
    ON integrityhvac.statuses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM integrityhvac.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- LEADS POLICIES
-- Users can view their assigned leads
CREATE POLICY "Users can view assigned leads"
    ON integrityhvac.leads FOR SELECT
    USING (assigned_to = auth.uid());

-- Admins can view all leads
CREATE POLICY "Admins can view all leads"
    ON integrityhvac.leads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM integrityhvac.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can update their assigned leads
CREATE POLICY "Users can update assigned leads"
    ON integrityhvac.leads FOR UPDATE
    USING (assigned_to = auth.uid());

-- Admins can update all leads
CREATE POLICY "Admins can update all leads"
    ON integrityhvac.leads FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM integrityhvac.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can create leads
CREATE POLICY "Users can create leads"
    ON integrityhvac.leads FOR INSERT
    WITH CHECK (true);

-- Users can delete their assigned leads
CREATE POLICY "Users can delete assigned leads"
    ON integrityhvac.leads FOR DELETE
    USING (assigned_to = auth.uid());

-- Admins can delete all leads
CREATE POLICY "Admins can delete all leads"
    ON integrityhvac.leads FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM integrityhvac.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ACTIVITIES POLICIES
-- Users can view activities for their assigned leads
CREATE POLICY "Users can view activities for assigned leads"
    ON integrityhvac.activities FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM integrityhvac.leads
            WHERE id = activities.lead_id AND assigned_to = auth.uid()
        )
    );

-- Admins can view all activities
CREATE POLICY "Admins can view all activities"
    ON integrityhvac.activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM integrityhvac.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can create activities
CREATE POLICY "Users can create activities"
    ON integrityhvac.activities FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- AUDIT_TRAILS POLICIES
-- Users can view audit trails for their assigned leads
CREATE POLICY "Users can view audit trails for assigned leads"
    ON integrityhvac.audit_trails FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM integrityhvac.leads
            WHERE id = audit_trails.lead_id AND assigned_to = auth.uid()
        )
    );

-- Admins can view all audit trails
CREATE POLICY "Admins can view all audit trails"
    ON integrityhvac.audit_trails FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM integrityhvac.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can create audit trails
CREATE POLICY "Users can create audit trails"
    ON integrityhvac.audit_trails FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get dashboard stats for a user
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_leads', COUNT(*),
        'new_leads', COUNT(*) FILTER (WHERE status = 'new'),
        'contacted_leads', COUNT(*) FILTER (WHERE status = 'contacted'),
        'qualified_leads', COUNT(*) FILTER (WHERE status = 'qualified'),
        'quoted_leads', COUNT(*) FILTER (WHERE status = 'quoted'),
        'won_leads', COUNT(*) FILTER (WHERE status = 'won'),
        'hot_leads', COUNT(*) FILTER (WHERE priority = 'hot'),
        'warm_leads', COUNT(*) FILTER (WHERE priority = 'warm'),
        'cold_leads', COUNT(*) FILTER (WHERE priority = 'cold')
    )
    INTO result
    FROM integrityhvac.leads
    WHERE assigned_to = user_uuid;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_leads', COUNT(*),
        'total_users', (SELECT COUNT(*) FROM integrityhvac.users),
        'new_leads', COUNT(*) FILTER (WHERE status = 'new'),
        'contacted_leads', COUNT(*) FILTER (WHERE status = 'contacted'),
        'qualified_leads', COUNT(*) FILTER (WHERE status = 'qualified'),
        'quoted_leads', COUNT(*) FILTER (WHERE status = 'quoted'),
        'won_leads', COUNT(*) FILTER (WHERE status = 'won'),
        'lost_leads', COUNT(*) FILTER (WHERE status = 'lost'),
        'hot_leads', COUNT(*) FILTER (WHERE priority = 'hot'),
        'warm_leads', COUNT(*) FILTER (WHERE priority = 'warm'),
        'cold_leads', COUNT(*) FILTER (WHERE priority = 'cold')
    )
    INTO result
    FROM integrityhvac.leads;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on integrityhvac schema
GRANT USAGE ON SCHEMA integrityhvac TO postgres, service_role, anon, authenticated;

-- Grant access to tables in integrityhvac schema
GRANT ALL ON ALL TABLES IN SCHEMA integrityhvac TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA integrityhvac TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA integrityhvac TO anon;

-- Grant access to sequences in integrityhvac schema
GRANT ALL ON ALL SEQUENCES IN SCHEMA integrityhvac TO postgres, service_role, authenticated;

-- Set default privileges for future tables in integrityhvac schema
ALTER DEFAULT PRIVILEGES IN SCHEMA integrityhvac GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA integrityhvac GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA integrityhvac GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA integrityhvac GRANT ALL ON SEQUENCES TO postgres, service_role, authenticated;

-- Grant execute on functions in integrityhvac schema
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA integrityhvac TO authenticated, service_role;
-- IntegrityHVAC Campaign Management
-- Migration: Add campaigns, campaign_users, and campaign_id to leads

-- ============================================================================
-- CAMPAIGNS TABLE
-- ============================================================================
CREATE TABLE integrityhvac.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_by UUID REFERENCES integrityhvac.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_campaigns_status ON integrityhvac.campaigns(status);
CREATE INDEX idx_campaigns_created_by ON integrityhvac.campaigns(created_by);
CREATE INDEX idx_campaigns_created_at ON integrityhvac.campaigns(created_at DESC);

-- ============================================================================
-- CAMPAIGN_USERS TABLE (Junction table for user assignments)
-- ============================================================================
CREATE TABLE integrityhvac.campaign_users (
    campaign_id UUID NOT NULL REFERENCES integrityhvac.campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES integrityhvac.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (campaign_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_campaign_users_campaign ON integrityhvac.campaign_users(campaign_id);
CREATE INDEX idx_campaign_users_user ON integrityhvac.campaign_users(user_id);

-- ============================================================================
-- ADD CAMPAIGN_ID TO LEADS TABLE
-- ============================================================================
ALTER TABLE integrityhvac.leads
ADD COLUMN campaign_id UUID REFERENCES integrityhvac.campaigns(id) ON DELETE SET NULL;

-- Index for campaign filtering
CREATE INDEX idx_leads_campaign ON integrityhvac.leads(campaign_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for campaigns
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON integrityhvac.campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE integrityhvac.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrityhvac.campaign_users ENABLE ROW LEVEL SECURITY;

-- CAMPAIGNS POLICIES
-- All authenticated users can view campaigns
CREATE POLICY "Authenticated users can view campaigns"
    ON integrityhvac.campaigns FOR SELECT
    USING (true);

-- Admins can create campaigns
CREATE POLICY "Admins can create campaigns"
    ON integrityhvac.campaigns FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM integrityhvac.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Admins can update campaigns
CREATE POLICY "Admins can update campaigns"
    ON integrityhvac.campaigns FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM integrityhvac.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Admins can delete campaigns
CREATE POLICY "Admins can delete campaigns"
    ON integrityhvac.campaigns FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM integrityhvac.users WHERE id = auth.uid() AND role = 'admin')
    );

-- CAMPAIGN_USERS POLICIES
-- All authenticated users can view campaign assignments
CREATE POLICY "Authenticated users can view campaign assignments"
    ON integrityhvac.campaign_users FOR SELECT
    USING (true);

-- Admins can manage campaign assignments
CREATE POLICY "Admins can manage campaign assignments"
    ON integrityhvac.campaign_users FOR ALL
    USING (
        EXISTS (SELECT 1 FROM integrityhvac.users WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to new tables
GRANT ALL ON integrityhvac.campaigns TO postgres, service_role;
GRANT ALL ON integrityhvac.campaigns TO authenticated;
GRANT SELECT ON integrityhvac.campaigns TO anon;

GRANT ALL ON integrityhvac.campaign_users TO postgres, service_role;
GRANT ALL ON integrityhvac.campaign_users TO authenticated;
GRANT SELECT ON integrityhvac.campaign_users TO anon;
-- Create roles table for integrityhvac schema
-- Migration: 20250120000000_create_roles_table.sql

-- Create roles table in integrityhvac schema
CREATE TABLE IF NOT EXISTS integrityhvac.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create updated_at trigger for roles
CREATE OR REPLACE FUNCTION integrityhvac.update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON integrityhvac.roles
    FOR EACH ROW
    EXECUTE FUNCTION integrityhvac.update_roles_updated_at();

-- Insert default roles
INSERT INTO integrityhvac.roles (name, description)
VALUES
    ('admin', 'Administrator with full system access'),
    ('staff', 'Staff member with standard access'),
    ('customer', 'Customer account'),
    ('contractor', 'Contractor account'),
    ('consultant', 'Consultant account'),
    ('other', 'Other role type')
ON CONFLICT (name) DO NOTHING;

-- Log the creation
DO $$
BEGIN
    RAISE NOTICE 'Roles table created with default roles';
END $$;
-- Add default system admin and three admin user accounts
-- Migration: 20250120000001_add_default_admin_users.sql

-- Insert default system admin account
-- Email: admin@integrityhvac.com
-- Password: Admin123! (hashed with bcrypt)
INSERT INTO integrityhvac.users (email, name, role, password_hash)
VALUES (
    'admin@integrityhvac.com',
    'System Administrator',
    'admin',
    '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin', name = 'System Administrator';

-- Insert first admin account
INSERT INTO integrityhvac.users (email, name, role, password_hash)
VALUES (
    'admin1@integrityhvac.com',
    'Admin User 1',
    'admin',
    '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin', name = 'Admin User 1';

-- Insert second admin account
INSERT INTO integrityhvac.users (email, name, role, password_hash)
VALUES (
    'admin2@integrityhvac.com',
    'Admin User 2',
    'admin',
    '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin', name = 'Admin User 2';

-- Insert third admin account
INSERT INTO integrityhvac.users (email, name, role, password_hash)
VALUES (
    'admin3@integrityhvac.com',
    'Admin User 3',
    'admin',
    '$2b$10$sWXdV4MEgfZJsJ0sUeEqUuYzy.6hoJSIoKKguSfUi80.NJnAyJfeu'
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin', name = 'Admin User 3';

-- Log the creation
DO $$
BEGIN
    RAISE NOTICE 'Default admin accounts created/updated:';
    RAISE NOTICE '  - admin@integrityhvac.com (System Administrator)';
    RAISE NOTICE '  - admin1@integrityhvac.com (Admin User 1)';
    RAISE NOTICE '  - admin2@integrityhvac.com (Admin User 2)';
    RAISE NOTICE '  - admin3@integrityhvac.com (Admin User 3)';
    RAISE NOTICE 'Default password for all accounts: Admin123!';
END $$;
