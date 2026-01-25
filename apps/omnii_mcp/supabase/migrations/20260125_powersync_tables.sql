-- PowerSync-compatible tables for mobile offline sync
-- Created: 2026-01-25
-- Purpose: Cache graph data in PostgreSQL for PowerSync to sync to mobile SQLite

-- ============================================================================
-- Function: Auto-update updated_at timestamp on row changes
-- Required for PowerSync change tracking
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Table: sync_entities
-- Stores graph entities (tasks, emails, contacts, concepts) for mobile sync
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'email', 'contact', 'concept', 'entity')),
  name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Users can only access their own entities
ALTER TABLE sync_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entities"
  ON sync_entities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entities"
  ON sync_entities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entities"
  ON sync_entities FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entities"
  ON sync_entities FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for efficient PowerSync queries
CREATE INDEX IF NOT EXISTS idx_sync_entities_user_updated
  ON sync_entities(user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_sync_entities_type
  ON sync_entities(entity_type);

CREATE INDEX IF NOT EXISTS idx_sync_entities_source_id
  ON sync_entities(source_id);

-- Auto-update trigger
CREATE TRIGGER update_sync_entities_updated_at
  BEFORE UPDATE ON sync_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Table: sync_events
-- Stores calendar events for timeline/schedule views
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  google_event_id TEXT,
  attendees JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint for deduplication
  CONSTRAINT sync_events_google_event_unique UNIQUE (user_id, google_event_id)
);

-- RLS: Users can only access their own events
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
  ON sync_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
  ON sync_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON sync_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
  ON sync_events FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for efficient PowerSync queries
CREATE INDEX IF NOT EXISTS idx_sync_events_user_updated
  ON sync_events(user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_sync_events_time_range
  ON sync_events(user_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_sync_events_google_id
  ON sync_events(google_event_id);

-- Auto-update trigger
CREATE TRIGGER update_sync_events_updated_at
  BEFORE UPDATE ON sync_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Table: sync_relationships
-- Stores entity relationships for graph navigation on mobile
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_entity_id UUID NOT NULL REFERENCES sync_entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES sync_entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate relationships
  CONSTRAINT sync_relationships_unique UNIQUE (from_entity_id, to_entity_id, relationship_type)
);

-- RLS: Users can only access their own relationships
ALTER TABLE sync_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own relationships"
  ON sync_relationships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own relationships"
  ON sync_relationships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own relationships"
  ON sync_relationships FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own relationships"
  ON sync_relationships FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for efficient PowerSync queries
CREATE INDEX IF NOT EXISTS idx_sync_relationships_user_updated
  ON sync_relationships(user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_sync_relationships_from
  ON sync_relationships(from_entity_id);

CREATE INDEX IF NOT EXISTS idx_sync_relationships_to
  ON sync_relationships(to_entity_id);

CREATE INDEX IF NOT EXISTS idx_sync_relationships_type
  ON sync_relationships(relationship_type);

-- Auto-update trigger
CREATE TRIGGER update_sync_relationships_updated_at
  BEFORE UPDATE ON sync_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Service role access for backend operations
-- Allows background jobs to sync data without RLS restrictions
-- ============================================================================
GRANT ALL ON sync_entities TO service_role;
GRANT ALL ON sync_events TO service_role;
GRANT ALL ON sync_relationships TO service_role;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE sync_entities IS 'PowerSync-compatible table for syncing graph entities to mobile';
COMMENT ON TABLE sync_events IS 'PowerSync-compatible table for syncing calendar events to mobile';
COMMENT ON TABLE sync_relationships IS 'PowerSync-compatible table for syncing entity relationships to mobile';

COMMENT ON COLUMN sync_entities.source_id IS 'Original ID from source system (Neo4j, Google) for deduplication';
COMMENT ON COLUMN sync_entities.properties IS 'Flexible JSONB storage for entity-specific attributes';
COMMENT ON COLUMN sync_events.google_event_id IS 'Original Google Calendar event ID for deduplication';
COMMENT ON COLUMN sync_relationships.relationship_type IS 'Semantic relationship type (ATTENDED, SENT_BY, MENTIONS, etc.)';
