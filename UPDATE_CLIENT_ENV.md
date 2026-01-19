# Update Client Environment Files with Anon Keys

## Problem

The client needs **anon keys** (public keys) to connect to Supabase, but the server `.env` files only have **service role keys** (private keys).

## Get the Anon Keys

### For Staging (mladgojbfyofgauiylxw)

1. Open: https://supabase.com/dashboard/project/mladgojbfyofgauiylxw/settings/api
2. Scroll to "Project API keys"
3. Copy the **"anon"** key (the one labeled "anon public")
4. Update `client/.env.staging`:
   ```env
   VITE_SUPABASE_ANON_KEY=<paste here>
   ```

### For Production (dahiedmlyahahprojpbi)

1. Open: https://supabase.com/dashboard/project/dahiedmlyahahprojpbi/settings/api
2. Scroll to "Project API keys"
3. Copy the **"anon"** key (the one labeled "anon public")
4. Update `client/.env.production`:
   ```env
   VITE_SUPABASE_ANON_KEY=<paste here>
   ```

## Important: Two Different Keys!

Your server and client use DIFFERENT keys:

| Location | Key Type | Purpose | Where Used |
|----------|----------|---------|------------|
| **Server** | `service_role` | Private, bypasses RLS | server/.env.* |
| **Client** | `anon` | Public, respects RLS | client/.env.* |

**The service_role key in server/.env files CANNOT be used in the client!**

## Current Status

✅ Server configured correctly with service_role keys
❌ Client missing anon keys

Files to update:
- `client/.env.staging` - Add VITE_SUPABASE_ANON_KEY
- `client/.env.production` - Add VITE_SUPABASE_ANON_KEY

## After Updating

Once you paste the real anon keys:

```bash
git add client/.env.staging client/.env.production
git commit -m "Add Supabase anon keys for client"
git push
```

Railway will rebuild the client with the correct Supabase configuration.

## How to Verify

After deployment, check the browser console. You should see:

```
╔════════════════════════════════════════════════════╗
║         SUPABASE CLIENT CONFIGURATION              ║
╠════════════════════════════════════════════════════╣
║ Environment: CLOUD (dahiedmlyahahprojpbi)          ║
║ URL: https://dahiedmlyahahprojpbi.supabase.co     ║
║ Anon Key: ✅ Set (eyJhbGciOiJIUzI1NiIs...)         ║
╚════════════════════════════════════════════════════╝
```

NOT:
```
║ Environment: LOCAL                                  ║
║ URL: http://localhost:55321                        ║
```
