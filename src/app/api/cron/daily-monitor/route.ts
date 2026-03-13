// Cron: Daily breaking-news monitor (速报机制)
// Lightweight daily check — fetches RSS, filters stablecoin articles from last 24h,
// AI-scores urgency, stores breaking/important alerts in weekly_snapshots.

import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import { SOURCES } from '@/config/sources'
import RSSParser from 'rss-parser'

export const maxDuration = 60

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreakingAlert {
  title: string
  summary: string
  source_url: string
  urgency: 'breaking' | 'important'
  detected_at: string
  source_name: string
}

interface UrgencyResult {
  urgency: 'breaking' | 'important' | 'routine'
  reason: string
}

// ─── RSS parser (reuse same config as news collector) ─────────────────────────

const rssParser = new RSSParser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; StablePulse/1.0)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
  timeout: 10000, // shorter timeout for daily monitor
})

const ONE_DAY_MS = 24 * 60 * 60 * 1000

// ─── Stablecoin keyword filter (copied from news collector) ───────────────────

const STRONG_KEYWORDS = [
  'stablecoin', 'stable coin', '稳定币',
  'usdc', 'usdt', 'pyusd', 'dai', 'usde', 'frax', 'ausd', 'busd', 'tusd', 'gusd', 'fdusd',
  'circle', 'tether', 'ethena', 'makerdao',
  'bridge.xyz', 'zero hash',
  '跨境支付', 'cross-border payment', 'stablecoin payment',
  'genius act', 'mica', 'stablecoin regulation', 'stablecoin bill',
  'cbdc', 'digital dollar', 'digital euro', '数字货币',
]

const WEAK_KEYWORDS = [
  'visa', 'mastercard', 'jpmorgan', 'blackrock', 'coinbase', 'robinhood',
  'block', 'square', 'stripe', 'fireblocks', 'paypal',
  'aave', 'curve', 'uniswap', 'maker', 'agora',
  'sec', 'occ', 'federal reserve', 'cftc',
]

const CONTEXT_WORDS = [
  'stablecoin', 'stable', 'usdc', 'usdt', 'pyusd', 'payment', 'crypto',
  'digital asset', 'blockchain', 'tokenize', 'tokenization', 'on-chain', 'onchain',
  'defi', 'web3', 'remittance', 'settlement', 'cross-border',
  '稳定币', '加密', '区块链', '支付', '数字资产',
]

function matchesStablecoinKeywords(title: string, summary: string | null): boolean {
  const text = `${title} ${summary ?? ''}`.toLowerCase()
  if (STRONG_KEYWORDS.some(kw => text.includes(kw))) return true
  const hasWeak = WEAK_KEYWORDS.some(kw => text.includes(kw))
  if (hasWeak) return CONTEXT_WORDS.some(ctx => text.includes(ctx))
  return false
}

// ─── Fetch recent articles from all RSS feeds ─────────────────────────────────

interface RSSItem {
  title: string
  summary: string | null
  source_url: string
  source_name: string
  published_at: string
}

