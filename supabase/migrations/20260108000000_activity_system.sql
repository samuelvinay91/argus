-- Activity System for Live Session Tracking
-- Enables real-time visibility into test execution

-- ============================================
-- ACTIVITY LOGS (Real-time events)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,  -- Groups related activities
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'discovery', 'visual_test', 'test_run', 'quality_audit', 'global_test'
    )),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'started', 'step', 'screenshot', 'thinking', 'action',
        'error', 'completed', 'cancelled'
    )),
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    screenshot_url TEXT,  -- Base64 or URL for screenshots
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_time ON activity_logs(project_id, created_at DESC);

-- ============================================
-- LIVE SESSIONS (Active operation tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN (
        'discovery', 'visual_test', 'test_run', 'quality_audit', 'global_test'
    )),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
    current_step TEXT,
    total_steps INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    last_screenshot_url TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_project ON live_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_active ON live_sessions(status) WHERE status = 'active';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable all for authenticated users" ON activity_logs FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON live_sessions FOR ALL USING (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE live_sessions;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to clean up old activity logs (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM activity_logs
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to mark stale sessions as failed (older than 10 minutes and still active)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
    UPDATE live_sessions
    SET status = 'failed',
        completed_at = NOW()
    WHERE status = 'active'
    AND started_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- Done!
SELECT 'Activity system schema created successfully!' as message;
