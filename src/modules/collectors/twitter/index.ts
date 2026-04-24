// Twitter Collector — 仅抓官方账号的推文 (V3)
//
// 设计思想：Twitter 信噪比极低。全网关键词搜索会抓到一堆 KOL / 散户 /
// 项目方营销/空投农夫推文，处理下来 95% 都是噪音。所以我们放弃"全网搜
// 索"策略，只追踪 TWITTER_ACCOUNTS 配置里的官方账号：
//   • 官方媒体（The Block / CoinDesk / …）
//   • 监管/央行（SEC / CFTC / FCA / …）
//   • 发行方/托管/交易所官方账号
//
// KOL / VC / 研究员个人账号**永久排除**——user 明确不要个人观点。

import { SOURCES } from '@/config/sources'
import { TWITTER_ACCOUNTS } from '@/config/twitter-accounts'
import { supabaseAdmin } from '@/db/client'
import { filterLiveItems } from '@/lib/url-check'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawItem {
  source_type: 'twitter'
  source_name: string
  source_url: string
  title: string | null
  content: string
  full_text: null
  language: string | null
  published_at: string
  metadata: {
    author_handle: string
    author_name: string
    author_category: string
    likes: number
    retweets: number
    replies: number
  }
  processed: boolean
}

interface SearchTweet {
  id: string
  text: string
  url?: string
  twitterUrl?: string
  likeCount?: number
  retweetCount?: number
  replyCount?: number
  viewCount?: number
  createdAt?: string
  lang?: string
  isReply?: boolean
  author?: {
    userName?: string
    name?: string
    followers?: number
    isBlueVerified?: boolean
  }
  retweeted_tweet?: unknown
}

