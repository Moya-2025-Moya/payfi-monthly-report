-- Fix: voyage-3-lite outputs 512 dimensions, not 1024
-- Run this in Supabase SQL Editor to fix the column types

-- Drop existing functions first (they reference the old type)
DROP FUNCTION IF EXISTS match_facts;
DROP FUNCTION IF EXISTS match_reference_events;

-- Fix atomic_facts embedding column
ALTER TABLE atomic_facts DROP COLUMN IF EXISTS embedding;
ALTER TABLE atomic_facts ADD COLUMN embedding vector(512);

-- Fix reference_events embedding column
ALTER TABLE reference_events DROP COLUMN IF EXISTS embedding;
ALTER TABLE reference_events ADD COLUMN embedding vector(512);

-- Recreate match_facts with correct dimension
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

-- Recreate match_reference_events with correct dimension
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
