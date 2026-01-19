# Railway Troubleshooting - "Trying localhost" Error

## Current Setup

✅ **Dockerfile exists** - Railway will use Docker to build your app
✅ **Environment variables set** - You confirmed these are in Railway dashboard
✅ **Code is correct** - `config/env.js` properly detects Railway environment

## The Problem

Railway logs show it's trying to connect to **localhost** instead of staging Supabase.

## Most Likely Causes

### 1. Environment Variables Not Actually Set in Railway

Even though you think they're set, double-check:

1. Go to Railway dashboard
2. Click on your **service** (not the project)
3. Click **"Variables"** tab
4. Verify these EXACT variable names exist:
   - `NODE_ENV`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`

**Common mistakes:**
- Variables set on project level instead of service level
- Typo in variable name (e.g., `SUPABASE_URI` instead of `SUPABASE_URL`)
- Extra spaces in variable names or values
- Variables set but not saved/applied

### 2. Wrong Service Selected

If you have multiple services in Railway:
- Make sure you're setting variables on the **server** service
- Not on a different service or the project itself

### 3. Environment Variable Names Don't Match

Check the EXACT names Railway expects. Run this locally to see what your code is looking for:

```bash
cd integrityhvac/server
grep -r "process.env" config/
```

Should show:
- `process.env.SUPABASE_URL`
- `process.env.SUPABASE_SERVICE_KEY`
- `process.env.JWT_SECRET`
- `process.env.NODE_ENV`

### 4. .env Files in Docker Build

Your Dockerfile doesn't copy `.env` files (which is correct for production). Railway variables should be set in the dashboard, NOT in repo files.

## Debugging Steps

### Step 1: Check Railway Logs

Look for these lines in Railway deployment logs:

**If you see this - Variables are NOT being loaded:**
```
⚠️  Supabase configuration missing!
SUPABASE_URL: ❌ Missing
SUPABASE_SERVICE_KEY: ❌ Missing
```

**If you see this - Variables ARE loaded correctly:**
```
📝 Running in cloud environment, using provided environment variables
📍 NODE_ENV: staging
📍 SUPABASE_URL: ✅ Set
📍 SUPABASE_SERVICE_KEY: ✅ Set
✅ Supabase connection established successfully
📍 Connected to: https://mladgojbfyofgauiylxw.supabase.co
```

### Step 2: Use Debug Endpoint

After deploying the latest code (with debug routes):

```bash
curl https://your-app.railway.app/api/debug/env
```

This will show you EXACTLY what environment variables Railway is seeing.

### Step 3: Check Railway Environment Detection

Your `config/env.js` detects Railway by checking `process.env.RAILWAY_ENVIRONMENT`.

In Railway logs, look for:
```
🔍 RAILWAY_ENVIRONMENT: production
```

If this is missing, Railway isn't setting its own environment variable (very rare).

## Solutions

### Solution 1: Re-set Variables in Railway Dashboard

1. Go to Railway → Your Service → Variables
2. Click **"Raw Editor"**
3. **Delete all existing variables**
4. Paste this:

```env
NODE_ENV=staging
SUPABASE_URL=https://mladgojbfyofgauiylxw.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE
JWT_SECRET=c4472b46c0974013fb3512737292dd85f66d6aa26f383827e20fb06df591c8f4
PORT=5000
```

5. Click **"Update Variables"**
6. Wait for auto-redeploy

### Solution 2: Force Environment Variable Load in Dockerfile

If Railway variables aren't being passed correctly, modify the Dockerfile to explicitly set them:

**NOT RECOMMENDED** but can help debug:

Add this to Dockerfile before `ENTRYPOINT`:
```dockerfile
ENV NODE_ENV=staging
ENV SUPABASE_URL=https://mladgojbfyofgauiylxw.supabase.co
```

But this defeats the purpose of Railway variables. Only use for testing.

### Solution 3: Use Railway CLI to Set Variables

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Set variables
railway variables set NODE_ENV=staging
railway variables set SUPABASE_URL=https://mladgojbfyofgauiylxw.supabase.co
railway variables set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE
railway variables set JWT_SECRET=c4472b46c0974013fb3512737292dd85f66d6aa26f383827e20fb06df591c8f4

# List to verify
railway variables
```

## Expected Railway Logs (Success)

When everything works, Railway deployment logs should show:

```
Building...
[Building] Dockerfile detected, using Docker build
[Building] Building image...
[Building] Successfully built image
[Deploying] Starting container...
[Running] 📝 Loaded environment from file: .env.local  ← This is WRONG
```

Wait - if you see `.env.local` in Railway logs, that's the problem!

The code is loading `.env.local` because it doesn't detect Railway environment.

## The Real Fix

Your `config/env.js` line 20 checks for `RAILWAY_ENVIRONMENT`:

```javascript
const isCloudEnvironment = process.env.RAILWAY_ENVIRONMENT || ...
```

Railway might not be setting this variable. Try checking if `PORT` is set instead:

```javascript
const isCloudEnvironment = process.env.RAILWAY_ENVIRONMENT ||
                          process.env.RAILWAY_STATIC_URL ||
                          process.env.PORT !== undefined;
```

Actually, better fix - Railway ALWAYS sets a PORT. Let me create a patch.

## Quick Patch

The issue is Railway detection. Your code checks for `RAILWAY_ENVIRONMENT` but Railway might not set that.

Railway ALWAYS sets these:
- `PORT` (from their platform)
- `RAILWAY_STATIC_URL`
- `RAILWAY_SERVICE_ID`

Update `config/env.js` line 19-23 to:

```javascript
const isCloudEnvironment = process.env.RAILWAY_ENVIRONMENT ||
                          process.env.RAILWAY_STATIC_URL ||
                          process.env.RAILWAY_SERVICE_ID ||
                          process.env.RENDER ||
                          process.env.VERCEL ||
                          process.env.HEROKU_APP_NAME;
```

Or even simpler - if `NODE_ENV` is set to staging/production, treat it as cloud:

```javascript
const isCloudEnvironment = process.env.NODE_ENV === 'staging' ||
                          process.env.NODE_ENV === 'production' ||
                          process.env.RAILWAY_ENVIRONMENT ||
                          process.env.RENDER ||
                          process.env.VERCEL;
```

This way, when Railway sets `NODE_ENV=staging`, your code will use Railway variables instead of loading `.env.local`.

---

## Share Your Logs

To help debug further, share these from Railway:

1. The **build logs** (first 50 lines)
2. The **runtime logs** (first 50 lines after "Starting container")
3. Screenshot of Railway **Variables** tab

This will show exactly what's happening!
