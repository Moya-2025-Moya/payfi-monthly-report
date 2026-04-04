-- Add b3_processed flag to atomic_facts
-- Tracks whether B3 (timeline merger) has processed a fact, regardless of outcome.
-- Previously we used timeline_facts presence as a proxy, but standalone facts
-- (where AI returns action='none') never get a timeline_facts entry, causing them
-- to be reprocessed on every run.

ALTER TABLE atomic_facts
  ADD COLUMN IF NOT EXISTS b3_processed boolean NOT NULL DEFAULT false;
