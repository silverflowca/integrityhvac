# Railway Deployment Setup

## Environment Variables Required

You need to set these environment variables in Railway dashboard:

### 🔧 How to Set Environment Variables in Railway

1. Go to your Railway project: https://railway.app/project/YOUR_PROJECT_ID
2. Click on your service (integrityhvac-server)
3. Go to the **"Variables"** tab
4. Click **"New Variable"** and add each of these:

### Required Variables for Staging

```env
NODE_ENV=staging

# Supabase Configuration (Staging)
SUPABASE_URL=https://mladgojbfyofgauiylxw.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE

# JWT Secret
JWT_SECRET=c4472b46c0974013fb3512737292dd85f66d6aa26f383827e20fb06df591c8f4

# Server Port (Railway assigns this automatically, but you can override)
PORT=5000
```

### 📋 Variable-by-Variable Setup

Add each variable individually in Railway:

| Variable Name | Value |
|--------------|-------|
| `NODE_ENV` | `staging` |
| `SUPABASE_URL` | `https://mladgojbfyofgauiylxw.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE` |
| `JWT_SECRET` | `c4472b46c0974013fb3512737292dd85f66d6aa26f383827e20fb06df591c8f4` |

---

## After Setting Variables

1. Railway will automatically redeploy your app
2. Check the deployment logs
3. You should see:
   ```
   📝 Running in cloud environment, using provided environment variables
   ✅ SUPABASE_URL: ✅ Set
   ✅ SUPABASE_SERVICE_KEY: ✅ Set
   ✅ Supabase connection established successfully
   ```

---

## Quick Copy-Paste for Railway UI

### NODE_ENV
```
staging
```

### SUPABASE_URL
```
https://mladgojbfyofgauiylxw.supabase.co
```

### SUPABASE_SERVICE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE
```

### JWT_SECRET
```
c4472b46c0974013fb3512737292dd85f66d6aa26f383827e20fb06df591c8f4
```

---

## Troubleshooting

### Still seeing "localhost" in logs?

1. Verify all variables are set in Railway (no typos)
2. Trigger a new deployment:
   - Make a small change to any file
   - Commit and push to git
   - Or click "Redeploy" in Railway UI

### Connection fails?

1. Check Supabase is accessible: https://mladgojbfyofgauiylxw.supabase.co
2. Verify service key hasn't expired
3. Check Railway logs for specific error messages

### How to verify variables are set?

Check the Railway logs. You should see:
```
📝 Running in cloud environment, using provided environment variables
🔍 RAILWAY_ENVIRONMENT: production
📍 NODE_ENV: staging
📍 SUPABASE_URL: ✅ Set
📍 SUPABASE_SERVICE_KEY: ✅ Set
```

If you see `❌ Missing`, the variable isn't set correctly in Railway.

---

## Alternative: Use Railway CLI

If you prefer using the CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set environment variables
railway variables set NODE_ENV=staging
railway variables set SUPABASE_URL=https://mladgojbfyofgauiylxw.supabase.co
railway variables set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE
railway variables set JWT_SECRET=c4472b46c0974013fb3512737292dd85f66d6aa26f383827e20fb06df591c8f4

# Trigger redeploy
railway up
```

---

## Security Note

⚠️ The `SUPABASE_SERVICE_KEY` is a **service role key** that bypasses Row Level Security (RLS). Keep it secret and never expose it in client-side code.

For client-side apps, use the **anon key** instead (get from Supabase dashboard).

---

## What Happens After Setup?

1. Railway detects new environment variables
2. App automatically redeploys
3. Server connects to staging Supabase (not localhost)
4. Admin accounts are accessible
5. API endpoints work with staging database

---

## Testing Your Deployment

Once deployed, test these endpoints:

### Health Check
```
GET https://your-app.railway.app/api/health
```

### Login (Admin Account)
```
POST https://your-app.railway.app/api/auth/login
Content-Type: application/json

{
  "email": "admin@integrityhvac.com",
  "password": "Admin123!"
}
```

Should return a JWT token and user info.

---

## Next Steps

After environment variables are set:

1. ✅ Verify deployment logs show connection to staging Supabase
2. ✅ Test admin login
3. ✅ Deploy client app (update VITE_API_URL to Railway URL)
4. ✅ Test full application flow
5. ✅ Set up custom domain (optional)