async function fetchRecentArticles(): Promise<RSSItem[]> {
  const cutoff = new Date(Date.now() - ONE_DAY_MS)
  const items: RSSItem[] = []

  const results = await Promise.allSettled(
    SOURCES.rssFeeds.map(async (feed) => {
      try {
        const parsed = await rssParser.parseURL(feed.url)
        const feedItems: RSSItem[] = []

        for (const item of parsed.items) {
          if (!item.link || !item.title) continue

          const publishedAt = item.pubDate ? new Date(item.pubDate) : null
          if (!publishedAt || isNaN(publishedAt.getTime()) || publishedAt < cutoff) continue
          if (item.link.includes('github.com')) continue

          if (!matchesStablecoinKeywords(item.title, item.contentSnippet ?? null)) continue

          feedItems.push({
            title: item.title.trim(),
            summary: item.contentSnippet?.slice(0, 300) ?? null,
            source_url: item.link,
            source_name: feed.name,
            published_at: publishedAt.toISOString(),
          })
        }
        return feedItems
      } catch {
        return []
      }
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      items.push(...result.value)
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  return items.filter(item => {
    if (seen.has(item.source_url)) return false
    seen.add(item.source_url)
    return true
  })
}

// ─── AI urgency scoring ──────────────────────────────────────────────────────

async function scoreUrgency(articles: RSSItem[]): Promise<(RSSItem & { urgency: 'breaking' | 'important' | 'routine' })[]> {
  if (articles.length === 0) return []

  // Batch all articles into one AI call for efficiency
  const articleList = articles.map((a, i) =>
    `[${i}] "${a.title}" — ${a.summary ?? '(no summary)'}`
  ).join('\n')

  const scored = await callHaikuJSON<{ scores: { index: number; urgency: 'breaking' | 'important' | 'routine'; reason: string }[] }>(
    `You are a stablecoin news analyst. Score the urgency of each article below.

Urgency levels:
- "breaking": Major regulatory action, large stablecoin depeg, major partnership announcement, significant market event. Needs immediate attention.
- "important": Notable development worth tracking, but not time-critical. New product launches, meaningful market moves, policy proposals.
- "routine": Regular coverage, market updates, opinion pieces. Standard weekly coverage is fine.

Articles:
${articleList}

Return JSON: { "scores": [{ "index": 0, "urgency": "breaking"|"important"|"routine", "reason": "brief reason" }, ...] }
Score ALL ${articles.length} articles.`,
    { maxTokens: 2048 }
  )

  return articles.map((article, i) => {
    const score = scored.scores.find((s: UrgencyResult & { index: number }) => s.index === i)
    return { ...article, urgency: score?.urgency ?? 'routine' as const }
  })
}

// ─── Store breaking alerts in weekly_snapshots ───────────────────────────────

async function storeAlerts(alerts: BreakingAlert[]): Promise<void> {
  if (alerts.length === 0) return

  const week = getCurrentWeekNumber()

  // Get existing snapshot data
  const { data: existing } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('snapshot_data')
    .eq('week_number', week)
    .single()

  const snapshotData = (existing?.snapshot_data as Record<string, unknown>) ?? {}
  const existingAlerts = (snapshotData.breaking_alerts as BreakingAlert[]) ?? []

  // Deduplicate by source_url
  const existingUrls = new Set(existingAlerts.map(a => a.source_url))
  const newAlerts = alerts.filter(a => !existingUrls.has(a.source_url))

  if (newAlerts.length === 0) return

  const mergedAlerts = [...existingAlerts, ...newAlerts]
  snapshotData.breaking_alerts = mergedAlerts

  // Upsert the snapshot
  const { error } = await supabaseAdmin
    .from('weekly_snapshots')
    .upsert(
      { week_number: week, snapshot_data: snapshotData },
      { onConflict: 'week_number' }
    )

  if (error) {
    console.error('[DailyMonitor] Failed to store alerts:', error.message)
  } else {
    console.log(`[DailyMonitor] Stored ${newAlerts.length} new alerts (${mergedAlerts.length} total for ${week})`)
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  const start = Date.now()

  try {
    // 1. Fetch recent RSS items (last 24h)
    console.log('[DailyMonitor] Fetching RSS feeds...')
    const articles = await fetchRecentArticles()
    console.log(`[DailyMonitor] Found ${articles.length} stablecoin articles in last 24h`)

    if (articles.length === 0) {
      return NextResponse.json({
        status: 'done',
        articles_found: 0,
        alerts_stored: 0,
        duration_ms: Date.now() - start,
      })
    }

    // 2. AI urgency scoring
    console.log('[DailyMonitor] Scoring urgency...')
    const scored = await scoreUrgency(articles)

    const breaking = scored.filter(a => a.urgency === 'breaking')
    const important = scored.filter(a => a.urgency === 'important')
    const routine = scored.filter(a => a.urgency === 'routine')

    console.log(`[DailyMonitor] Scores: ${breaking.length} breaking, ${important.length} important, ${routine.length} routine`)

    // 3. Store breaking + important as alerts
    const alertArticles = [...breaking, ...important]
    const alerts: BreakingAlert[] = alertArticles.map(a => ({
      title: a.title,
      summary: a.summary ?? '',
      source_url: a.source_url,
      urgency: a.urgency as 'breaking' | 'important',
      detected_at: new Date().toISOString(),
      source_name: a.source_name,
    }))

    await storeAlerts(alerts)

    return NextResponse.json({
      status: 'done',
      articles_found: articles.length,
      breaking: breaking.length,
      important: important.length,
      routine: routine.length,
      alerts_stored: alerts.length,
      duration_ms: Date.now() - start,
    })
  } catch (err) {
    console.error('[DailyMonitor] Failed:', err)
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
