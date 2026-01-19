/**
 * Display Railway Environment Variables
 * Run this script to see the exact values to copy-paste into Railway
 */

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║           RAILWAY ENVIRONMENT VARIABLES - COPY & PASTE            ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

console.log('📋 Go to your Railway project dashboard:');
console.log('   https://railway.app/project/YOUR_PROJECT_ID\n');

console.log('🔧 Click on your service → "Variables" tab → "New Variable"\n');

console.log('─'.repeat(70));
console.log('\n1️⃣  Variable Name: NODE_ENV');
console.log('   Value to copy:\n');
console.log('staging');
console.log('\n' + '─'.repeat(70));

console.log('\n2️⃣  Variable Name: SUPABASE_URL');
console.log('   Value to copy:\n');
console.log('https://mladgojbfyofgauiylxw.supabase.co');
console.log('\n' + '─'.repeat(70));

console.log('\n3️⃣  Variable Name: SUPABASE_SERVICE_KEY');
console.log('   Value to copy:\n');
console.log('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE');
console.log('\n' + '─'.repeat(70));

console.log('\n4️⃣  Variable Name: JWT_SECRET');
console.log('   Value to copy:\n');
console.log('c4472b46c0974013fb3512737292dd85f66d6aa26f383827e20fb06df591c8f4');
console.log('\n' + '─'.repeat(70));

console.log('\n✅ After adding all variables:');
console.log('   1. Railway will automatically redeploy');
console.log('   2. Check deployment logs');
console.log('   3. Look for: "Supabase connection established successfully"\n');

console.log('🚀 Your app will then connect to staging Supabase instead of localhost!\n');

console.log('═'.repeat(70) + '\n');
