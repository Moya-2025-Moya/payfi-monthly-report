// A2 News Collector — 14 个 RSS 源（含中文）
// 从多个来源抓取加密/稳定币相关新闻，抓取全文后存入 raw_news 表

import { SOURCES } from '@/config/sources'
import { WATCHLIST } from '@/config/watchlist'
import { supabaseAdmin } from '@/db/client'
import { extractContentBatch } from '@/lib/extract-content'
import RSSParser from 'rss-parser'
import type { CollectorResult } from '@/modules/collectors'

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

// ─── PayFi keyword pre-filter ─────────────────────────────────────────────
// 从 WATCHLIST 自动构建关键词 + 手动补充行业术语
// 策略：宽进严出 — 采集阶段多收，后续 AI 做硬过滤

// 自动从 WATCHLIST 提取所有实体名+别名（小写，去重）
const WATCHLIST_NAMES = (() => {
  const names = new Set<string>()
  for (const e of WATCHLIST) {
    names.add(e.name.toLowerCase())
    for (const a of e.aliases) names.add(a.toLowerCase())
  }
  // 去掉太短或太通用的词（如 "fed", "blk", "sq"）
  return [...names].filter(n => n.length >= 3)
})()

// 强关键词 — 出现即通过（WATCHLIST 实体名 + 行业核心术语）
const STRONG_KEYWORDS = [
  ...WATCHLIST_NAMES,
  // 核心概念
  'stablecoin', 'stable coin', '稳定币',
  // 稳定币名称（含 WATCHLIST 可能没覆盖的）
  'busd', 'tusd', 'gusd', 'fdusd', 'eurs', 'eurt', 'lusd', 'susd', 'rai',
  // 支付/PayFi
  'payfi', 'cross-border payment', '跨境支付', 'stablecoin payment',
  'crypto payment', 'digital payment', 'real-time settlement',
  // 监管
  'genius act', 'mica', 'stablecoin regulation', 'stablecoin bill',
  'digital asset regulation', 'crypto regulation', 'crypto bill',
  // CBDC
  'cbdc', 'digital dollar', 'digital euro', 'digital yuan', '数字货币',
  // 行业热词
  'tokenization', 'tokenize', 'tokenised', 'real world asset', 'rwa',
  'defi', 'decentralized finance', 'yield', 'tvl',
  'crypto', 'blockchain', 'web3', 'on-chain', 'onchain',
  // 中文
  '加密货币', '区块链', '代币', '链上', 'DeFi',
]

// 弱关键词 — 需配合上下文词（防止 "Visa Q4 earnings" 进入）
const WEAK_KEYWORDS = [
  'sec', 'occ', 'federal reserve', 'cftc', 'fdic', 'finma',
  'ipo', 'etf', 'custody',
  'bank', 'fintech', 'neobank',
]

// 上下文词 — 弱关键词必须跟这些词共现
const CONTEXT_WORDS = [
  'stablecoin', 'stable', 'usdc', 'usdt', 'pyusd', 'payment', 'crypto',
  'digital asset', 'blockchain', 'tokenize', 'tokenization', 'on-chain', 'onchain',
  'defi', 'web3', 'remittance', 'settlement', 'cross-border',
  'bitcoin', 'ethereum', 'solana', 'token', 'coin',
  '稳定币', '加密', '区块链', '支付', '数字资产',
]

function matchesStablecoinKeywords(title: string, summary: string | null): 'strong' | 'weak' | false {
  const text = `${title} ${summary ?? ''}`.toLowerCase()

  // 强关键词直接通过
  if (STRONG_KEYWORDS.some(kw => text.includes(kw))) return 'strong'

  // 弱关键词 + 上下文词共现才通过
  const hasWeak = WEAK_KEYWORDS.some(kw => text.includes(kw))
  if (hasWeak) {
    return CONTEXT_WORDS.some(ctx => text.includes(ctx)) ? 'weak' : false
  }

  return false
}

