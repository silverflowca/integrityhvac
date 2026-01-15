/**
 * Environment Configuration Loader
 * Must be imported FIRST before any other modules that use env vars
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine which env file to load based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : process.env.NODE_ENV === 'staging'
    ? '.env.staging'
    : '.env.local';

const envPath = path.join(__dirname, '..', envFile);

// Load environment variables
dotenv.config({ path: envPath });

console.log(`📝 Loaded environment: ${envFile}`);
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'local'}`);
