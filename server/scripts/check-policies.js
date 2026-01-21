import { createClient } from '@supabase/supabase-js';

// Use staging credentials
const SUPABASE_URL = 'https://mladgojbfyofgauiylxw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkPolicies() {
  // Query pg_policies via RPC or raw SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'users';`
  });

  if (error) {
    console.log('RPC not available, trying direct query...');
    // The service key bypasses RLS, so we can just check if there's an issue
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5);

    if (usersError) {
      console.error('Error querying users:', usersError);
    } else {
      console.log('Users query works with service key:', users?.length, 'users found');
    }
    return;
  }

  console.log('Policies:', JSON.stringify(data, null, 2));
}

checkPolicies();
