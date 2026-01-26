-- Workflow Execution Tracking Table
-- Created: 2026-01-25
-- Purpose: Provides idempotent execution and status tracking for n8n workflows

-- ============================================================================
-- Table: workflow_executions
-- Tracks n8n workflow executions for idempotency and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_executions (
  -- Primary key is the idempotency key (user-provided or generated)
  id TEXT PRIMARY KEY,

  -- Workflow identification
  workflow_id TEXT NOT NULL,
  workflow_name TEXT,

  -- User who triggered the execution
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Execution status
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),

  -- Result data (JSON for flexibility)
  result JSONB,
  error_message TEXT,

  -- Execution context
  parameters JSONB,
  actor TEXT CHECK (actor IN ('user', 'ai_assistant', 'system', 'webhook')),

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id
  ON workflow_executions(user_id);

-- Index for status queries (find running/failed workflows)
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status
  ON workflow_executions(status);

-- Index for workflow queries
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id
  ON workflow_executions(workflow_id);

-- Index for recent executions (descending for efficient recent queries)
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at
  ON workflow_executions(created_at DESC);

-- Composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_status
  ON workflow_executions(user_id, status);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own executions
CREATE POLICY "Users can view own executions"
  ON workflow_executions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own executions
CREATE POLICY "Users can insert own executions"
  ON workflow_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own executions
CREATE POLICY "Users can update own executions"
  ON workflow_executions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Service Role Access (for backend operations)
-- ============================================================================
GRANT ALL ON workflow_executions TO service_role;

-- ============================================================================
-- Auto-update trigger for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_workflow_execution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_executions_updated_at
  BEFORE UPDATE ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_execution_updated_at();

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON TABLE workflow_executions IS 'Tracks n8n workflow executions for idempotency and debugging';
COMMENT ON COLUMN workflow_executions.id IS 'Idempotency key - same key returns cached result instead of re-executing';
COMMENT ON COLUMN workflow_executions.workflow_id IS 'n8n workflow ID or identifier';
COMMENT ON COLUMN workflow_executions.workflow_name IS 'Human-readable workflow name for debugging';
COMMENT ON COLUMN workflow_executions.status IS 'pending=not started, running=in progress, completed=success, failed=error';
COMMENT ON COLUMN workflow_executions.result IS 'JSONB storage for workflow output data';
COMMENT ON COLUMN workflow_executions.parameters IS 'Input parameters used to trigger the workflow';
COMMENT ON COLUMN workflow_executions.actor IS 'Who triggered the execution: user, ai_assistant, system, webhook';
