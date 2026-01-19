# Get Supabase Anon Keys

The client `.env.production` and `.env.staging` files need the **anon key** (public key), NOT the service role key.

## How to Get Anon Keys

### For Staging (mladgojbfyofgauiylxw)

1. Go to: https://supabase.com/dashboard/project/mladgojbfyofgauiylxw/settings/api
2. Under "Project API keys" section
3. Copy the **anon** key (labeled "anon public")
4. Paste it into `client/.env.staging` as `VITE_SUPABASE_ANON_KEY`

### For Production (dahiedmlyahahprojpbi)

1. Go to: https://supabase.com/dashboard/project/dahiedmlyahahprojpbi/settings/api
2. Under "Project API keys" section
3. Copy the **anon** key (labeled "anon public")
4. Paste it into `client/.env.production` as `VITE_SUPABASE_ANON_KEY`

## Important Notes

- **anon key** = Public key, safe to use in client-side code
- **service_role key** = Private key, ONLY for server-side use
- The anon key is already in the placeholder, but you need to replace it with the real one

## Current Files to Update

### client/.env.staging
```env
VITE_SUPABASE_URL=https://mladgojbfyofgauiylxw.supabase.co
VITE_SUPABASE_ANON_KEY=<GET_FROM_DASHBOARD>
```

### client/.env.production
```env
VITE_SUPABASE_URL=https://dahiedmlyahahprojpbi.supabase.co
VITE_SUPABASE_ANON_KEY=<GET_FROM_DASHBOARD>
```

## After Getting Keys

1. Update the `.env.production` and `.env.staging` files
2. Rebuild the client:
   ```bash
   cd client
   npm run build
   ```
3. Redeploy to Railway

The Dockerfile builds the client with production environment variables automatically.
