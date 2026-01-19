/**
 * Supabase Client Configuration
 * Used for authentication and database operations from the client
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
// For Vite, use VITE_ prefix
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Determine environment based on URL
const getEnvironment = () => {
    if (!supabaseUrl) return 'NOT_CONFIGURED';
    if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
        return 'LOCAL';
    }
    if (supabaseUrl.includes('.supabase.co')) {
        // Extract project ref to identify staging vs production
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        return `CLOUD (${projectRef})`;
    }
    return 'UNKNOWN';
};

const environment = getEnvironment();

// Log Supabase configuration on startup
console.log('╔════════════════════════════════════════════════════╗');
console.log('║         SUPABASE CLIENT CONFIGURATION              ║');
console.log('╠════════════════════════════════════════════════════╣');
console.log(`║ Environment: ${environment.padEnd(38)} ║`);
console.log(`║ URL: ${(supabaseUrl || 'NOT SET').padEnd(43)} ║`);
console.log(`║ Anon Key: ${(supabaseAnonKey ? '✅ Set (' + supabaseAnonKey.substring(0, 20) + '...)' : '❌ Missing').padEnd(40)} ║`);
console.log('╚════════════════════════════════════════════════════╝');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️  Supabase configuration missing!');
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
}

/**
 * Supabase client with anon key
 * This is safe to use on the client-side
 * Row Level Security (RLS) policies will protect data
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    db: {
        schema: 'integrityhvac'
    }
});

export default supabase;
