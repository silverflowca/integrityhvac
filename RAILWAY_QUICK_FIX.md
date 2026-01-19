# Railway Quick Fix - Use Staging Supabase

## ✅ You Already Have the Config!

Your `.env.staging` file already has the correct values:
- ✅ SUPABASE_URL: `https://mladgojbfyofgauiylxw.supabase.co`
- ✅ SUPABASE_SERVICE_KEY: (staging key)
- ✅ JWT_SECRET: (configured)
- ✅ NODE_ENV: `staging`

## 🚀 Option 1: Set Variables in Railway Dashboard (Easiest)

1. **Go to Railway:** https://railway.app
2. **Open your project** → Click on your service
3. **Go to "Variables" tab**
4. **Click "Raw Editor"** (easier than one-by-one)
5. **Paste this entire block:**

```env
NODE_ENV=staging
SUPABASE_URL=https://mladgojbfyofgauiylxw.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE
JWT_SECRET=c4472b46c0974013fb3512737292dd85f66d6aa26f383827e20fb06df591c8f4
PORT=5000
```

6. **Click "Update Variables"**
7. **Wait for automatic redeploy** (1-2 minutes)

## 🔧 Option 2: Use Railway CLI (If installed)

```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set variables from .env.staging
railway variables set NODE_ENV=staging
railway variables set SUPABASE_URL=https://mladgojbfyofgauiylxw.supabase.co
railway variables set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE
railway variables set JWT_SECRET=c4472b46c0974013fb3512737292dd85f66d6aa26f383827e20fb06df591c8f4

# Redeploy
railway up
```

## 📋 What You'll See After Fix

**Before (Current - ERROR):**
```
⚠️  Supabase configuration missing!
SUPABASE_URL: ❌ Missing
Trying to connect to localhost...
```

**After (Fixed - SUCCESS):**
```
📝 Running in cloud environment, using provided environment variables
🔍 RAILWAY_ENVIRONMENT: production
📍 NODE_ENV: staging
📍 SUPABASE_URL: ✅ Set
📍 SUPABASE_SERVICE_KEY: ✅ Set
✅ Supabase connection established successfully
📍 Connected to: https://mladgojbfyofgauiylxw.supabase.co
```

## 🎯 Why This Happened

Railway **doesn't automatically read `.env` files** from your repository. You need to set environment variables in Railway's dashboard.

Your code is correct - the `config/env.js` file properly detects Railway environment. It just needs the variables to be set in Railway's UI.

## ✅ Verification Steps

After setting variables in Railway:

1. **Check Deployment Logs:**
   - Go to your service in Railway
   - Click "Deployments" tab
   - Click on the latest deployment
   - Look for the success message above

2. **Test API Endpoint:**
   ```bash
   curl https://your-app.railway.app/api/health
   ```

3. **Test Admin Login:**
   ```bash
   curl -X POST https://your-app.railway.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@integrityhvac.com","password":"Admin123!"}'
   ```

## 🔒 Security Note

The `.env.staging` and `.env.production` files should be in `.gitignore` so they're not committed to your repository. Railway variables are encrypted and stored securely.

## 💡 Pro Tip

For production deployment, use the values from `.env.production`:
- SUPABASE_URL: `https://dahiedmlyahahprojpbi.supabase.co`
- Just switch `NODE_ENV` to `production` in Railway variables

---

## Need Help?

If you see any errors after setting variables:
1. Check Railway deployment logs
2. Verify all 4 variables are set correctly (no typos)
3. Make sure values don't have extra spaces or quotes
4. Trigger a manual redeploy if needed
