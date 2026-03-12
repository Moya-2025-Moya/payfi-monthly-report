-- ============================================================
-- StablePulse — Database Schema
-- Agent 0: Supabase PostgreSQL
-- ============================================================

-- 启用必要扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 模糊文本搜索

-- ════════════════════════════════════════
-- 原始数据层 (Module A 写入)
-- ════════════════════════════════════════

CREATE TABLE raw_onchain_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('defillama', 'coingecko')),
  coin_id TEXT NOT NULL,
  coin_symbol TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metric_unit TEXT NOT NULL DEFAULT 'USD',
  chain TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_onchain_coin_metric ON raw_onchain_metrics (coin_id, metric_name, fetched_at DESC);
CREATE INDEX idx_onchain_source ON raw_onchain_metrics (source);

CREATE TABLE raw_news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collector TEXT NOT NULL CHECK (collector IN ('free-crypto-news', 'rss')),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  full_text TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  tags TEXT[] DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'en',
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_news_source_url ON raw_news (source_url);
CREATE INDEX idx_news_processed ON raw_news (processed) WHERE processed = FALSE;
CREATE INDEX idx_news_published ON raw_news (published_at DESC);

CREATE TABLE raw_filings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_cik TEXT NOT NULL,
  company_name TEXT NOT NULL,
  filing_type TEXT NOT NULL,
  filing_url TEXT NOT NULL,
  filing_date DATE NOT NULL,
  description TEXT,
  full_text TEXT,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_filings_url ON raw_filings (filing_url);
CREATE INDEX idx_filings_processed ON raw_filings (processed) WHERE processed = FALSE;

CREATE TABLE raw_stock_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  change_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume BIGINT NOT NULL DEFAULT 0,
  market_cap DOUBLE PRECISION,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_stock_ticker_date ON raw_stock_data (ticker, date);

CREATE TABLE raw_product_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('blog', 'github_release', 'changelog')),
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  full_text TEXT,
  version TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_product_url ON raw_product_updates (source_url);
CREATE INDEX idx_product_processed ON raw_product_updates (processed) WHERE processed = FALSE;

CREATE TABLE raw_funding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collector TEXT NOT NULL CHECK (collector IN ('defillama_raises', 'cryptorank', 'news_extraction')),
  project_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  round TEXT,
  amount DOUBLE PRECISION,
  amount_unit TEXT NOT NULL DEFAULT 'USD',
  valuation DOUBLE PRECISION,
  investors TEXT[] DEFAULT '{}',
  sector TEXT,
  announced_at DATE NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_funding_dedup ON raw_funding (project_name, round, announced_at);
CREATE INDEX idx_funding_processed ON raw_funding (processed) WHERE processed = FALSE;
CREATE INDEX idx_funding_project ON raw_funding (project_name);

CREATE TABLE raw_tweets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_handle TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_category TEXT NOT NULL CHECK (author_category IN ('vc', 'kol', 'founder', 'user')),
  source_url TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INT NOT NULL DEFAULT 0,
  retweets INT NOT NULL DEFAULT 0,
  replies INT NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_tweets_url ON raw_tweets (source_url);
CREATE INDEX idx_tweets_processed ON raw_tweets (processed) WHERE processed = FALSE;
CREATE INDEX idx_tweets_author ON raw_tweets (author_handle);

CREATE TABLE raw_regulatory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region TEXT NOT NULL,
  agency TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  full_text TEXT,
  doc_type TEXT NOT NULL, -- 'bill' | 'enforcement' | 'guidance' | 'license' | 'announcement'
  published_at TIMESTAMPTZ NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_regulatory_url ON raw_regulatory (source_url);
CREATE INDEX idx_regulatory_processed ON raw_regulatory (processed) WHERE processed = FALSE;

-- ════════════════════════════════════════
-- 原子事实层 (Module B 写入) ⭐
-- ════════════════════════════════════════

