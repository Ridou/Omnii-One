-- Sync State Table for Incremental Data Ingestion
--
-- Tracks sync tokens, history IDs, and timestamps for each user+source combination.
-- Enables delta updates instead of full refresh for Google service sync.

CREATE TYPE sync_source AS ENUM (
  'google_calendar',
  'google_tasks',
  'google_gmail',
  'google_contacts'
);

CREATE TYPE sync_status AS ENUM (
  'idle',
  'syncing',
  'error',
  'rate_limited'
);

CREATE TABLE IF NOT EXISTS sync_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source sync_source NOT NULL,

  -- Sync token fields (different services use different mechanisms)
  sync_token TEXT, -- Calendar, Contacts: syncToken from API response
  history_id TEXT, -- Gmail: historyId for incremental history fetch
  updated_min TIMESTAMPTZ, -- Tasks: updatedMin timestamp for filtering

  -- Tracking fields
  last_sync_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  status sync_status DEFAULT 'idle',
  error_message TEXT,
  items_synced INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one sync state per user per source
  UNIQUE(user_id, source)
);

-- Index for fast lookup by user
CREATE INDEX idx_sync_state_user_id ON sync_state(user_id);

-- Index for finding stale syncs (background job scheduling)
CREATE INDEX idx_sync_state_last_sync ON sync_state(last_sync_at);

-- Index for finding syncs by status (error recovery)
CREATE INDEX idx_sync_state_status ON sync_state(status);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sync_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_state_updated_at
  BEFORE UPDATE ON sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_state_timestamp();

-- Row Level Security
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sync state
CREATE POLICY "Users can view own sync state"
  ON sync_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync state"
  ON sync_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync state"
  ON sync_state FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can access all (for background jobs)
CREATE POLICY "Service role full access"
  ON sync_state FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE sync_state IS 'Tracks incremental sync state for Google service data ingestion';
COMMENT ON COLUMN sync_state.sync_token IS 'Calendar/Contacts: syncToken from API for delta updates';
COMMENT ON COLUMN sync_state.history_id IS 'Gmail: historyId for incremental history fetch';
COMMENT ON COLUMN sync_state.updated_min IS 'Tasks: updatedMin timestamp for filtering changed tasks';
