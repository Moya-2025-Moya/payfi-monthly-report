// ============================================================
// StablePulse — Core TypeScript Types
// Agent 0: 所有模块共享的类型定义
// ============================================================

// ─── 基础类型 ───

export type SourceType = 'news' | 'filing' | 'onchain' | 'product' | 'funding' | 'tweet' | 'regulatory'
export type SourceCredibility = 'official' | 'media' | 'social' | 'derived'
export type FactType = 'event' | 'metric' | 'quote' | 'relationship' | 'status_change'
export type Confidence = 'high' | 'medium' | 'low'
export type VerificationStatus = 'pending_verification' | 'verified' | 'partially_verified' | 'rejected'

export type EntityCategory =
  | 'stablecoin_issuer'
  | 'b2c_product'
  | 'b2b_infra'
  | 'tradfi'
  | 'public_company'
  | 'defi'
  | 'regulator'

export type Sector = 'issuance' | 'payments' | 'defi' | 'infrastructure' | 'regulatory' | 'capital_markets'
export type RelationshipType = 'investment' | 'partnership' | 'competition' | 'dependency' | 'acquisition' | 'issuance'
export type TwitterAuthorCategory = 'vc' | 'kol' | 'founder' | 'user'
export type CollectorName =
  | 'defillama' | 'free-crypto-news' | 'rss' | 'sec-edgar' | 'yahoo-finance'
  | 'defillama_raises' | 'news_extraction' | 'twitterapi_io'
  | 'github' | 'blog_rss' | 'congress' | 'eu_journal'
  // [ROADMAP] 后续集成
  | 'coingecko' | 'cryptorank'

// ─── Raw Data Layer (Module A 写入) ───

export interface RawOnchainMetric {
  id: string
  source: 'defillama' | 'coingecko'
  coin_id: string
  coin_symbol: string
  metric_name: string
  metric_value: number
  metric_unit: string
  chain?: string
  fetched_at: Date
  created_at: Date
}

export interface RawNews {
  id: string
  collector: 'free-crypto-news' | 'rss'
  source_name: string
  source_url: string
  title: string
  summary: string | null
  full_text: string | null
  published_at: Date
  tags: string[]
  language: string
  processed: boolean
  created_at: Date
}

export interface RawFiling {
  id: string
  company_cik: string
  company_name: string
  filing_type: string // '10-K' | '10-Q' | '8-K' | 'S-1' etc.
  filing_url: string
  filing_date: Date
  description: string | null
  full_text: string | null
  processed: boolean
  created_at: Date
}

export interface RawStockData {
  id: string
  ticker: string
  company_name: string
  price: number
  change_pct: number
  volume: number
  market_cap: number | null
  date: Date
  created_at: Date
}

export interface RawProductUpdate {
  id: string
  product_name: string
  source_type: 'blog' | 'github_release' | 'changelog'
  source_url: string
  title: string
  description: string | null
  version: string | null
  published_at: Date
  processed: boolean
  created_at: Date
}

export interface RawFunding {
  id: string
  collector: 'defillama_raises' | 'news_extraction' | 'cryptorank' /* ROADMAP */
  project_name: string
  source_url: string
  round: string | null
  amount: number | null
  amount_unit: string
  valuation: number | null
  investors: string[]
  sector: string | null
  announced_at: Date
  processed: boolean
  created_at: Date
}

export interface RawTweet {
  id: string
  author_handle: string
  author_name: string
  author_category: TwitterAuthorCategory
  source_url: string
  content: string
  likes: number
  retweets: number
  replies: number
  posted_at: Date
  processed: boolean
  created_at: Date
}

export interface RawRegulatory {
  id: string
  region: string
  agency: string
  source_url: string
  title: string
  description: string | null
  doc_type: string // 'bill' | 'enforcement' | 'guidance' | 'license' | 'announcement'
  published_at: Date
  processed: boolean
  created_at: Date
}

// ─── Atomic Fact Layer (Module B 写入) ───

