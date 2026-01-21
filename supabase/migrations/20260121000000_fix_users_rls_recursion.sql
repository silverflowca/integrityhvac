-- Fix infinite recursion in users table RLS policy
-- The "Admins can view all users" policy was querying the users table inside a policy ON the users table

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- Create a function to check if the current user is an admin
-- This function uses SECURITY DEFINER to bypass RLS and check the role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = auth.uid();

    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the policy using the helper function
CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (public.is_admin());

-- Also fix similar policies on other tables that check admin status
-- These don't cause recursion but benefit from using the same pattern

-- Statuses table
DROP POLICY IF EXISTS "Admins can modify statuses" ON public.statuses;
CREATE POLICY "Admins can modify statuses"
    ON public.statuses FOR ALL
    USING (public.is_admin());

-- Leads table
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
CREATE POLICY "Admins can view all leads"
    ON public.leads FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can modify all leads" ON public.leads;
CREATE POLICY "Admins can modify all leads"
    ON public.leads FOR ALL
    USING (public.is_admin());

-- Audit trails table
DROP POLICY IF EXISTS "Admins can view all audit trails" ON public.audit_trails;
CREATE POLICY "Admins can view all audit trails"
    ON public.audit_trails FOR SELECT
    USING (public.is_admin());

-- Campaigns table (if exists)
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.campaigns;
CREATE POLICY "Admins can manage campaigns"
    ON public.campaigns FOR ALL
    USING (public.is_admin());

-- Campaign users table (if exists)
DROP POLICY IF EXISTS "Admins can manage campaign users" ON public.campaign_users;
CREATE POLICY "Admins can manage campaign users"
    ON public.campaign_users FOR ALL
    USING (public.is_admin());
