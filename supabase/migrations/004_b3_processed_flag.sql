-- Add b2_processed and b3_processed flags to atomic_facts
-- Tracks whether B2 (entity resolver) and B3 (timeline merger) have processed a fact.
--
-- B2 bug: when AI finds no entities, no fact_entities row is inserted.
--   → fact appears unprocessed on next run → AI called again needlessly.
-- B3 bug: when AI returns action='none' (standalone), no timeline_facts row inserted.
--   → same reprocessing problem.
--
-- Fix: mark b2_processed/b3_processed=true after each run regardless of outcome.

ALTER TABLE atomic_facts
  ADD COLUMN IF NOT EXISTS b2_processed boolean NOT NULL DEFAULT false;

ALTER TABLE atomic_facts
  ADD COLUMN IF NOT EXISTS b3_processed boolean NOT NULL DEFAULT false;
