/**
 * Supabase Client Configuration
 * Singleton pattern for Supabase client initialization
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('⚠️  Supabase configuration missing!');
  console.error('SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.error('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
  throw new Error('Missing Supabase configuration. Check your .env file.');
}

/**
 * Supabase client with service role key
 * This bypasses Row Level Security (RLS) policies
 * Use carefully - only for server-side operations
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'integrityhvac'
  }
});

// Test connection on startup
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection established successfully');
    console.log(`📍 Connected to: ${SUPABASE_URL}`);
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    console.error('💡 Make sure Supabase is running (npm run supabase:start for local)');
  }
}

// Test connection when module is loaded
testConnection();

export default supabase;
