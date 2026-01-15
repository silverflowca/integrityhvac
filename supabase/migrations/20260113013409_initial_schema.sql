-- IntegrityHVAC CRM Database Schema
-- Migration: Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX idx_users_email ON public.users(email);

-- ============================================================================
-- STATUSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX idx_statuses_order ON public.statuses("order");

-- Insert default statuses
INSERT INTO public.statuses (id, name, is_default, "order") VALUES
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
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    priority TEXT CHECK (priority IN ('hot', 'warm', 'cold')),
    notes TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    callback_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_priority ON public.leads(priority);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_callback_date ON public.leads(callback_date) WHERE callback_date IS NOT NULL;

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('call', 'email', 'note')),
    duration INTEGER, -- Duration in seconds for calls
    notes TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX idx_activities_timestamp ON public.activities(timestamp DESC);
CREATE INDEX idx_activities_type ON public.activities(type);

-- ============================================================================
-- AUDIT_TRAILS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('called', 'updated', 'created')),
    duration INTEGER, -- Duration in seconds for calls
    notes TEXT,
    changes JSONB, -- Store field changes as JSON
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit trail queries
CREATE INDEX idx_audit_trails_lead_id ON public.audit_trails(lead_id);
CREATE INDEX idx_audit_trails_timestamp ON public.audit_trails(timestamp DESC);

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
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statuses_updated_at BEFORE UPDATE ON public.statuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trails ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
-- Users can read their own record
CREATE POLICY "Users can view own record"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- STATUSES POLICIES
-- Everyone can read statuses
CREATE POLICY "Anyone can view statuses"
    ON public.statuses FOR SELECT
    USING (true);

-- Only admins can modify statuses
CREATE POLICY "Admins can modify statuses"
    ON public.statuses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- LEADS POLICIES
-- Users can view their assigned leads
CREATE POLICY "Users can view assigned leads"
    ON public.leads FOR SELECT
    USING (assigned_to = auth.uid());

-- Admins can view all leads
CREATE POLICY "Admins can view all leads"
    ON public.leads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can update their assigned leads
CREATE POLICY "Users can update assigned leads"
    ON public.leads FOR UPDATE
    USING (assigned_to = auth.uid());

-- Admins can update all leads
CREATE POLICY "Admins can update all leads"
    ON public.leads FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can create leads
CREATE POLICY "Users can create leads"
    ON public.leads FOR INSERT
    WITH CHECK (true);

-- Users can delete their assigned leads
CREATE POLICY "Users can delete assigned leads"
    ON public.leads FOR DELETE
    USING (assigned_to = auth.uid());

-- Admins can delete all leads
CREATE POLICY "Admins can delete all leads"
    ON public.leads FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ACTIVITIES POLICIES
-- Users can view activities for their assigned leads
CREATE POLICY "Users can view activities for assigned leads"
    ON public.activities FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.leads
            WHERE id = activities.lead_id AND assigned_to = auth.uid()
        )
    );

-- Admins can view all activities
CREATE POLICY "Admins can view all activities"
    ON public.activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can create activities
CREATE POLICY "Users can create activities"
    ON public.activities FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- AUDIT_TRAILS POLICIES
-- Users can view audit trails for their assigned leads
CREATE POLICY "Users can view audit trails for assigned leads"
    ON public.audit_trails FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.leads
            WHERE id = audit_trails.lead_id AND assigned_to = auth.uid()
        )
    );

-- Admins can view all audit trails
CREATE POLICY "Admins can view all audit trails"
    ON public.audit_trails FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can create audit trails
CREATE POLICY "Users can create audit trails"
    ON public.audit_trails FOR INSERT
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
    FROM public.leads
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
        'total_users', (SELECT COUNT(*) FROM public.users),
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
    FROM public.leads;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant access to sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
