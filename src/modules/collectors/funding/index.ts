// A4 Funding Collector
// Primary: extract funding events from already-collected news (news_extraction)
// Fallback: DeFiLlama raises API (free tier, may 429)

import { readFileSync } from 'fs'
import { join } from 'path'
import { SOURCES } from '@/config/sources'
import { WATCHLIST } from '@/config/watchlist'
import { supabaseAdmin } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import type { CollectorResult } from '@/modules/collectors'

// ─── Types ───────────────────────────────────────────────────

interface RawFunding {
  collector: 'defillama_raises' | 'news_extraction' | 'cryptorank'
  project_name: string
  source_url: string
  round: string | null
  amount: number | null
  amount_unit: string
  valuation: number | null
  investors: string[]
  sector: string | null
  announced_at: string
  processed: boolean
}

interface ExtractedFunding {
  project_name: string
  round: string | null
  amount: number | null
  investors: string[]
  sector: string | null
  announced_at: string
}

// ─── Prompt ──────────────────────────────────────────────────

const PROMPT_TEMPLATE = readFileSync(
  join(process.cwd(), 'src/config/prompts/funding-extract.md'),
  'utf-8'
)

// ─── Part 1: News Extraction ─────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const BATCH_SIZE = 5
const BATCH_DELAY_MS = 2000

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Pre-filter: only send articles that might contain funding info
const FUNDING_KEYWORDS = [
  'funding', 'funded', 'raised', 'raises', 'raise', 'round',
  'seed', 'series a', 'series b', 'series c', 'series d',
  'venture', 'investment', 'investor', 'capital',
  '融资', '轮', '投资', '领投', '跟投',
]

function mightContainFunding(title: string, text: string | null): boolean {
  const combined = `${title} ${text ?? ''}`.toLowerCase()
  return FUNDING_KEYWORDS.some(kw => combined.includes(kw))
}

async function extractFromNews(): Promise<{ items: RawFunding[]; newsScanned: number }> {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString()

  // Get recent news that hasn't been scanned for funding yet
  const { data: newsRows, error } = await supabaseAdmin
    .from('raw_news')
    .select('id, source_url, title, summary, full_text, published_at')
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(200)

  if (error || !newsRows) {
    console.error('[funding/news] Failed to fetch news:', error?.message)
    return { items: [], newsScanned: 0 }
  }

  // Pre-filter for articles likely to contain funding
  const candidates = newsRows.filter(row => {
    const r = row as Record<string, unknown>
    return mightContainFunding(
      r.title as string,
      (r.full_text ?? r.summary ?? null) as string | null
    )
  })

  console.log(`[funding/news] ${newsRows.length} news articles, ${candidates.length} might contain funding`)

  if (candidates.length === 0) {
    return { items: [], newsScanned: newsRows.length }
  }

  const allItems: RawFunding[] = []

  // Process in batches
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(candidates.length / BATCH_SIZE)
    console.log(`[funding/news] 批次 ${batchNum}/${totalBatches} (${batch.length} 条)`)

    const results = await Promise.allSettled(batch.map(async (row) => {
      const r = row as Record<string, unknown>
      const sourceText = (r.full_text ?? r.summary ?? r.title) as string
      const sourceUrl = r.source_url as string
      const publishedAt = r.published_at as string

      if (!sourceText || sourceText.length < 30) return []

      const prompt = PROMPT_TEMPLATE
        .replace('{source_url}', sourceUrl)
        .replace('{published_at}', publishedAt)
        .replace('{source_text}', sourceText.slice(0, 12000))

      const extracted = await callHaikuJSON<ExtractedFunding[]>(prompt)
      if (!Array.isArray(extracted) || extracted.length === 0) return []

      return extracted.map(e => ({
        collector: 'news_extraction' as const,
        project_name: e.project_name,
        source_url: sourceUrl,
        round: e.round ?? null,
        amount: e.amount ?? null,
        amount_unit: 'USD',
        valuation: null,
        investors: e.investors ?? [],
        sector: e.sector ?? null,
        announced_at: e.announced_at || publishedAt,
        processed: false,
      }))
    }))

    for (const r of results) {
      if (r.status === 'fulfilled') {
        allItems.push(...r.value)
      }
    }

    if (i + BATCH_SIZE < candidates.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }

  return { items: allItems, newsScanned: newsRows.length }
}

// ─── Part 2: DeFiLlama Raises (fallback) ─────────────────────

interface DefiLlamaRaise {
  name: string
  round: string | null
  amount: number | null
  sector: string | null
  source: string[] | null
  date: number
  leadInvestors: string[] | null
  otherInvestors: string[] | null
}