export interface AtomicFact {
  id: string
  // 内容
  content_en: string
  content_zh: string | null
  // 分类
  fact_type: FactType
  tags: string[]
  // 来源
  source_id: string
  source_table: string // 'raw_news' | 'raw_filings' etc.
  source_type: SourceType
  source_url: string
  source_credibility: SourceCredibility
  // 指标 (metric类型)
  metric_name: string | null
  metric_value: number | null
  metric_unit: string | null
  metric_period: string | null
  metric_change: string | null
  // 验证
  verification_status: VerificationStatus
  confidence: Confidence | null
  confidence_reasons: string[]
  v1_result: V1Result | null
  v2_result: V2Result | null
  v3_result: V3Result | null
  v4_result: V4Result | null
  v5_result: V5Result | null
  // 时间
  fact_date: Date
  collected_at: Date
  week_number: string // '2026-W10'
  created_at: Date
  updated_at: Date
}

// ─── Verification Layer Types (V0-V6) ───

export interface V1Result {
  status: 'matched' | 'partial' | 'no_match' | 'source_unavailable'
  evidence_quote: string | null
  match_score: number // 0-100
}

export interface V2Result {
  source_count: number
  consistent_count: number
  cross_validation: 'consistent' | 'partially_consistent' | 'inconsistent' | 'single_source'
  is_minority: boolean
  majority_value: string | null
  // 信息源独立性
  independent_sources: boolean
  source_urls: string[]            // 参与交叉验证的精确URL列表
  source_independence_note: string | null // 独立性判断说明
  details: string | null
}

export interface V3Result {
  sanity: 'normal' | 'anomaly' | 'likely_error' | 'not_applicable'
  reason: string | null
  historical_reference: number | null
}

export interface V4Result {
  anchor_status: 'anchored' | 'deviation' | 'mismatch' | 'no_anchor_data' | 'not_applicable'
  claimed_value: number | null
  actual_value: number | null
  deviation_pct: number | null
}

export interface V5Result {
  temporal_status: 'consistent' | 'conflict' | 'unchecked'
  conflict_detail: string | null
}

export interface V6Result {
  confirmed: boolean
  confidence: number // 0-100
  reason: string
}

export interface Verdict {
  status: VerificationStatus
  confidence: Confidence | null
  reason: string
}

// B1 中间产物
export interface CandidateFact {
  content: string
  fact_type: FactType
  evidence_sentence: string
  tags: string[]
  metric_name?: string
  metric_value?: number
  metric_unit?: string
  metric_period?: string
  metric_change?: string
  // B1 Prompt2 自查结果
  self_check: 'supported' | 'partial' | 'unsupported'
}

// ─── Knowledge Graph Layer ───

export interface Entity {
  id: string
  name: string
  aliases: string[]
  category: EntityCategory
  description_en: string | null
  description_zh: string | null
  logo_url: string | null
  website: string | null
  created_at: Date
  updated_at: Date
}

export interface FactEntity {
  fact_id: string
  entity_id: string
  role: string | null // 'subject' | 'object' | 'mentioned'
}

export interface EntityRelationship {
  id: string
  entity_a_id: string
  entity_b_id: string
  relationship_type: RelationshipType
  description: string | null
  source_fact_id: string | null
  week_number: string
  created_at: Date
}

export interface Timeline {
  id: string
  name: string
  description: string | null
  entity_id: string | null // 主关联实体
  status: 'active' | 'completed' | 'stale'
  created_at: Date
  updated_at: Date
}

export interface TimelineFact {
  timeline_id: string
  fact_id: string
  order_index: number
  v6_result: V6Result | null
  attribution_status: 'confirmed' | 'uncertain' | 'rejected'
}

export interface SectorRecord {
  id: string
  name: Sector
  label_en: string
  label_zh: string
}

export interface FactSector {
  fact_id: string
  sector_id: string
}

export interface RegulatoryTracker {
  id: string
  name: string
  region: string
  status: string // 'proposed' | 'hearing' | 'committee' | 'floor_vote' | 'enacted' | 'enforcement'
  current_stage_date: Date | null
  entity_id: string | null
  created_at: Date
  updated_at: Date
}

// ─── Quality Layer ───

export interface FactContradiction {
  id: string
  fact_id_a: string
  fact_id_b: string
  contradiction_type: 'numerical' | 'textual' | 'temporal'
  difference_description: string
  status: 'unresolved' | 'resolved' | 'dismissed'
  resolved_note: string | null
  detected_at: Date
  resolved_at: Date | null
}

export interface BlindSpotReport {
  id: string
  entity_type: EntityCategory
  week_number: string
  report_data: BlindSpotData
  created_at: Date
}

