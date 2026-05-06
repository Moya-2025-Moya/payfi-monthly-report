-- pgvector + HNSW index for cross-day dedup.
--
-- Replaces the O(N×M) brute-force scan over the past 7 days of events with
-- top-K nearest-neighbor retrieval (K≈10). Voyage 3.5-lite outputs 1024-dim
-- embeddings; HNSW gives O(log N) lookups, so the merge step stays fast as
-- the events table grows.
--
-- The vector column is nullable: events created before this migration have
-- no embedding and are skipped by the RPC's `WHERE title_embedding IS NOT
-- NULL` filter. Backfill via /api/admin/backfill-embeddings when ready.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE events ADD COLUMN IF NOT EXISTS title_embedding vector(1024);

DO $$ BEGIN
  -- Partial index: only embedded rows participate in the ANN search. Cuts
  -- index size and lets the backfill happen incrementally without breaking
  -- the index.
  CREATE INDEX IF NOT EXISTS idx_events_title_embedding_hnsw
    ON events USING hnsw (title_embedding vector_cosine_ops)
    WHERE title_embedding IS NOT NULL;
END $$;

-- Top-K candidate retrieval for cross-day dedup. Same-category constraint
-- preserves the existing behaviour (cross-category merging is almost always
-- wrong, per event-merger comments). Returns cosine similarity in [0, 1] so
-- the caller can apply its own confidence threshold.
CREATE OR REPLACE FUNCTION find_similar_events(
  query_embedding vector(1024),
  query_category text,
  query_published_after timestamptz,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title_zh text,
  title_en text,
  entity_names text[],
  category text,
  source_urls text[],
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT id, title_zh, title_en, entity_names, category, source_urls,
         1 - (title_embedding <=> query_embedding) AS similarity
  FROM events
  WHERE category = query_category
    AND published_at >= query_published_after
    AND title_embedding IS NOT NULL
  ORDER BY title_embedding <=> query_embedding
  LIMIT match_count;
$$;