const RELEVANT_KEYWORDS = [
  'stablecoin', 'stable coin', 'payments', 'payment', 'payfi', 'pay',
  'defi', 'infrastructure', 'fintech', 'rwa', 'real world asset',
  'cross-border', 'remittance', 'lending', 'credit', 'treasury',
  'usdc', 'usdt', 'dai', 'frax', 'pyusd', 'eurc', 'gho',
  'circle', 'tether', 'maker', 'aave', 'stripe', 'wise',
  'bridge', 'settlement', 'clearing', 'tokenization', 'tokenize',
]
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function isRelevantRaise(raise: DefiLlamaRaise, watchlistNames: Set<string>): boolean {
  // Check against watchlist names first
  const name = (raise.name ?? '').toLowerCase()
  if (watchlistNames.has(name)) return true

  // Check sector + name against broad keyword list
  const haystack = `${raise.sector ?? ''} ${raise.name ?? ''}`.toLowerCase()
  return RELEVANT_KEYWORDS.some(kw => haystack.includes(kw))
}

async function fetchDefiLlamaRaises(): Promise<RawFunding[]> {
  const watchlistNames = new Set(
    WATCHLIST.flatMap(e => {
      const names = [e.name.toLowerCase()]
      if ('aliases' in e && Array.isArray(e.aliases)) {
        names.push(...(e.aliases as string[]).map(a => a.toLowerCase()))
      }
      return names
    })
  )

  try {
    const url = `${SOURCES.defillama.baseUrl}/raises`
    const res = await fetch(url)

    if (!res.ok) {
      console.warn(`[funding/defillama] API returned ${res.status} (may require paid plan)`)
      return []
    }

    const data = await res.json() as { raises?: DefiLlamaRaise[] }
    const raises = data.raises ?? []
    console.log(`[funding/defillama] API 返回 ${raises.length} 条`)

    const cutoff = Date.now() - THIRTY_DAYS_MS

    return raises
      .filter(r => r.date * 1000 >= cutoff && isRelevantRaise(r, watchlistNames))
      .map(r => ({
        collector: 'defillama_raises' as const,
        project_name: r.name,
        source_url: r.source?.[0] ?? 'https://defillama.com/raises',
        round: r.round ?? null,
        amount: r.amount ?? null,
        amount_unit: 'USD',
        valuation: null,
        investors: [...(r.leadInvestors ?? []), ...(r.otherInvestors ?? [])],
        sector: r.sector ?? null,
        announced_at: new Date(r.date * 1000).toISOString(),
        processed: false,
      }))
  } catch (err) {
    console.warn('[funding/defillama] Failed (may be rate-limited):', err instanceof Error ? err.message : String(err))
    return []
  }
}

// ─── Dedup & Insert ──────────────────────────────────────────

async function deduplicateAndInsert(items: RawFunding[]): Promise<{ inserted: number }> {
  if (items.length === 0) return { inserted: 0 }

  // In-memory dedup by (project_name, round, date)
  const seen = new Set<string>()
  const deduped = items.filter(f => {
    const dateKey = f.announced_at.slice(0, 10)
    const key = `${f.project_name.toLowerCase()}|${f.round ?? ''}|${dateKey}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // DB dedup
  const { data: existing } = await supabaseAdmin
    .from('raw_funding')
    .select('project_name, round, announced_at')

  const existingKeys = new Set<string>()
  for (const row of existing ?? []) {
    const r = row as { project_name: string; round: string | null; announced_at: string }
    const dateKey = (r.announced_at ?? '').slice(0, 10)
    existingKeys.add(`${r.project_name.toLowerCase()}|${r.round ?? ''}|${dateKey}`)
  }

  const newItems = deduped.filter(f => {
    const dateKey = f.announced_at.slice(0, 10)
    const key = `${f.project_name.toLowerCase()}|${f.round ?? ''}|${dateKey}`
    return !existingKeys.has(key)
  })

  if (newItems.length === 0) {
    console.log('[funding] All items already exist in DB')
    return { inserted: 0 }
  }

  const { error } = await supabaseAdmin
    .from('raw_funding')
    .insert(newItems)

  if (error) {
    console.error('[funding] Insert failed:', error.message)
    return { inserted: 0 }
  }

  console.log(`[funding] Inserted ${newItems.length} new funding rounds`)
  return { inserted: newItems.length }
}

// ─── Main ────────────────────────────────────────────────────

export async function collectFunding(): Promise<CollectorResult> {
  console.log('[funding] Starting funding collection...')

  const breakdown: { source: string; count: number }[] = []

  // 1. Primary: extract from news
  const { items: newsItems, newsScanned } = await extractFromNews()
  breakdown.push({ source: `新闻提取 (扫描 ${newsScanned} 篇)`, count: newsItems.length })
  console.log(`[funding/news] Extracted ${newsItems.length} funding events from news`)

  // 2. Fallback: DeFiLlama (best-effort, may 429)
  const defillamaItems = await fetchDefiLlamaRaises()
  breakdown.push({ source: 'DeFiLlama Raises', count: defillamaItems.length })

  // 3. Merge, dedup, insert
  const allItems = [...newsItems, ...defillamaItems]
  const { inserted } = await deduplicateAndInsert(allItems)

  breakdown.push({ source: '新增入库', count: inserted })
  console.log(`[funding] Done — ${inserted} new funding rounds inserted`)

  return { total: inserted, breakdown }
}
