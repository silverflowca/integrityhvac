/**
 * Debug endpoint to check environment configuration
 * ONLY USE IN STAGING/DEVELOPMENT - REMOVE IN PRODUCTION
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

/**
 * GET /api/debug/env
 * Shows which environment variables are set (without exposing values)
 */
router.get('/env', (req, res) => {
    const envCheck = {
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV || 'not set',
            RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'not set',
            PORT: process.env.PORT || 'not set'
        },
        supabase: {
            SUPABASE_URL: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 30)}...` : '❌ NOT SET',
            SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✅ Set (length: ' + process.env.SUPABASE_SERVICE_KEY.length + ')' : '❌ NOT SET'
        },
        jwt: {
            JWT_SECRET: process.env.JWT_SECRET ? '✅ Set (length: ' + process.env.JWT_SECRET.length + ')' : '❌ NOT SET'
        },
        allEnvKeys: Object.keys(process.env).filter(k =>
            k.includes('SUPABASE') ||
            k.includes('JWT') ||
            k.includes('NODE_ENV') ||
            k.includes('RAILWAY')
        )
    };

    res.json(envCheck);
});

/**
 * GET /api/debug/health
 * Basic health check
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
    });
});

/**
 * GET /api/debug/schema
 * Tests Supabase schema access - helps diagnose "Invalid schema" errors
 */
router.get('/schema', async (req, res) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    const results = {
        timestamp: new Date().toISOString(),
        supabaseUrl: SUPABASE_URL ? SUPABASE_URL.substring(0, 40) + '...' : 'NOT SET',
        tests: {}
    };

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        results.error = 'Missing Supabase configuration';
        return res.json(results);
    }

    // Test 1: Query public schema (should always work)
    try {
        const publicClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
        const { data, error } = await publicClient.from('users').select('count').limit(1);
        results.tests.publicSchema = error ? { error: error.message, code: error.code } : { success: true, data };
    } catch (e) {
        results.tests.publicSchema = { error: e.message };
    }

    // Test 2: Query integrityhvac schema
    try {
        const schemaClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
            db: { schema: 'integrityhvac' }
        });
        const { data, error } = await schemaClient.from('users').select('count').limit(1);
        results.tests.integrityhvacSchema = error ? { error: error.message, code: error.code } : { success: true, data };
    } catch (e) {
        results.tests.integrityhvacSchema = { error: e.message };
    }

    // Test 3: Direct RPC call to check exposed schemas
    try {
        const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
        // Query pg_namespace to see available schemas
        const { data, error } = await client.rpc('get_schemas');
        results.tests.rpcSchemas = error ? { error: error.message, hint: 'RPC function may not exist' } : { data };
    } catch (e) {
        results.tests.rpcSchemas = { error: e.message, hint: 'Expected to fail if RPC not defined' };
    }

    // Recommendation based on results
    if (results.tests.integrityhvacSchema?.error?.includes('Invalid schema')) {
        results.recommendation = 'The integrityhvac schema is NOT exposed in Supabase API settings. ' +
            'Go to Supabase Dashboard > Settings > API > Exposed schemas and add "integrityhvac"';
    }

    res.json(results);
});

export default router;