export interface BlindSpotData {
  template_dimensions: string[]
  template_source_entity_id: string
  entities: {
    entity_id: string
    entity_name: string
    coverage: Record<string, 'covered' | 'sparse' | 'missing'>
  }[]
}

// ─── Collaboration Layer ───

export interface User {
  id: string
  email: string
  display_name: string
  role: 'admin' | 'member'
  created_at: Date
}

export interface Bookmark {
  id: string
  user_id: string
  fact_id: string
  label: string | null
  created_at: Date
}

export interface Note {
  id: string
  user_id: string
  fact_id: string | null
  entity_id: string | null
  timeline_id: string | null
  content: string
  created_at: Date
  updated_at: Date
}

export interface Comment {
  id: string
  user_id: string
  fact_id: string
  content: string
  parent_id: string | null
  created_at: Date
}

export interface TeamQuestion {
  id: string
  user_id: string
  question: string
  entity_id: string | null
  status: 'open' | 'partially_answered' | 'answered' | 'closed'
  week_number: string
  related_fact_ids: string[]
  created_at: Date
  updated_at: Date
}

export interface UserPreference {
  user_id: string
  key: string
  value: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  context_fact_ids: string[]
  created_at: Date
}

// ─── Sharing Layer ───

export interface SharedView {
  id: string
  token: string
  created_by: string
  query_params: Record<string, unknown>
  title: string | null
  expires_at: Date
  view_count: number
  created_at: Date
}

// ─── System Layer ───

export interface WeeklySnapshot {
  id: string
  week_number: string
  snapshot_data: {
    total_facts: number
    new_facts: number
    high_confidence: number
    medium_confidence: number
    low_confidence: number
    rejected: number
    new_entities: number
    active_entities: number
    new_contradictions: number
    resolved_contradictions: number
    blind_spot_changes: string[]
    top_density_anomalies: string[]
  }
  generated_at: Date
}

export interface PipelineRun {
  id: string
  pipeline_type: 'daily' | 'weekly'
  status: 'running' | 'completed' | 'failed'
  started_at: Date
  completed_at: Date | null
  stats: PipelineStats | null
  error: string | null
}

export interface PipelineStats {
  raw_items_processed: number
  candidates_extracted: number
  // V0 裁决统计
  verified_high: number
  verified_medium: number
  partially_verified_low: number
  rejected: number
  rejection_reasons: Record<string, number>
  // 各验证员统计
  v1_matched: number
  v1_partial: number
  v1_no_match: number
  v1_unavailable: number
  v2_consistent: number
  v2_inconsistent: number
  v2_single_source: number
  v3_normal: number
  v3_anomaly: number
  v3_likely_error: number
  v4_anchored: number
  v4_deviation: number
  v4_mismatch: number
  v5_consistent: number
  v5_conflict: number
  entities_created: number
  timelines_updated: number
  contradictions_found: number
}

// ─── API/Frontend Helper Types ───

export type FeedView = 'aggregate' | 'timeline'

export interface FactFilters {
  tags?: string[]
  entities?: string[]
  sectors?: Sector[]
  fact_type?: FactType[]
  confidence?: Confidence[]
  week_number?: string
  from_date?: string
  to_date?: string
  search?: string
}

export interface DiffResult {
  week_a: string
  week_b: string
  new_entities: { id: string; name: string }[]
  status_changes: { entity_name: string; from: string; to: string }[]
  relationship_changes: { type: 'added' | 'removed'; description: string }[]
  metric_changes: { entity_name: string; metric: string; old_value: number; new_value: number; change_pct: number }[]
  timeline_updates: { timeline_name: string; new_nodes: number }[]
  fact_count: { week_a: number; week_b: number; change_pct: number }
  entity_count: { week_a: number; week_b: number }
  new_contradictions: number
  resolved_contradictions: number
  blind_spot_changes: { newly_covered: string[]; new_gaps: string[] }
}

export interface DensityAnomaly {
  topic: string
  topic_type: 'tag' | 'entity' | 'sector'
  current_count: number
  previous_count: number
  avg_count: number
  multiple: number // 当前 / 历史均值
  trend: 'spike' | 'sustained_high' | 'declining' | 'normal'
  related_entities: string[]
}
