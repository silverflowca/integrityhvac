import { createClient } from '@supabase/supabase-js';

// Use staging credentials
const SUPABASE_URL = 'https://mladgojbfyofgauiylxw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
    // Try to query users from both schemas
    console.log('Checking public.users...');
    const { data: publicUsers, error: publicError } = await supabase
        .from('users')
        .select('id, email')
        .limit(1);

    if (publicError) {
        console.log('public.users error:', publicError.message);
    } else {
        console.log('public.users works! Found:', publicUsers?.length, 'user(s)');
    }

    // Check what tables exist
    console.log('\nTrying to list policies via service key...');

    // The service key bypasses RLS, so if we can query users, we know the schema
    const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select('id, email, role')
        .limit(10);

    if (!allError) {
        console.log('\nUsers in database:');
        allUsers?.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    }
}

checkSchema();
