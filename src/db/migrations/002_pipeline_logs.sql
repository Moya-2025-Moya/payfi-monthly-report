-- Add logs persistence to pipeline_runs

-- Expand pipeline_type to support all pipeline types
ALTER TABLE pipeline_runs DROP CONSTRAINT IF EXISTS pipeline_runs_pipeline_type_check;
ALTER TABLE pipeline_runs ADD CONSTRAINT pipeline_runs_pipeline_type_check
  CHECK (pipeline_type IN ('daily', 'weekly', 'collect', 'process', 'twitter', 'snapshot'));

-- Add logs column (JSONB array of log entries)
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::jsonb;