interface SearchResponse {
  tweets?: SearchTweet[]
  has_next_page?: boolean
  next_cursor?: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY = SOURCES.twitter.apiKey
const SEARCH_URL = `${SOURCES.twitter.baseUrl}/twitter/tweet/advanced_search`

// 窗口
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// 官方账号不需要粉丝数/互动数过滤——他们的推文本身就是权威信息源。
// 只做一条：不抓纯转推（无原创信息）。

// ─── Search API ───────────────────────────────────────────────────────────────

async function searchTweets(query: string, maxPages: number = 2): Promise<SearchTweet[]> {
  const allTweets: SearchTweet[] = []
  let cursor = ''

  for (let page = 0; page < maxPages; page++) {
    try {
      const params = new URLSearchParams({
        query,
        queryType: 'Latest',
      })
      if (cursor) params.set('cursor', cursor)

      const res = await fetch(`${SEARCH_URL}?${params}`, {
        headers: { 'X-API-Key': API_KEY },
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error(`[twitter] Search failed (${res.status}): ${body.slice(0, 200)}`)
        break
      }

      const data: SearchResponse = await res.json()
      const tweets = data.tweets ?? []
      allTweets.push(...tweets)

      if (!data.has_next_page || !data.next_cursor) break
      cursor = data.next_cursor
    } catch (err) {
      console.error(`[twitter] Search error:`, err instanceof Error ? err.message : String(err))
      break
    }
  }

  return allTweets
}

// ─── 质量过滤 ─────────────────────────────────────────────────────────────────
//
// 账号白名单下不再做粉丝数 / 互动数过滤——官方账号的权威性来自身份，不是
// 流量。只过滤不含原创信息的条目。

function isSubstantiveTweet(tweet: SearchTweet): boolean {
  // 纯转推不含原创信息
  if (tweet.retweeted_tweet) return false

  // 回复也过滤——官方回复用户的多半是客服/互动，不是新闻
  if (tweet.isReply) return false

  // 非英/中文直接跳（其他语言提取器处理不好）
  const lang = tweet.lang ?? ''
  if (lang && !['en', 'zh', 'und', 'qht', 'qme', 'art'].includes(lang)) return false

  // 太短（可能是表情/纯链接）
  if ((tweet.text?.length ?? 0) < 30) return false

  return true
}

function isWithinWindow(tweet: SearchTweet): boolean {
  if (!tweet.createdAt) return false
  const date = new Date(tweet.createdAt)
  if (isNaN(date.getTime())) return false
  return Date.now() - date.getTime() < SEVEN_DAYS_MS
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

function getAuthorCategory(handle: string): string {
  const account = TWITTER_ACCOUNTS.find(
    (a) => a.handle.toLowerCase() === handle.toLowerCase()
  )
  return account?.category ?? 'general'
}

function mapTweet(tweet: SearchTweet): RawItem | null {
  if (!tweet.id || !tweet.text) return null

  const handle = tweet.author?.userName ?? 'unknown'
  const name = tweet.author?.name ?? handle
  const url = tweet.twitterUrl ?? tweet.url ?? `https://twitter.com/${handle}/status/${tweet.id}`

  return {
    source_type: 'twitter',
    source_name: handle,
    source_url: url,
    title: tweet.text.length > 80 ? tweet.text.slice(0, 80) : tweet.text,
    content: tweet.text,
    full_text: null,
    language: tweet.lang ?? null,
    published_at: tweet.createdAt ? new Date(tweet.createdAt).toISOString() : new Date().toISOString(),
    metadata: {
      author_handle: handle,
      author_name: name,
      author_category: getAuthorCategory(handle),
      likes: tweet.likeCount ?? 0,
      retweets: tweet.retweetCount ?? 0,
      replies: tweet.replyCount ?? 0,
    },
    processed: false,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function collectTweets(): Promise<number> {
  if (!API_KEY) {
    console.error('[twitter] TWITTERAPI_IO_KEY not configured, skipping')
    return 0
  }

  console.log(`[twitter] ═══ 开始采集 — ${TWITTER_ACCOUNTS.length} 个官方账号 ═══`)

  const allItems = new Map<string, RawItem>() // dedup by source_url

  // 将多个账号合并到一次搜索（from:A OR from:B OR ...）降低 API 调用数。
  // Twitter 搜索 OR 操作数限制约 ~10，5 条一批最安全。
  const BATCH_SIZE = 5
  const handles = TWITTER_ACCOUNTS.map(a => a.handle)
  for (let i = 0; i < handles.length; i += BATCH_SIZE) {
    const batch = handles.slice(i, i + BATCH_SIZE)
    const query = batch.map(h => `from:${h}`).join(' OR ')
    const results = await searchTweets(query, 2)
    let accepted = 0

    for (const tweet of results) {
      if (!isWithinWindow(tweet)) continue
      if (!isSubstantiveTweet(tweet)) continue
      const mapped = mapTweet(tweet)
      if (mapped && !allItems.has(mapped.source_url)) {
        allItems.set(mapped.source_url, mapped)
        accepted++
      }
    }
    console.log(`[twitter]   [${batch.join(', ')}] → ${results.length} 条, 保留 ${accepted}`)
  }

  // ── 入库 ──
  const dedupedItems = [...allItems.values()]
  console.log(`[twitter] 合计去重后: ${dedupedItems.length} 条`)

  if (dedupedItems.length === 0) {
    console.log('[twitter] ═══ 无推文，采集结束 ═══')
    return 0
  }

  // ── URL 活性校验 ──
  // isUrlAlive 对 twitter.com / x.com 走专用 publish.twitter.com/oembed
  // 端点，已删推文会被该端点以 404 返回。
  const liveCheck = await filterLiveItems(
    dedupedItems,
    i => i.source_url,
    { concurrency: 10, timeoutMs: 6000 },
  )
  if (liveCheck.dead.length > 0) {
    console.log(
      `[twitter]   URL 校验: ${liveCheck.alive.length} 活 / ${liveCheck.dead.length} 死（死推丢弃）`,
    )
  }
  const items = liveCheck.alive
  if (items.length === 0) {
    console.log('[twitter] ═══ 全部死链，采集结束 ═══')
    return 0
  }

  const { error } = await supabaseAdmin
    .from('raw_items')
    .upsert(items, { onConflict: 'source_url', ignoreDuplicates: true })

  if (error) {
    console.error('[twitter] 入库失败:', error.message)
    return 0
  }

  console.log(`[twitter] ═══ 采集完成 — ${items.length} 条入库 ═══`)
  return items.length
}
