// A2 News Collector — 稳定币/PayFi 精准采集
//
// 架构：宽采集 → 精提取 → AI 硬过滤
//   Phase 1: 并行抓取所有 RSS（title + summary + 内联全文）
//   Phase 2: 三级关键词过滤（强/弱/拒绝）
//   Phase 3: 去重（内存 + DB）
//   Phase 4: 智能全文提取（仅强匹配 + 无内联内容时才 HTTP 抓取）
//   Phase 5: 批量入库 + 诊断漏斗日志

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

type MatchStrength = 'strong' | 'weak'

// RSS Parser 扩展类型（content:encoded 是标准 RSS 字段）
type RSSItem = {
  title?: string
  link?: string
  pubDate?: string
  contentSnippet?: string
  content?: string
  'content:encoded'?: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const rssParser = new RSSParser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; StablePulse/1.0)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
  timeout: 15_000,
  customFields: { item: [['content:encoded', 'content:encoded']] },
})

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const FULL_TEXT_CONCURRENCY = 8
const INSERT_BATCH = 50

// ─── 三级关键词系统 ────────────────────────────────────────────────────────────
//
// 设计原则：
//   强关键词 = 出现即通过（稳定币核心词 + WATCHLIST 核心实体名）
//   弱关键词 = 需配合上下文词共现（TradFi/DeFi/监管 + 必须跟支付/稳定币相关）
//   拒绝     = 不匹配任何关键词 → 丢弃
//
// 为什么不用 "crypto" / "blockchain" 做强关键词：
//   这些词每天出现在 500+ 篇文章中，会引入大量无关噪音。
//   我们的定位是稳定币/PayFi，不是通用加密新闻。

// 自动从 WATCHLIST 提取稳定币/支付基础设施实体名
const WATCHLIST_STRONG_NAMES = (() => {
  const names = new Set<string>()
  const CORE_CATS = new Set(['stablecoin_issuer', 'b2b_infra'])
  for (const e of WATCHLIST) {
    if (CORE_CATS.has(e.category)) {
      names.add(e.name.toLowerCase())
      for (const a of e.aliases) {
        if (a.length >= 3) names.add(a.toLowerCase())
      }
    }
  }
  return [...names]
})()

const STRONG_KEYWORDS = [
  ...WATCHLIST_STRONG_NAMES,
  // ── 核心概念 ──
  'stablecoin', 'stable coin', '稳定币',
  // ── 稳定币名称（WATCHLIST 可能没覆盖的）──
  'busd', 'tusd', 'gusd', 'fdusd', 'eurs', 'eurt', 'lusd',
  // ── PayFi / 加密支付 ──
  'payfi', 'cross-border payment', '跨境支付',
  'stablecoin payment', 'crypto payment', 'stablecoin settlement',
  'stablecoin transfer', 'on-chain payment',
  // ── 稳定币监管 ──
  'genius act', 'mica regulation', 'stablecoin regulation',
  'stablecoin bill', 'stablecoin framework', 'stablecoin legislation',
  'payment stablecoin',
  // ── CBDC ──
  'cbdc', 'digital dollar', 'digital euro', 'digital yuan', '数字货币',
  // ── 代币化/RWA（跟支付结算强相关）──
  'tokenization', 'tokenized deposit', 'tokenised',
  'real world asset', 'rwa',
]

// 弱关键词（TradFi / DeFi / 监管 / 通用加密 — 必须配合上下文）
const WEAK_KEYWORDS = [
  // TradFi / 上市公司
  'visa', 'mastercard', 'jpmorgan', 'blackrock', 'coinbase', 'robinhood',
  'square', 'paypal',
  // DeFi 协议
  'aave', 'curve', 'uniswap', 'maker', 'compound',
  // 监管机构
  'sec ', 'occ', 'federal reserve', 'cftc', 'fdic', 'fincen',
  // 通用加密词（太宽泛，必须配合支付上下文）
  'crypto', 'blockchain', 'defi', 'web3', 'digital asset',
  // 金融动作
  'ipo', 'etf', 'custody', 'fintech',
]

// 上下文词 — 弱关键词必须跟这些支付/稳定币相关词共现才算命中
const CONTEXT_WORDS = [
  // 稳定币
  'stablecoin', 'stable', 'usdc', 'usdt', 'pyusd', 'dai', 'usde', 'frax',
  'peg', 'reserve', 'backing', 'mint', 'redeem',
  // 支付/结算
  'payment', 'remittance', 'settlement', 'cross-border', 'transfer',
  'clearing', 'money transmit',
  // 代币化
  'tokeniz', 'rwa', 'real world',
  // 中文
  '稳定币', '支付', '跨境', '结算', '铸造',
]