CREATE TABLE atomic_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 内容
  content_en TEXT NOT NULL,
  content_zh TEXT,
  -- 分类
  fact_type TEXT NOT NULL CHECK (fact_type IN ('event', 'metric', 'quote', 'relationship', 'status_change')),
  objectivity TEXT NOT NULL DEFAULT 'fact' CHECK (objectivity IN ('fact', 'opinion', 'analysis')),
  speaker TEXT,
  tags TEXT[] DEFAULT '{}',
  -- 来源
  source_id UUID NOT NULL,
  source_table TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('news', 'filing', 'onchain', 'product', 'funding', 'tweet', 'regulatory')),
  source_url TEXT NOT NULL,
  source_credibility TEXT NOT NULL CHECK (source_credibility IN ('official', 'media', 'social', 'derived')),
  -- 指标
  metric_name TEXT,
  metric_value DOUBLE PRECISION,
  metric_unit TEXT,
  metric_period TEXT,
  metric_change TEXT,
  -- 验证
  verification_status TEXT NOT NULL DEFAULT 'pending_verification'
    CHECK (verification_status IN ('pending_verification', 'verified', 'partially_verified', 'rejected')),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  confidence_reasons TEXT[] DEFAULT '{}',
  v1_result JSONB,
  v2_result JSONB,
  v3_result JSONB,
  v4_result JSONB,
  v5_result JSONB,
  -- 时间
  fact_date DATE NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  week_number TEXT NOT NULL, -- '2026-W10'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facts_status ON atomic_facts (verification_status);
CREATE INDEX idx_facts_confidence ON atomic_facts (confidence) WHERE verification_status != 'rejected';
CREATE INDEX idx_facts_week ON atomic_facts (week_number);
CREATE INDEX idx_facts_type ON atomic_facts (fact_type);
CREATE INDEX idx_facts_source_type ON atomic_facts (source_type);
CREATE INDEX idx_facts_date ON atomic_facts (fact_date DESC);
CREATE INDEX idx_facts_tags ON atomic_facts USING GIN (tags);
CREATE INDEX idx_facts_metric ON atomic_facts (metric_name) WHERE metric_name IS NOT NULL;
CREATE INDEX idx_facts_content_trgm ON atomic_facts USING GIN (content_en gin_trgm_ops);

-- ════════════════════════════════════════
-- 知识图谱层
-- ════════════════════════════════════════

CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN (
    'stablecoin_issuer', 'b2c_product', 'b2b_infra', 'tradfi', 'public_company', 'defi', 'regulator'
  )),
  description_en TEXT,
  description_zh TEXT,
  logo_url TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_entities_name ON entities (LOWER(name));
CREATE INDEX idx_entities_category ON entities (category);
CREATE INDEX idx_entities_aliases ON entities USING GIN (aliases);

CREATE TABLE fact_entities (
  fact_id UUID NOT NULL REFERENCES atomic_facts(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  role TEXT, -- 'subject' | 'object' | 'mentioned'
  PRIMARY KEY (fact_id, entity_id)
);

CREATE INDEX idx_fact_entities_entity ON fact_entities (entity_id);

CREATE TABLE entity_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_a_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  entity_b_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'investment', 'partnership', 'competition', 'dependency', 'acquisition', 'issuance'
  )),
  description TEXT,
  source_fact_id UUID REFERENCES atomic_facts(id) ON DELETE SET NULL,
  week_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relationships_a ON entity_relationships (entity_a_id);
CREATE INDEX idx_relationships_b ON entity_relationships (entity_b_id);

CREATE TABLE timelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stale')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timelines_entity ON timelines (entity_id);
CREATE INDEX idx_timelines_status ON timelines (status);

CREATE TABLE timeline_facts (
  timeline_id UUID NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
  fact_id UUID NOT NULL REFERENCES atomic_facts(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  v6_result JSONB,
  attribution_status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (attribution_status IN ('confirmed', 'uncertain', 'rejected')),
  PRIMARY KEY (timeline_id, fact_id)
);

CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  label_en TEXT NOT NULL,
  label_zh TEXT NOT NULL
);

