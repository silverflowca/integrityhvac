/**
 * Debug endpoint to check environment configuration
 * ONLY USE IN STAGING/DEVELOPMENT - REMOVE IN PRODUCTION
 */

import express from 'express';

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

export default router;
