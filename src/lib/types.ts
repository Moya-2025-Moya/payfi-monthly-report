// ============================================================
// StablePulse V2 — Core TypeScript Types
// Simplified: events > atomic facts, timeliness > accuracy
// ============================================================

// ─── Entity Management ───

export type EntityCategory =
  | 'issuer'
  | 'payments'
  | 'institutional'
  | 'regulatory'
  | 'infrastructure'
  | 'enterprise'
  | 'rwa'
  | 'defi'

export interface WatchlistEntity {
  id: string
  name: string
  aliases: string[]
  category: EntityCategory
  active: boolean
  metadata: Record<string, unknown> // sec_cik, ticker, blog_rss, website, etc.
  created_at: string
  updated_at: string
}

// ─── Raw Data Layer ───

export type SourceType = 'rss' | 'twitter' | 'regulatory' | 'sec' | 'brave_search'

export interface RawItem {
  id: string
  source_type: SourceType
  source_name: string
  source_url: string
  title: string | null
  content: string | null
  full_text: string | null
  language: string
  published_at: string
  metadata: Record<string, unknown>
  processed: boolean
  created_at: string
}

// Twitter-specific metadata shape
export interface TwitterMetadata {
  author_handle: string
  author_name: string
  author_category?: string
  likes: number
  retweets: number
  replies: number
}

// Regulatory-specific metadata shape
export interface RegulatoryMetadata {
  region: string
  agency: string
  doc_type: string // bill, enforcement, guidance, license, announcement
}

// ─── Event Layer (Core Output) ───

export type EventCategory =
  | 'regulatory'
  | 'partnership'
  | 'product'
  | 'funding'
  | 'market'
  | 'policy'
  | 'technical'
  | 'other'

export type Importance = 1 | 2 | 3 | 4 // 1=critical, 2=high, 3=medium, 4=low

export type V1Status = 'matched' | 'partial' | 'no_match'

export interface Event {
  id: string
  title_zh: string
  title_en: string | null
  summary_zh: string
  summary_en: string | null
  category: EventCategory
  importance: Importance
  entity_names: string[]
  source_urls: string[]
  source_count: number
  v1_status: V1Status | null
  published_at: string
  pushed_to_tg: boolean
  included_in_daily: boolean
  included_in_weekly: boolean
  created_at: string
}

// AI extraction output (before DB insert)
export interface ExtractedEvent {
  title_zh: string
  title_en: string
  summary_zh: string
  summary_en: string
  category: EventCategory
  importance: Importance
  entity_names: string[]
  raw_item_ids: string[] // which raw_items contributed
  source_urls: string[]
  published_at: string
}

// ─── Weekly Trends ───

export interface WeeklyTrend {
  title_zh: string
  title_en: string
  description_zh: string
  description_en: string
  direction: 'heating' | 'cooling' | 'stable' | 'emerging'
  event_ids: string[]
}

export interface WeeklySummary {
  id: string
  week_number: string
  summary_zh: string
  summary_en: string | null
  trends: WeeklyTrend[]
  stats: WeeklyStats
  pushed_to_tg: boolean
  created_at: string
}

export interface WeeklyStats {
  event_count: number
  category_breakdown: Record<EventCategory, number>
  entity_mentions: Record<string, number>
}

// ─── Pipeline ───

export type PipelineType = 'collect' | 'process' | 'daily_push' | 'weekly_summary'
export type PipelineStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export interface PipelineRun {
  id: string
  pipeline_type: PipelineType
  status: PipelineStatus
  started_at: string
  completed_at: string | null
  logs: PipelineLog[]
  stats: PipelineStats | null
  error: string | null
}

export interface PipelineLog {
  timestamp: string
  level: 'info' | 'success' | 'error' | 'progress'
  message: string
}

export interface PipelineStats {
  raw_items_collected?: number
  raw_items_processed?: number
  events_extracted?: number
  events_merged?: number
  events_pushed?: number
  v1_checked?: number
  v1_matched?: number
  v1_failed?: number
  duration_ms?: number
}

// ─── Collector Types ───

export interface CollectorResult {
  source: string
  status: 'ok' | 'error'
  count: number
  error?: string
}

export interface CollectionResult {
  results: Record<string, CollectorResult>
  duration_ms: number
}

// ─── V1 Source Traceback ───

export interface V1Result {
  status: V1Status
  evidence_quote: string | null
  match_score: number // 0-100
}

// ─── Telegram Bot Commands ───

export interface TelegramCommand {
  command: 'watch' | 'unwatch' | 'list'
  entity_name?: string
  chat_id: number
  user_id: number
}