CREATE TABLE fact_sectors (
  fact_id UUID NOT NULL REFERENCES atomic_facts(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  PRIMARY KEY (fact_id, sector_id)
);

CREATE TABLE regulatory_trackers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  status TEXT NOT NULL, -- 'proposed' | 'hearing' | 'committee' | 'floor_vote' | 'enacted' | 'enforcement'
  current_stage_date DATE,
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_regulatory_region ON regulatory_trackers (region);

-- ════════════════════════════════════════
-- 质量层
-- ════════════════════════════════════════

CREATE TABLE fact_contradictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fact_id_a UUID NOT NULL REFERENCES atomic_facts(id) ON DELETE CASCADE,
  fact_id_b UUID NOT NULL REFERENCES atomic_facts(id) ON DELETE CASCADE,
  contradiction_type TEXT NOT NULL CHECK (contradiction_type IN ('numerical', 'textual', 'temporal')),
  difference_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'resolved', 'dismissed')),
  resolved_note TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_contradictions_status ON fact_contradictions (status);

CREATE TABLE blind_spot_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  week_number TEXT NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_blind_spots_type_week ON blind_spot_reports (entity_type, week_number);

-- ════════════════════════════════════════
-- 协作层
-- ════════════════════════════════════════

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fact_id UUID NOT NULL REFERENCES atomic_facts(id) ON DELETE CASCADE,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, fact_id)
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fact_id UUID REFERENCES atomic_facts(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fact_id IS NOT NULL OR entity_id IS NOT NULL OR timeline_id IS NOT NULL)
);

CREATE INDEX idx_notes_user ON notes (user_id);
CREATE INDEX idx_notes_fact ON notes (fact_id) WHERE fact_id IS NOT NULL;
CREATE INDEX idx_notes_entity ON notes (entity_id) WHERE entity_id IS NOT NULL;

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fact_id UUID NOT NULL REFERENCES atomic_facts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_fact ON comments (fact_id);

CREATE TABLE team_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partially_answered', 'answered', 'closed')),
  week_number TEXT NOT NULL,
  related_fact_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_status ON team_questions (status);

CREATE TABLE user_preferences (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context_fact_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_user ON chat_history (user_id, created_at DESC);

-- ════════════════════════════════════════
-- 分享层
-- ════════════════════════════════════════

CREATE TABLE shared_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_params JSONB NOT NULL,
  title TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_shared_token ON shared_views (token);

-- ════════════════════════════════════════
-- 系统层
-- ════════════════════════════════════════

CREATE TABLE weekly_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number TEXT NOT NULL UNIQUE,
  snapshot_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pipeline_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_type TEXT NOT NULL CHECK (pipeline_type IN ('daily', 'weekly')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  stats JSONB,
  error TEXT
);

CREATE INDEX idx_pipeline_status ON pipeline_runs (status);
CREATE INDEX idx_pipeline_started ON pipeline_runs (started_at DESC);

-- ════════════════════════════════════════
-- 种子数据: Sectors
-- ════════════════════════════════════════

INSERT INTO sectors (name, label_en, label_zh) VALUES
  ('issuance', 'Issuance', '发行'),
  ('payments', 'Payments', '支付'),
  ('defi', 'DeFi', '去中心化金融'),
  ('infrastructure', 'Infrastructure', '基础设施'),
  ('regulatory', 'Regulatory', '监管'),
  ('capital_markets', 'Capital Markets', '资本市场');

-- ════════════════════════════════════════
-- 自动更新 updated_at 触发器
-- ════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atomic_facts_updated
  BEFORE UPDATE ON atomic_facts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_entities_updated
  BEFORE UPDATE ON entities FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_timelines_updated
  BEFORE UPDATE ON timelines FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_notes_updated
  BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_questions_updated
  BEFORE UPDATE ON team_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_regulatory_updated
  BEFORE UPDATE ON regulatory_trackers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
