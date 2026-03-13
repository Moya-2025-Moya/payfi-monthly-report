-- Add 'cancelled' to pipeline_runs status CHECK constraint
ALTER TABLE pipeline_runs DROP CONSTRAINT IF EXISTS pipeline_runs_status_check;
ALTER TABLE pipeline_runs ADD CONSTRAINT pipeline_runs_status_check
  CHECK (status IN ('running', 'completed', 'failed', 'cancelled'));