// 中文源名单
const ZH_SOURCES = ['cointelegraph 中文', '吴说区块链', 'chaincatcher', 'blockbeats', 'odaily', 'foresight', 'panewslab', 'marsbit']

function isZhSource(name: string, url: string): boolean {
  const lower = name.toLowerCase()
  return ZH_SOURCES.some(s => lower.includes(s)) || url.includes('cn.cointelegraph')
}

async function collectFromRssFeed(
  feed: { name: string; url: string }
): Promise<{ items: RawNews[]; strongUrls: Set<string> }> {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)
  const collected: RawNews[] = []
  const strongUrls = new Set<string>()
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
      const matchStrength = matchesStablecoinKeywords(item.title, item.contentSnippet ?? null)
      if (!matchStrength) continue

      if (matchStrength === 'strong') {
        strongUrls.add(item.link)
      }

      collected.push({
        collector: 'rss',
        source_name: feed.name,
        source_url: item.link,
        title: item.title.trim(),
        summary: item.contentSnippet?.slice(0, 500) ?? null,
        full_text: null, // will be filled by full-text extraction for strong matches
        published_at: publishedAt.toISOString(),
        tags: null,
        language: isZh ? 'zh' : 'en',
        processed: false,
      })

      count++
    }

    console.log(`[A2] RSS "${feed.name}" → ${count} items (${strongUrls.size} strong, last 7 days)`)
  } catch (err) {
    console.error(`[A2] RSS "${feed.name}" failed:`, err instanceof Error ? err.message.slice(0, 100) : String(err))
  }

  return { items: collected, strongUrls }
}

// ─── Full-text extraction ────────────────────────────────────────────────────

const FULL_TEXT_CONCURRENCY = 8

async function enrichWithFullText(items: RawNews[]): Promise<void> {
  const urls = items.map(i => i.source_url)
  console.log(`[A2] Fetching full text for ${urls.length} articles (concurrency=${FULL_TEXT_CONCURRENCY})...`)

  const textMap = await extractContentBatch(urls, FULL_TEXT_CONCURRENCY)

  let enriched = 0
  for (const item of items) {
    const text = textMap.get(item.source_url)
    if (text) {
      item.full_text = text
      enriched++
    }
  }

  console.log(`[A2] Full text extracted: ${enriched}/${items.length} articles`)
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

export async function collectNews(): Promise<CollectorResult> {
  console.log(`[A2] collectNews start — ${SOURCES.rssFeeds.length} RSS feeds`)

  // Fetch all feeds in parallel
  const results = await Promise.allSettled(
    SOURCES.rssFeeds.map(feed => collectFromRssFeed(feed))
  )

  const allItems: RawNews[] = []
  const allStrongUrls = new Set<string>()
  let successCount = 0
  let failCount = 0
  const feedCounts: { source: string; count: number }[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const feedName = SOURCES.rssFeeds[i].name
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items)
      for (const url of result.value.strongUrls) {
        allStrongUrls.add(url)
      }
      feedCounts.push({ source: feedName, count: result.value.items.length })
      if (result.value.items.length > 0) successCount++
    } else {
      feedCounts.push({ source: `${feedName} (失败)`, count: 0 })
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
    return { total: 0, breakdown: feedCounts }
  }

  // Fetch full text for ALL items (V1 source traceback needs it for validation)
  console.log(`[A2] Fetching full text for all ${newItems.length} items (${newItems.filter(i => allStrongUrls.has(i.source_url)).length} strong keyword matches)`)
  if (newItems.length > 0) {
    await enrichWithFullText(newItems)
  }

  console.log(`[A2] Upserting ${newItems.length} new items (${newItems.filter(i => i.language === 'zh').length} 中文)...`)

  // Insert in batches to avoid payload limits
  const INSERT_BATCH = 50
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
  return { total: inserted, breakdown: feedCounts }
}
