// A2 News Collector — CryptoPanic API + RSS feeds (含中文源)
// 从多个来源抓取稳定币相关新闻，存入 raw_news 表

import { SOURCES } from '@/config/sources'
import { supabaseAdmin } from '@/db/client'
import RSSParser from 'rss-parser'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawNews {
  collector: 'cryptopanic' | 'rss'
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

// ─── CryptoPanic API shapes ─────────────────────────────────────────────────

interface CryptoPanicPost {
  kind: string
  domain: string
  title: string
  published_at: string
  slug: string
  url: string
  source: {
    title: string
    region: string
    domain: string
  }
  currencies?: { code: string; title: string }[]
}

interface CryptoPanicResponse {
  count: number
  results: CryptoPanicPost[]
}

// ─── Part 1: CryptoPanic API ─────────────────────────────────────────────────

async function collectFromCryptoPanic(): Promise<RawNews[]> {
  const baseUrl = SOURCES.cryptoPanic.baseUrl
  const apiKey = SOURCES.cryptoPanic.apiKey
  const collected: RawNews[] = []

  // 搜索稳定币相关新闻
  const currencies = 'USDC,USDT,DAI,PYUSD'
  const authParam = apiKey ? `&auth_token=${apiKey}` : ''
  const url = `${baseUrl}/posts/?currencies=${currencies}&filter=important&kind=news${authParam}`

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'StablePulse/1.0' },
    })

    if (!res.ok) {
      console.error(`[A2] CryptoPanic API returned ${res.status}`)
      return collected
    }

    const data = await res.json() as CryptoPanicResponse
    console.log(`[A2] CryptoPanic: ${data.results?.length ?? 0} posts`)

    for (const post of data.results ?? []) {
      if (!post.url || !post.title || !post.published_at) continue

      // 过滤 GitHub 链接 — 这些不是新闻
      if (post.domain === 'github.com' || post.url.includes('github.com')) continue

      const tags = (post.currencies ?? []).map(c => c.code)

      collected.push({
        collector: 'cryptopanic',
        source_name: post.source?.title ?? post.domain ?? 'CryptoPanic',
        source_url: post.url,
        title: post.title.trim(),
        summary: null,
        full_text: null,
        published_at: new Date(post.published_at).toISOString(),
        tags: tags.length > 0 ? tags : ['stablecoin'],
        language: post.source?.region === 'zh' ? 'zh' : 'en',
        processed: false,
      })
    }
  } catch (err) {
    console.error('[A2] CryptoPanic fetch failed:', err)
  }

  return collected
}

// ─── Part 2: RSS feeds ────────────────────────────────────────────────────────

const rssParser = new RSSParser()
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

async function collectFromRssFeed(
  feed: { name: string; url: string }
): Promise<RawNews[]> {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)
  const collected: RawNews[] = []

  try {
    const parsed = await rssParser.parseURL(feed.url)
    let count = 0

    // 检测是否为中文源
    const zhSources = ['chaincatcher', 'blockbeats', 'odaily', 'foresight', 'panewslab']
    const isZh = zhSources.some(s => feed.url.toLowerCase().includes(s) || feed.name.toLowerCase().includes(s))

    for (const item of parsed.items) {
      if (!item.link || !item.title) continue

      const publishedAt = item.pubDate ? new Date(item.pubDate) : null
      if (!publishedAt || isNaN(publishedAt.getTime()) || publishedAt < cutoff) continue

      // 过滤 GitHub 链接
      if (item.link.includes('github.com')) continue

      collected.push({
        collector: 'rss',
        source_name: feed.name,
        source_url: item.link,
        title: item.title.trim(),
        summary: item.contentSnippet ?? null,
        full_text: null,
        published_at: publishedAt.toISOString(),
        tags: null,
        language: isZh ? 'zh' : 'en',
        processed: false,
      })

      count++
    }

    console.log(`[A2] RSS "${feed.name}" → ${count} items in last 7 days`)
  } catch (err) {
    console.error(`[A2] RSS feed failed for "${feed.name}" (${feed.url}):`, err)
  }

  return collected
}

async function collectFromRssFeeds(): Promise<RawNews[]> {
  const results = await Promise.allSettled(
    SOURCES.rssFeeds.map(feed => collectFromRssFeed(feed))
  )

  const collected: RawNews[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      collected.push(...result.value)
    }
  }

  return collected
}

// ─── Deduplication against DB ────────────────────────────────────────────────

async function filterExistingUrls(items: RawNews[]): Promise<RawNews[]> {
  if (items.length === 0) return []

  const urls = [...new Set(items.map(i => i.source_url))]

  const { data, error } = await supabaseAdmin
    .from('raw_news')
    .select('source_url')
    .in('source_url', urls)

  if (error) {
    console.error('[A2] Failed to fetch existing URLs from DB, skipping dedup:', error.message)
    return items
  }

  const existingUrls = new Set((data ?? []).map((row: { source_url: string }) => row.source_url))

  return items.filter(item => !existingUrls.has(item.source_url))
}

// ─── Main collector ───────────────────────────────────────────────────────────

export async function collectNews(): Promise<void> {
  console.log('[A2] collectNews start')

  // Fetch from both sources in parallel
  const [cryptoPanicItems, rssItems] = await Promise.all([
    collectFromCryptoPanic(),
    collectFromRssFeeds(),
  ])

  const allItems = [...cryptoPanicItems, ...rssItems]
  console.log(`[A2] Total collected before dedup: ${allItems.length}`)

  // In-memory deduplication by source_url (keep first occurrence)
  const seenUrls = new Set<string>()
  const deduped = allItems.filter(item => {
    if (seenUrls.has(item.source_url)) return false
    seenUrls.add(item.source_url)
    return true
  })

  console.log(`[A2] After in-memory dedup: ${deduped.length}`)

  // DB-level deduplication — skip URLs already stored
  const newItems = await filterExistingUrls(deduped)

  if (newItems.length === 0) {
    console.log('[A2] No new news items to insert.')
    return
  }

  console.log(`[A2] Upserting ${newItems.length} new news items...`)

  const { error } = await supabaseAdmin
    .from('raw_news')
    .upsert(newItems, { onConflict: 'source_url' })

  if (error) {
    console.error('[A2] Upsert failed:', error.message)
  } else {
    console.log(`[A2] Successfully upserted ${newItems.length} news items.`)
  }

  console.log('[A2] collectNews complete')
}
