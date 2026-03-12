// A2 News Collector — 14 个 RSS 源（含中文）
// 从多个来源抓取加密/稳定币相关新闻，存入 raw_news 表

import { SOURCES } from '@/config/sources'
import { WATCHLIST } from '@/config/watchlist'
import { supabaseAdmin } from '@/db/client'
import RSSParser from 'rss-parser'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawNews {
  collector: 'rss'
  source_name: string
  source_url: string
  title: string
  summary: string | null
  full_text: string | null
  published_at: string
  tags: string[] | null
  language: string | null
  processed: boolean
}

// ─── RSS feeds ────────────────────────────────────────────────────────────────

const rssParser = new RSSParser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; StablePulse/1.0)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
  timeout: 15000,
})

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// ─── Stablecoin keyword pre-filter (soft filter) ─────────────────────────────

const STABLECOIN_KEYWORDS = [
  // Core terms
  'stablecoin', 'stable coin', '稳定币',
  // Major stablecoins
  'usdc', 'usdt', 'pyusd', 'dai', 'usde', 'frax', 'ausd', 'busd', 'tusd', 'gusd', 'fdusd',
  // Issuers & infra
  'circle', 'tether', 'ethena', 'makerdao', 'maker', 'agora',
  'stripe', 'bridge.xyz', 'zero hash', 'fireblocks',
  // Payments & cross-border
  '跨境支付', 'cross-border payment', 'remittance',
  // Regulation
  'genius act', 'mica', 'stablecoin regulation', 'stablecoin bill',
]

// Add watchlist entity names and aliases as additional keywords
const WATCHLIST_KEYWORDS = WATCHLIST.flatMap(e => [e.name.toLowerCase(), ...e.aliases.map(a => a.toLowerCase())])
const ALL_FILTER_KEYWORDS = [...STABLECOIN_KEYWORDS, ...WATCHLIST_KEYWORDS]

function matchesStablecoinKeywords(title: string, summary: string | null): boolean {
  const text = `${title} ${summary ?? ''}`.toLowerCase()
  return ALL_FILTER_KEYWORDS.some(kw => text.includes(kw))
}

// 中文源名单
const ZH_SOURCES = ['cointelegraph 中文', '吴说区块链', 'chaincatcher', 'blockbeats', 'odaily', 'foresight', 'panewslab', 'marsbit']

function isZhSource(name: string, url: string): boolean {
  const lower = name.toLowerCase()
  return ZH_SOURCES.some(s => lower.includes(s)) || url.includes('cn.cointelegraph')
}

async function collectFromRssFeed(
  feed: { name: string; url: string }
): Promise<RawNews[]> {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)
  const collected: RawNews[] = []
  const isZh = isZhSource(feed.name, feed.url)

  try {
    const parsed = await rssParser.parseURL(feed.url)
    let count = 0

    for (const item of parsed.items) {
      if (!item.link || !item.title) continue

      const publishedAt = item.pubDate ? new Date(item.pubDate) : null
      if (!publishedAt || isNaN(publishedAt.getTime()) || publishedAt < cutoff) continue

      // 过滤非新闻链接
      if (item.link.includes('github.com')) continue

      // 稳定币关键词预过滤（软过滤，B1 prompt 做硬过滤）
      if (!matchesStablecoinKeywords(item.title, item.contentSnippet ?? null)) continue

      collected.push({
        collector: 'rss',
        source_name: feed.name,
        source_url: item.link,
        title: item.title.trim(),
        summary: item.contentSnippet?.slice(0, 500) ?? null,
        full_text: null,
        published_at: publishedAt.toISOString(),
        tags: null,
        language: isZh ? 'zh' : 'en',
        processed: false,
      })

      count++
    }

    console.log(`[A2] RSS "${feed.name}" → ${count} items (last 7 days)`)
  } catch (err) {
    console.error(`[A2] RSS "${feed.name}" failed:`, err instanceof Error ? err.message.slice(0, 100) : String(err))
  }

  return collected
}

// ─── Deduplication against DB ────────────────────────────────────────────────

async function filterExistingUrls(items: RawNews[]): Promise<RawNews[]> {
  if (items.length === 0) return []

  const urls = [...new Set(items.map(i => i.source_url))]

  // Supabase IN query has a limit, batch if needed
  const BATCH = 200
  const existingUrls = new Set<string>()

  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH)
    const { data, error } = await supabaseAdmin
      .from('raw_news')
      .select('source_url')
      .in('source_url', batch)

    if (error) {
      console.error('[A2] Failed to fetch existing URLs:', error.message)
      continue
    }

    for (const row of data ?? []) {
      existingUrls.add((row as { source_url: string }).source_url)
    }
  }

  return items.filter(item => !existingUrls.has(item.source_url))
}

// ─── Main collector ───────────────────────────────────────────────────────────

export async function collectNews(): Promise<number> {
  console.log(`[A2] collectNews start — ${SOURCES.rssFeeds.length} RSS feeds`)

  // Fetch all feeds in parallel
  const results = await Promise.allSettled(
    SOURCES.rssFeeds.map(feed => collectFromRssFeed(feed))
  )

  const allItems: RawNews[] = []
  let successCount = 0
  let failCount = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value)
      if (result.value.length > 0) successCount++
    } else {
      failCount++
    }
  }

  console.log(`[A2] Total collected before dedup: ${allItems.length} (${successCount} feeds ok, ${failCount} failed)`)

  // In-memory deduplication by source_url
  const seenUrls = new Set<string>()
  const deduped = allItems.filter(item => {
    if (seenUrls.has(item.source_url)) return false
    seenUrls.add(item.source_url)
    return true
  })

  console.log(`[A2] After in-memory dedup: ${deduped.length}`)

  // DB deduplication
  const newItems = await filterExistingUrls(deduped)

  if (newItems.length === 0) {
    console.log('[A2] No new news items to insert.')
    return 0
  }

  console.log(`[A2] Upserting ${newItems.length} new items (${newItems.filter(i => i.language === 'zh').length} 中文)...`)

  // Insert in batches to avoid payload limits
  const INSERT_BATCH = 100
  let inserted = 0

  for (let i = 0; i < newItems.length; i += INSERT_BATCH) {
    const batch = newItems.slice(i, i + INSERT_BATCH)
    const { error } = await supabaseAdmin
      .from('raw_news')
      .upsert(batch, { onConflict: 'source_url' })

    if (error) {
      console.error(`[A2] Upsert batch ${Math.floor(i / INSERT_BATCH) + 1} failed:`, error.message)
    } else {
      inserted += batch.length
    }
  }

  console.log(`[A2] Successfully upserted ${inserted} news items.`)
  console.log('[A2] collectNews complete')
  return inserted
}
