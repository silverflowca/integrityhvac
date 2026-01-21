import { createClient } from '@supabase/supabase-js';

// Use staging credentials
const SUPABASE_URL = 'https://mladgojbfyofgauiylxw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixRLSRecursion() {
    console.log('Fixing RLS recursion issue on users table...\n');

    // Execute SQL to fix the recursion
    const sql = `
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
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.log('RPC exec_sql not available. You need to run this SQL manually in Supabase SQL Editor:');
        console.log('\n' + '='.repeat(60) + '\n');
        console.log(sql);
        console.log('\n' + '='.repeat(60) + '\n');
        console.log('Go to: https://supabase.com/dashboard/project/mladgojbfyofgauiylxw/sql/new');
        return;
    }

    console.log('Successfully fixed RLS recursion!');
}

fixRLSRecursion();