function classifyArticle(title: string, summary: string | null): MatchStrength | false {
  const text = `${title} ${summary ?? ''}`.toLowerCase()

  if (STRONG_KEYWORDS.some(kw => text.includes(kw))) return 'strong'

  const matchedWeak = WEAK_KEYWORDS.some(kw => text.includes(kw))
  if (matchedWeak && CONTEXT_WORDS.some(ctx => text.includes(ctx))) return 'weak'

  return false
}

// ─── 中文源检测 ───────────────────────────────────────────────────────────────

const ZH_PATTERNS = ['cointelegraph 中文', '吴说区块链', 'chaincatcher', 'blockbeats', 'odaily', 'foresight', 'panewslab', 'marsbit']

function isZhSource(name: string, url: string): boolean {
  const lower = name.toLowerCase()
  return ZH_PATTERNS.some(s => lower.includes(s)) || url.includes('cn.cointelegraph')
}

// ─── RSS 内联全文提取 ─────────────────────────────────────────────────────────
// 部分 RSS 源在 feed 中嵌入完整文章 HTML（DLNews 637KB, Wu Blockchain 586KB 等）
// 直接从 RSS content 提取纯文本，跳过 HTTP 抓取，节省大量时间

function stripHtml(html: string): string | null {
  if (!html || html.length < 100) return null
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  // 只有超过 200 字符才算有效全文（否则只是摘要 HTML）
  return text.length >= 200 ? text.slice(0, 30_000) : null
}

function extractInlineContent(item: RSSItem): string | null {
  // 优先使用 content:encoded（通常是完整文章），其次 content
  const html = item['content:encoded'] ?? item.content
  if (!html) return null
  return stripHtml(html)
}

// ─── Phase 1: 并行抓取 RSS ───────────────────────────────────────────────────

interface CollectedItem {
  news: RawNews
  strength: MatchStrength
  hasInlineContent: boolean
}

interface FeedResult {
  feedName: string
  ok: boolean
  totalItems: number      // RSS 中的总条目（7天内）
  strongCount: number
  weakCount: number
  rejectedCount: number
  collected: CollectedItem[]
}

async function collectFromFeed(feed: { name: string; url: string }): Promise<FeedResult> {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)
  const isZh = isZhSource(feed.name, feed.url)
  const result: FeedResult = {
    feedName: feed.name,
    ok: false,
    totalItems: 0,
    strongCount: 0,
    weakCount: 0,
    rejectedCount: 0,
    collected: [],
  }

  try {
    const parsed = await rssParser.parseURL(feed.url)

    for (const item of parsed.items as RSSItem[]) {
      if (!item.link || !item.title) continue

      const publishedAt = item.pubDate ? new Date(item.pubDate) : null
      if (!publishedAt || isNaN(publishedAt.getTime()) || publishedAt < cutoff) continue
      if (item.link.includes('github.com')) continue

      result.totalItems++

      // Phase 2: 分类
      const strength = classifyArticle(item.title, item.contentSnippet ?? null)
      if (!strength) {
        result.rejectedCount++
        continue
      }

      if (strength === 'strong') result.strongCount++
      else result.weakCount++

      // 尝试从 RSS 内联内容提取全文
      const inlineText = extractInlineContent(item)

      result.collected.push({
        strength,
        hasInlineContent: !!inlineText,
        news: {
          collector: 'rss',
          source_name: feed.name,
          source_url: item.link,
          title: item.title.trim(),
          summary: item.contentSnippet?.slice(0, 500) ?? null,
          full_text: inlineText, // 可能为 null，Phase 4 会补充
          published_at: publishedAt.toISOString(),
          tags: null,
          language: isZh ? 'zh' : 'en',
          processed: false,
        },
      })
    }

    result.ok = true
  } catch (err) {
    console.error(`[A2] ✗ "${feed.name}" 失败:`, err instanceof Error ? err.message.slice(0, 80) : String(err))
  }

  return result
}

// ─── Phase 3: 去重 ───────────────────────────────────────────────────────────

async function deduplicateItems(items: CollectedItem[]): Promise<CollectedItem[]> {
  if (items.length === 0) return []

  // 内存去重
  const seen = new Set<string>()
  const unique = items.filter(item => {
    if (seen.has(item.news.source_url)) return false
    seen.add(item.news.source_url)
    return true
  })

  // DB 去重（单次批量查询）
  const urls = unique.map(i => i.news.source_url)
  const existingUrls = new Set<string>()
  const BATCH = 200

  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH)
    const { data, error } = await supabaseAdmin
      .from('raw_news')
      .select('source_url')
      .in('source_url', batch)

    if (error) {
      console.error('[A2] DB 去重查询失败:', error.message)
      continue
    }
    for (const row of data ?? []) {
      existingUrls.add((row as { source_url: string }).source_url)
    }
  }

  return unique.filter(item => !existingUrls.has(item.news.source_url))
}

