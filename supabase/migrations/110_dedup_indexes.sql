-- Cross-day dedup lookups filter by category + published_at window.
-- The existing idx_events_published covers the time filter but forces a full
-- scan to apply the category predicate; this composite index makes the dedup
-- pool query O(log N) on large tables.
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_events_category_published
    ON events (category, published_at DESC);
END $$;
