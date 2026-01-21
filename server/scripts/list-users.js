import { createClient } from '@supabase/supabase-js';

// Use staging credentials directly
const SUPABASE_URL = 'https://mladgojbfyofgauiylxw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .order('role', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== All Users ===\n');
  const admins = data.filter(u => u.role === 'admin');
  const staff = data.filter(u => u.role !== 'admin');

  console.log('ADMIN USERS:');
  console.log('------------');
  admins.forEach(u => {
    console.log(`  ID: ${u.id}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Name: ${u.name || '(not set)'}`);
    console.log(`  Created: ${u.created_at}`);
    console.log('');
  });

  console.log('\nSTAFF USERS:');
  console.log('------------');
  staff.forEach(u => {
    console.log(`  ID: ${u.id}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Name: ${u.name || '(not set)'}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  Created: ${u.created_at}`);
    console.log('');
  });

  console.log(`\nTotal: ${admins.length} admin(s), ${staff.length} staff member(s)`);
}

listUsers();