// ─── Phase 4: 智能全文提取 ────────────────────────────────────────────────────
// 核心优化：
//   - 强匹配 + 已有内联内容 → 跳过（已从 RSS 提取）
//   - 强匹配 + 无内联内容 → HTTP 抓取全文（V1 源回溯验证需要）
//   - 弱匹配 → 不抓全文（title + summary 足够 B1 fact-splitter 使用）

async function enrichFullText(items: CollectedItem[]): Promise<void> {
  const needFetch = items.filter(i => i.strength === 'strong' && !i.hasInlineContent)

  if (needFetch.length === 0) {
    console.log('[A2] 全文提取: 无需 HTTP 抓取（全部已有内联内容或为弱匹配）')
    return
  }

  const urls = needFetch.map(i => i.news.source_url)
  console.log(`[A2] 全文提取: ${needFetch.length} 篇强匹配需 HTTP 抓取 (concurrency=${FULL_TEXT_CONCURRENCY})`)

  const textMap = await extractContentBatch(urls, FULL_TEXT_CONCURRENCY)

  let enriched = 0
  for (const item of needFetch) {
    const text = textMap.get(item.news.source_url)
    if (text) {
      item.news.full_text = text
      item.hasInlineContent = true // 标记已有全文
      enriched++
    }
  }

  console.log(`[A2] 全文提取完成: ${enriched}/${needFetch.length} 成功`)
}

// ─── Phase 5: 批量入库 ───────────────────────────────────────────────────────

async function upsertItems(items: CollectedItem[]): Promise<number> {
  if (items.length === 0) return 0

  const rows = items.map(i => i.news)
  let inserted = 0

  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const batch = rows.slice(i, i + INSERT_BATCH)
    const { error } = await supabaseAdmin
      .from('raw_news')
      .upsert(batch, { onConflict: 'source_url', ignoreDuplicates: true })

    if (error) {
      console.error(`[A2] 入库批次 ${Math.floor(i / INSERT_BATCH) + 1} 失败:`, error.message)
    } else {
      inserted += batch.length
    }
  }

  return inserted
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function collectNews(): Promise<CollectorResult> {
  const feeds = SOURCES.rssFeeds
  console.log(`[A2] ═══ 开始采集 — ${feeds.length} 个 RSS 源 ═══`)

  // ── Phase 1: 并行抓取 ──
  const feedResults = await Promise.allSettled(feeds.map(f => collectFromFeed(f)))

  const allItems: CollectedItem[] = []
  let totalRssItems = 0
  let totalStrong = 0
  let totalWeak = 0
  let totalRejected = 0
  let feedsOk = 0
  let feedsFail = 0
  const feedCounts: { source: string; count: number }[] = []

  for (let i = 0; i < feedResults.length; i++) {
    const r = feedResults[i]
    if (r.status === 'fulfilled') {
      const fr = r.value
      if (fr.ok) feedsOk++; else feedsFail++
      totalRssItems += fr.totalItems
      totalStrong += fr.strongCount
      totalWeak += fr.weakCount
      totalRejected += fr.rejectedCount
      allItems.push(...fr.collected)
      feedCounts.push({ source: fr.feedName, count: fr.collected.length })
    } else {
      feedsFail++
      feedCounts.push({ source: `${feeds[i].name} (异常)`, count: 0 })
    }
  }

  // ── Phase 2 诊断日志 ──
  console.log(`[A2] ── 过滤漏斗 ──`)
  console.log(`[A2]   RSS 源: ${feedsOk} 成功 / ${feedsFail} 失败`)
  console.log(`[A2]   原始条目 (7天内): ${totalRssItems}`)
  console.log(`[A2]   强匹配: ${totalStrong} | 弱匹配: ${totalWeak} | 拒绝: ${totalRejected}`)
  console.log(`[A2]   通过率: ${totalRssItems > 0 ? ((totalStrong + totalWeak) / totalRssItems * 100).toFixed(1) : 0}%`)

  // ── Phase 3: 去重 ──
  const newItems = await deduplicateItems(allItems)
  const inlineCount = newItems.filter(i => i.hasInlineContent).length
  console.log(`[A2]   去重后新增: ${newItems.length} (${inlineCount} 篇已有内联全文)`)

  if (newItems.length === 0) {
    console.log('[A2] ═══ 无新增，采集结束 ═══')
    return { total: 0, breakdown: feedCounts }
  }

  // ── Phase 4: 智能全文提取 ──
  await enrichFullText(newItems)

  // ── Phase 5: 入库 ──
  const strongItems = newItems.filter(i => i.strength === 'strong')
  const weakItems = newItems.filter(i => i.strength === 'weak')
  const withFullText = newItems.filter(i => i.news.full_text)
  console.log(`[A2]   入库: ${newItems.length} 篇 (${strongItems.length} 强 + ${weakItems.length} 弱, ${withFullText.length} 含全文)`)

  const inserted = await upsertItems(newItems)

  console.log(`[A2] ═══ 采集完成 — ${inserted} 篇入库 ═══`)
  return { total: inserted, breakdown: feedCounts }
}
