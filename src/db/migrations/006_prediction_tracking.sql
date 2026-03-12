-- V7: Prediction tracking for narrative follow-up nodes
-- Enables "关注标记 + 下周自动回顾" feature

CREATE TABLE IF NOT EXISTS narrative_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  narrative_topic TEXT NOT NULL,                      -- which narrative this belongs to
  week_number TEXT NOT NULL,                          -- week when prediction was made
  title TEXT NOT NULL,                                -- prediction title
  description TEXT,                                   -- prediction detail
  watched BOOLEAN NOT NULL DEFAULT false,             -- user marked as "关注"
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'invalidated', 'ongoing')),
  review_note TEXT,                                   -- auto-generated review from next week
  reviewed_week TEXT,                                 -- which week the review happened
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_predictions_watched ON narrative_predictions (watched) WHERE watched = true;
CREATE INDEX idx_predictions_week ON narrative_predictions (week_number);
CREATE INDEX idx_predictions_status ON narrative_predictions (status);

CREATE OR REPLACE TRIGGER narrative_predictions_updated_at
  BEFORE UPDATE ON narrative_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
