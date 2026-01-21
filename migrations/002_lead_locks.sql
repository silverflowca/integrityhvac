-- ============================================================================
-- Lead Locks Table Migration
-- Version: 1.0.1
-- Purpose: Prevent multiple users from dialing the same lead simultaneously
-- ============================================================================

-- LEAD_LOCKS TABLE
-- Tracks which leads are currently being dialed by which user
CREATE TABLE IF NOT EXISTS integrityhvac.lead_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID UNIQUE NOT NULL REFERENCES integrityhvac.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES integrityhvac.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes')
);

-- Index for fast lookups by lead_id (already unique, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_lead_locks_lead_id ON integrityhvac.lead_locks(lead_id);

-- Index for finding expired locks during cleanup
CREATE INDEX IF NOT EXISTS idx_lead_locks_expires_at ON integrityhvac.lead_locks(expires_at);

-- Index for finding locks by user
CREATE INDEX IF NOT EXISTS idx_lead_locks_user_id ON integrityhvac.lead_locks(user_id);

-- Grant permissions
GRANT ALL ON integrityhvac.lead_locks TO postgres, service_role, authenticated;
GRANT SELECT ON integrityhvac.lead_locks TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║       LEAD LOCKS MIGRATION COMPLETE                        ║';
    RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║ Table created: lead_locks                                  ║';
    RAISE NOTICE '║ - Prevents duplicate dialing of same lead                  ║';
    RAISE NOTICE '║ - Locks auto-expire after 15 minutes                       ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
END $$;

SELECT 'Lead locks migration completed successfully!' as status;
