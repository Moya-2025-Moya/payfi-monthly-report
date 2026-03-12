-- V7: Narrative thread persistence for cross-week tracking
-- Enables the "叙事连续性" differentiator

-- Main thread table: tracks a narrative across weeks
CREATE TABLE IF NOT EXISTS narrative_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,                              -- e.g. "Circle IPO 进程"
  slug TEXT NOT NULL UNIQUE,                        -- URL-safe identifier
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'resolved')),
  first_seen_week TEXT NOT NULL,                    -- e.g. "2026-W08"
  last_updated_week TEXT NOT NULL,                  -- e.g. "2026-W11"
  total_weeks INTEGER NOT NULL DEFAULT 1,           -- how many weeks this has been tracked
  key_entities TEXT[] NOT NULL DEFAULT '{}',         -- related entity names
  tags TEXT[] NOT NULL DEFAULT '{}',                -- for matching with facts
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_narrative_threads_status ON narrative_threads (status);
CREATE INDEX idx_narrative_threads_last_week ON narrative_threads (last_updated_week);

-- Per-week entries for each thread
CREATE TABLE IF NOT EXISTS narrative_thread_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES narrative_threads(id) ON DELETE CASCADE,
  week_number TEXT NOT NULL,                        -- e.g. "2026-W11"
  summary TEXT NOT NULL,                            -- what happened this week
  key_developments TEXT[] NOT NULL DEFAULT '{}',     -- bullet points
  next_week_watch TEXT,                             -- what to watch next week
  fact_ids UUID[] NOT NULL DEFAULT '{}',            -- linked atomic_facts
  node_count INTEGER NOT NULL DEFAULT 0,            -- number of timeline nodes this week
  significance TEXT NOT NULL DEFAULT 'medium' CHECK (significance IN ('high', 'medium', 'low')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(thread_id, week_number)
);

CREATE INDEX idx_thread_entries_week ON narrative_thread_entries (week_number);
CREATE INDEX idx_thread_entries_thread ON narrative_thread_entries (thread_id);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER narrative_threads_updated_at
  BEFORE UPDATE ON narrative_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
