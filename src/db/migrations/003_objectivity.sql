-- Add objectivity classification and speaker attribution to atomic_facts
ALTER TABLE atomic_facts ADD COLUMN IF NOT EXISTS objectivity TEXT NOT NULL DEFAULT 'fact'
  CHECK (objectivity IN ('fact', 'opinion', 'analysis'));
ALTER TABLE atomic_facts ADD COLUMN IF NOT EXISTS speaker TEXT;

CREATE INDEX IF NOT EXISTS idx_facts_objectivity ON atomic_facts (objectivity);
