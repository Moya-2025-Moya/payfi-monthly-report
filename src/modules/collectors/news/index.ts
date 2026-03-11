// A2 News Collector — free-crypto-news API + RSS feeds
// Fetches recent stablecoin news from multiple sources and stores in raw_news table.

import { SOURCES } from '@/config/sources'
import { supabaseAdmin } from '@/db/client'
import RSSParser from 'rss-parser'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawNews {
  collector: 'free-crypto-news' | 'rss'
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

// ─── free-crypto-news API shapes ─────────────────────────────────────────────

interface FreeCryptoNewsArticle {
  title?: string
  url?: string
  link?: string
  source?: string
  source_name?: string
  description?: string
  summary?: string
  publishedAt?: string
  published_at?: string
  date?: string
}

interface FreeCryptoNewsResponse {
  articles?: FreeCryptoNewsArticle[]
  data?: FreeCryptoNewsArticle[]
  results?: FreeCryptoNewsArticle[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'payfi-monthly-report' },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`)
  }
  return res.json() as Promise<T>
}

function extractArticles(data: FreeCryptoNewsResponse): FreeCryptoNewsArticle[] {
  return data.articles ?? data.data ?? data.results ?? []
}

function normalizePublishedAt(article: FreeCryptoNewsArticle): string | null {
  const raw = article.publishedAt ?? article.published_at ?? article.date
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function normalizeSourceUrl(article: FreeCryptoNewsArticle): string | null {
  return article.url ?? article.link ?? null
}

function normalizeSourceName(article: FreeCryptoNewsArticle): string {
  return article.source ?? article.source_name ?? 'free-crypto-news'
}

function normalizeSummary(article: FreeCryptoNewsArticle): string | null {
  return article.description ?? article.summary ?? null
}

// ─── Part 1: free-crypto-news API ─────────────────────────────────────────────

async function collectFromFreeCryptoNews(): Promise<RawNews[]> {
  const baseUrl = SOURCES.freeCryptoNews.baseUrl
  const searchEndpoint = SOURCES.freeCryptoNews.endpoints.search

  const queries = ['stablecoin', 'USDC', 'USDT']
  const collected: RawNews[] = []

  for (const q of queries) {
    const url = `${baseUrl}${searchEndpoint}?q=${encodeURIComponent(q)}&limit=50`

    try {
      const data = await fetchJson<FreeCryptoNewsResponse>(url)
      const articles = extractArticles(data)

      console.log(`[A2] free-crypto-news: "${q}" → ${articles.length} articles`)

      for (const article of articles) {
        const sourceUrl = normalizeSourceUrl(article)
        const title = article.title?.trim()
        const publishedAt = normalizePublishedAt(article)

        if (!sourceUrl || !title || !publishedAt) continue

        collected.push({
          collector: 'free-crypto-news',
          source_name: normalizeSourceName(article),
          source_url: sourceUrl,
          title,
          summary: normalizeSummary(article),
          full_text: null,
          published_at: publishedAt,
          tags: [q],
          language: null,
          processed: false,
        })
      }
    } catch (err) {
      console.error(`[A2] free-crypto-news search failed for "${q}":`, err)
    }
  }

  return collected
}

// ─── Part 2: RSS feeds ────────────────────────────────────────────────────────

const rssParser = new RSSParser()

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

async function collectFromRssFeed(
  feed: { name: string; url: string }
): Promise<RawNews[]> {
  const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS)
  const collected: RawNews[] = []

  try {
    const parsed = await rssParser.parseURL(feed.url)
    let count = 0

    for (const item of parsed.items) {
      if (!item.link || !item.title) continue

      const publishedAt = item.pubDate ? new Date(item.pubDate) : null
      if (!publishedAt || isNaN(publishedAt.getTime()) || publishedAt < cutoff) continue

      collected.push({
        collector: 'rss',
        source_name: feed.name,
        source_url: item.link,
        title: item.title.trim(),
        summary: item.contentSnippet ?? null,
        full_text: null,
        published_at: publishedAt.toISOString(),
        tags: null,
        language: null,
        processed: false,
      })

      count++
    }

    console.log(`[A2] RSS "${feed.name}" → ${count} items in last 24h`)
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
    // Rejected promises are already logged inside collectFromRssFeed
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
  const [freeCryptoNewsItems, rssItems] = await Promise.all([
    collectFromFreeCryptoNews(),
    collectFromRssFeeds(),
  ])

  const allItems = [...freeCryptoNewsItems, ...rssItems]
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
