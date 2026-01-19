import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

// Create a separate Supabase client for auth verification
// This one doesn't specify schema so it can verify auth tokens properly
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Create client with integrityhvac schema for database queries
const supabaseDb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    db: {
        schema: 'integrityhvac'
    }
});

/**
 * Middleware to authenticate Supabase JWT tokens
 * Verifies the token using Supabase Auth and attaches user to req.user
 */
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ success: false, error: 'Access token required' });
        }

        console.log('[Auth] Verifying token...');

        // Try to verify with Supabase Auth
        const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

        if (error) {
            console.log('[Auth] Supabase auth error:', error.message);
        }

        if (!error && user) {
            console.log('[Auth] Supabase token valid for user:', user.id);

            // Fetch full user profile from our users table
            const { data: profile, error: profileError } = await supabaseDb
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.log('[Auth] Profile lookup error:', profileError.message);
                // If user doesn't exist in our DB, create them
                if (profileError.code === 'PGRST116') {
                    const { data: newProfile, error: createError } = await supabaseDb
                        .from('users')
                        .insert({
                            id: user.id,
                            email: user.email,
                            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                            password_hash: '', // Managed by Supabase Auth
                            role: 'user'
                        })
                        .select('*')
                        .single();

                    if (!createError && newProfile) {
                        req.user = newProfile;
                        return next();
                    }
                }
            }

            // Use profile if found, otherwise use Supabase user with default role
            req.user = profile || { ...user, role: 'user', name: user.email?.split('@')[0] };
            return next();
        }

        // Fallback: Try to verify as custom JWT
        if (JWT_SECRET) {
            try {
                console.log('[Auth] Trying custom JWT verification...');
                const decoded = jwt.verify(token, JWT_SECRET);

                // Fetch user from database
                const { data: dbUser, error: dbError } = await supabaseDb
                    .from('users')
                    .select('*')
                    .eq('id', decoded.userId || decoded.id || decoded.sub)
                    .single();

                if (dbError || !dbUser) {
                    console.log('[Auth] Custom JWT user not found:', dbError?.message);
                    return res.status(403).json({ success: false, error: 'User not found' });
                }

                console.log('[Auth] Custom JWT valid for user:', dbUser.id);
                req.user = dbUser;
                return next();
            } catch (jwtError) {
                console.log('[Auth] Custom JWT verification failed:', jwtError.message);
            }
        }

        return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    } catch (error) {
        console.error('[Auth] Middleware error:', error);
        return res.status(500).json({ success: false, error: 'Authentication failed' });
    }
};
