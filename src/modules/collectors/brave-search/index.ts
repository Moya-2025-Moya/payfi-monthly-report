// Brave Search News Collector — multi-language news keyword monitoring
//
// Catches news that RSS feeds miss (e.g., Korean stablecoin regulation, regional news).
// Uses Brave News Search API with targeted queries.

import { SOURCES } from '@/config/sources'
import { supabaseAdmin } from '@/db/client'
import { generateKeywords } from '@/lib/watchlist'
import { filterLiveItems } from '@/lib/url-check'
import { extractContentBatch } from '@/lib/extract-content'

const FULL_TEXT_CONCURRENCY = 8

const API_KEY = SOURCES.braveSearch.apiKey
const NEWS_URL = `${SOURCES.braveSearch.baseUrl}${SOURCES.braveSearch.endpoints.news}`

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// Targeted queries that complement RSS (focused on gaps)
const SEARCH_QUERIES = [
  // Multi-language stablecoin regulation (RSS feeds miss Asian news)
  'stablecoin regulation 2026',
  'stablecoin 규제',           // Korean: stablecoin regulation
  'stablecoin 安定幣 規制',    // Japanese/Chinese: stablecoin regulation
  '稳定币 监管',               // Chinese: stablecoin regulation

  // Vietnam (no RSS coverage — Vietnamese + English queries)
  'Vietnam crypto exchange license',
  'tiền mã hóa Việt Nam',      // Vietnamese: cryptocurrency Vietnam
  'sàn giao dịch tiền số',     // Vietnamese: digital asset exchange
  'stablecoin Việt Nam',       // Vietnamese: stablecoin Vietnam
  'SBV crypto regulation',     // State Bank of Vietnam

  // RWA / tokenization
  'USYC OR BUIDL OR IBENJI tokenization',
  'RWA stablecoin tokenized',

  // Cross-border payments
  'cross-border stablecoin payment',
  'crypto payment gateway stablecoin',

  // Breaking / major events
  'USDC OR USDT breaking news',
  'stablecoin license approval',
]

interface BraveNewsResult {
  title: string
  url: string
  description: string
  age?: string
  page_age?: string
  meta_url?: { hostname: string }
  language?: string
}

interface BraveNewsResponse {
  results?: BraveNewsResult[]
}

async function searchBraveNews(query: string, count = 10): Promise<BraveNewsResult[]> {
  if (!API_KEY) return []

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(count),
      freshness: 'pw', // past week
      text_decorations: 'false',
    })

    const res = await fetch(`${NEWS_URL}?${params}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': API_KEY,
      },
    })

    if (!res.ok) {
      console.error(`[brave-search] HTTP ${res.status} for query "${query.slice(0, 40)}"`)
      return []
    }

    const data: BraveNewsResponse = await res.json()
    return data.results ?? []
  } catch (err) {
    console.error(`[brave-search] Error:`, err instanceof Error ? err.message : String(err))
    return []
  }
}

function detectLanguage(title: string, description: string): string {
  const text = `${title} ${description}`
  if (/[\u3400-\u9FFF]/.test(text)) {
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'
    return 'zh'
  }
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja'
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'
  return 'en'
}

export async function collectBraveSearch(): Promise<number> {
  if (!API_KEY) {
    console.error('[brave-search] BRAVE_SEARCH_API_KEY not configured, skipping')
    return 0
  }

  console.log(`[brave-search] ═══ 开始采集 — ${SEARCH_QUERIES.length} 组搜索查询 ═══`)

  // Also generate dynamic queries from watchlist keywords
  const keywords = await generateKeywords()
  const dynamicQueries = [
    // Pick a few high-value strong keywords for search
    ...keywords.strong
      .filter(k => k.length > 4 && !k.includes(' ')) // single-word strong terms
      .slice(0, 5)
      .map(k => `${k} news 2026`),
  ]

  const allQueries = [...SEARCH_QUERIES, ...dynamicQueries]
  const allItems = new Map<string, {
    source_type: 'brave_search'
    source_name: string
    source_url: string
    title: string
    content: string | null
    full_text: string | null
    language: string
    published_at: string
    metadata: Record<string, unknown>
    processed: boolean
  }>()

  for (const query of allQueries) {
    const results = await searchBraveNews(query, 10)

    for (const r of results) {
      if (!r.url || !r.title) continue
      if (allItems.has(r.url)) continue

      const lang = detectLanguage(r.title, r.description ?? '')

      allItems.set(r.url, {
        source_type: 'brave_search',
        source_name: r.meta_url?.hostname ?? 'brave_search',
        source_url: r.url,
        title: r.title,
        content: r.description ?? null,
        full_text: null,
        language: lang,
        published_at: new Date().toISOString(), // Brave doesn't always give exact dates
        metadata: {
          query: query.slice(0, 100),
          age: r.age ?? r.page_age ?? null,
        },
        processed: false,
      })
    }

    console.log(`[brave-search]   "${query.slice(0, 40)}..." → ${results.length} 条`)
  }

  const dedupedItems = [...allItems.values()]
  console.log(`[brave-search] 去重后: ${dedupedItems.length} 条`)

  if (dedupedItems.length === 0) {
    console.log('[brave-search] ═══ 无新增，采集结束 ═══')
    return 0
  }

  // URL 活性校验 — Brave 搜索结果是 4 个 collector 里死链风险最高的，
  // 索引可能指向已被撤下或搬迁的文章。
  const liveCheck = await filterLiveItems(
    dedupedItems,
    it => it.source_url,
    { concurrency: 10, timeoutMs: 6000 },
  )
  if (liveCheck.dead.length > 0) {
    console.log(
      `[brave-search] URL 校验: ${liveCheck.alive.length} 活 / ${liveCheck.dead.length} 死（死链丢弃）`,
    )
  }
  const items = liveCheck.alive
  if (items.length === 0) {
    console.log('[brave-search] ═══ 全部死链，采集结束 ═══')
    return 0
  }

  // 全文抓取——LLM 必须读到正文里的数字/命名方才能写出合格的 headline。
  // Brave search 只给 description (~300-500 字符)，远不够。
  console.log(`[brave-search] 全文提取: ${items.length} 篇 (concurrency=${FULL_TEXT_CONCURRENCY})`)
  const urls = items.map(it => it.source_url)
  const textMap = await extractContentBatch(urls, FULL_TEXT_CONCURRENCY)
  let enriched = 0
  for (const it of items) {
    const text = textMap.get(it.source_url)
    if (text) {
      it.full_text = text
      enriched++
    }
  }
  console.log(`[brave-search] 全文提取完成: ${enriched}/${items.length} 成功`)

  // Batch upsert
  const BATCH = 50
  let inserted = 0

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH)
    const { error } = await supabaseAdmin
      .from('raw_items')
      .upsert(batch, { onConflict: 'source_url', ignoreDuplicates: true })

    if (error) {
      console.error(`[brave-search] Upsert batch failed:`, error.message)
    } else {
      inserted += batch.length
    }
  }

  console.log(`[brave-search] ═══ 采集完成 — ${inserted} 条入库 ═══`)
  return inserted
}
