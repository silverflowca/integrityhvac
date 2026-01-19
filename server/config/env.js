/**
 * Environment Configuration Loader
 * Must be imported FIRST before any other modules that use env vars
 *
 * Priority:
 * 1. Existing environment variables (from Railway, Docker, etc)
 * 2. .env file based on NODE_ENV
 * 3. Default to .env.local for local development
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we're in a cloud environment
// Railway might not set RAILWAY_ENVIRONMENT, but always sets these:
const isCloudEnvironment = process.env.NODE_ENV === 'staging' ||
                          process.env.NODE_ENV === 'production' ||
                          process.env.RAILWAY_ENVIRONMENT ||
                          process.env.RAILWAY_STATIC_URL ||
                          process.env.RAILWAY_SERVICE_ID ||
                          process.env.RENDER ||
                          process.env.VERCEL ||
                          process.env.HEROKU_APP_NAME;

// Debug: Log all environment variables in Railway
if (isCloudEnvironment) {
    console.log(`📝 Running in cloud environment, using provided environment variables`);
    console.log(`🔍 RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT}`);
    console.log(`🔍 All env keys:`, Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('NODE_ENV') || k.includes('JWT')));
    console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`📍 SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`📍 SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing'}`);
} else {
    // Local development - load from .env file
    const envFile = process.env.NODE_ENV === 'production'
        ? '.env.production'
        : process.env.NODE_ENV === 'staging'
        ? '.env.staging'
        : '.env.local';

    const envPath = path.join(__dirname, '..', envFile);

    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`📝 Loaded environment from file: ${envFile}`);
    } else {
        console.log(`⚠️  No env file found: ${envFile}`);
    }

    console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'local'}`);
}
