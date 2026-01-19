/**
 * Show Environment Variables for Railway
 * Reads .env.staging and formats for copy-paste to Railway dashboard
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = path.join(__dirname, '..', '.env.staging');

if (!fs.existsSync(envFile)) {
    console.error('❌ .env.staging not found!');
    process.exit(1);
}

const envContent = fs.readFileSync(envFile, 'utf8');

console.log('\n' + '═'.repeat(70));
console.log('  RAILWAY ENVIRONMENT VARIABLES - COPY TO DASHBOARD');
console.log('═'.repeat(70) + '\n');

console.log('📋 Go to Railway → Your Project → Service → Variables → Raw Editor\n');
console.log('📝 Copy everything below the line and paste into Railway:\n');
console.log('─'.repeat(70) + '\n');

// Parse and display only the variables (skip comments and empty lines)
const lines = envContent.split('\n');
const variables = [];

for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check if it's a valid KEY=VALUE line
    if (trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();

        // Skip if no value
        if (!value) continue;

        variables.push({ key: key.trim(), value });
        console.log(`${key.trim()}=${value}`);
    }
}

console.log('\n' + '─'.repeat(70) + '\n');
console.log(`✅ ${variables.length} variables ready to copy`);
console.log('\n💡 After pasting in Railway:');
console.log('   1. Click "Update Variables"');
console.log('   2. Railway will auto-redeploy');
console.log('   3. Check logs for: "Supabase connection established"');
console.log('\n' + '═'.repeat(70) + '\n');
