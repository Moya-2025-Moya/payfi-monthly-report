-- V12: pgvector embedding support for Context Engine
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add embedding column to atomic_facts
ALTER TABLE atomic_facts
ADD COLUMN IF NOT EXISTS embedding vector(512);

-- Step 3: Create reference_events table (migrated from .ts file)
CREATE TABLE IF NOT EXISTS reference_events (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  type TEXT NOT NULL,
  milestones JSONB NOT NULL DEFAULT '[]',
  metrics JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  embedding vector(512),
  auto_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 4: Create vector similarity search function
CREATE OR REPLACE FUNCTION match_facts(
  query_embedding vector(512),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_before_date text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content_zh text,
  content_en text,
  fact_date timestamptz,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    af.id,
    af.content_zh,
    af.content_en,
    af.fact_date,
    af.tags,
    1 - (af.embedding <=> query_embedding) as similarity
  FROM atomic_facts af
  WHERE
    af.embedding IS NOT NULL
    AND af.verification_status IN ('verified', 'partially_verified')
    AND (filter_before_date IS NULL OR af.fact_date::text < filter_before_date)
    AND 1 - (af.embedding <=> query_embedding) > match_threshold
  ORDER BY af.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 5: Create index for vector search (IVFFlat — good for < 1M rows)
-- Note: This requires at least ~100 rows with embeddings to build.
-- Run this AFTER you have some embeddings populated:
-- CREATE INDEX idx_atomic_facts_embedding ON atomic_facts
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Step 6: Create similar function for reference_events
CREATE OR REPLACE FUNCTION match_reference_events(
  query_embedding vector(512),
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id text,
  entity text,
  type text,
  milestones jsonb,
  metrics jsonb,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.entity,
    re.type,
    re.milestones,
    re.metrics,
    re.tags,
    1 - (re.embedding <=> query_embedding) as similarity
  FROM reference_events re
  WHERE
    re.embedding IS NOT NULL
    AND 1 - (re.embedding <=> query_embedding) > match_threshold
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 7: Trigger for updated_at on reference_events
CREATE OR REPLACE TRIGGER reference_events_updated_at
  BEFORE UPDATE ON reference_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
