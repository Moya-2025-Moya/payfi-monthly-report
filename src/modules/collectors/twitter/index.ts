// A6 Twitter Collector — 双策略采集
//
// 策略 1: 关键词搜索 — 全网搜索稳定币/PayFi 相关推文（高召回）
// 策略 2: 账号搜索 — 搜索核心人物的推文（高精度）
//
// 为什么不用 Monitor 模式：
//   Monitor 需要预注册账号（Starter 限 6 个），且只能拿注册后的新推文。
//   Search API 无账号数量限制，且能拿到所有历史推文。

import { SOURCES } from '@/config/sources'
import { TWITTER_ACCOUNTS } from '@/config/twitter-accounts'
import { supabaseAdmin } from '@/db/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawTweet {
  author_handle: string
  author_name: string
  author_category: string
  source_url: string
  content: string
  likes: number
  retweets: number
  replies: number
  posted_at: string
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

// 关键词搜索查询 — 稳定币/PayFi 核心词
const KEYWORD_QUERIES = [
  'stablecoin OR "stable coin" OR "稳定币"',
  'USDC OR USDT OR PYUSD OR DAI OR USDe',
  '"cross-border payment" OR "crypto payment" OR payfi OR "stablecoin payment"',
  'CBDC OR "digital dollar" OR "digital euro"',
  'tokenization RWA stablecoin',
]

// 核心账号搜索 — 不受 Monitor 6 个限制
const PRIORITY_ACCOUNTS = [
  // 稳定币发行方
  'jerallaire',     // Circle CEO
  'paaborsch',      // Tether CTO
  'RuneKek',        // MakerDAO Founder
  // 稳定币基础设施
  'zabornjak',      // Bridge.xyz CEO
  // 稳定币研究/数据
  'staborcoins',    // Stablecoins.wtf
  'theaboringguy',  // Stablecoin Researcher
  // PayFi / 支付
  'nic__carter',    // Castle Island Ventures (stablecoin focus)
  'MessariCrypto',  // Crypto Research
]

// 过滤阈值 — 去掉低质量/垃圾推文
const MIN_FOLLOWERS = 50       // 作者至少 50 粉丝
const MIN_ENGAGEMENT = 2       // 至少 2 个互动（likes + retweets + replies）
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

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

function isQualityTweet(tweet: SearchTweet): boolean {
  // 过滤回复（通常是噪音）
  if (tweet.isReply) return false

  // 过滤转推
  if (tweet.retweeted_tweet) return false

  // 过滤低粉丝账号（防垃圾）
  const followers = tweet.author?.followers ?? 0
  if (followers < MIN_FOLLOWERS) return false

  // 过滤零互动推文
  const engagement = (tweet.likeCount ?? 0) + (tweet.retweetCount ?? 0) + (tweet.replyCount ?? 0)
  if (engagement < MIN_ENGAGEMENT) return false

  // 过滤非英文/中文
  const lang = tweet.lang ?? ''
  if (lang && !['en', 'zh', 'und', 'qht', 'qme', 'art'].includes(lang)) return false

  // 过滤太短的推文（可能是表情/链接 only）
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

function mapTweet(tweet: SearchTweet): RawTweet | null {
  if (!tweet.id || !tweet.text) return null

  const handle = tweet.author?.userName ?? 'unknown'
  const name = tweet.author?.name ?? handle
  const url = tweet.twitterUrl ?? tweet.url ?? `https://twitter.com/${handle}/status/${tweet.id}`

  return {
    author_handle: handle,
    author_name: name,
    author_category: getAuthorCategory(handle),
    source_url: url,
    content: tweet.text,
    likes: tweet.likeCount ?? 0,
    retweets: tweet.retweetCount ?? 0,
    replies: tweet.replyCount ?? 0,
    posted_at: tweet.createdAt ? new Date(tweet.createdAt).toISOString() : new Date().toISOString(),
    processed: false,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function collectTweets(): Promise<number> {
  if (!API_KEY) {
    console.error('[twitter] TWITTERAPI_IO_KEY not configured, skipping')
    return 0
  }

  console.log('[twitter] ═══ 开始采集 ═══')

  const allTweets = new Map<string, RawTweet>() // dedup by tweet URL

  // ── 策略 1: 关键词搜索 ──
  console.log(`[twitter] 策略1: ${KEYWORD_QUERIES.length} 组关键词搜索`)
  for (const query of KEYWORD_QUERIES) {
    const results = await searchTweets(query, 2) // 2 pages per query
    let accepted = 0
    for (const tweet of results) {
      if (!isWithinWindow(tweet) || !isQualityTweet(tweet)) continue
      const mapped = mapTweet(tweet)
      if (mapped && !allTweets.has(mapped.source_url)) {
        allTweets.set(mapped.source_url, mapped)
        accepted++
      }
    }
    console.log(`[twitter]   "${query.slice(0, 40)}..." → ${results.length} 条, 保留 ${accepted}`)
  }

  // ── 策略 2: 核心账号搜索 ──
  // 将多个账号合并到一次搜索（减少 API 调用）
  const BATCH_SIZE = 5 // Twitter 搜索 OR 操作数限制
  for (let i = 0; i < PRIORITY_ACCOUNTS.length; i += BATCH_SIZE) {
    const batch = PRIORITY_ACCOUNTS.slice(i, i + BATCH_SIZE)
    const query = batch.map(h => `from:${h}`).join(' OR ')
    const results = await searchTweets(query, 2)
    let accepted = 0

    for (const tweet of results) {
      if (!isWithinWindow(tweet)) continue
      // 核心账号不做质量过滤（他们的推文都是有价值的）
      const mapped = mapTweet(tweet)
      if (mapped && !allTweets.has(mapped.source_url)) {
        allTweets.set(mapped.source_url, mapped)
        accepted++
      }
    }
    console.log(`[twitter]   账号搜索 [${batch.join(', ')}] → ${results.length} 条, 保留 ${accepted}`)
  }

  // ── 入库 ──
  const tweets = [...allTweets.values()]
  console.log(`[twitter] 合计去重后: ${tweets.length} 条`)

  if (tweets.length === 0) {
    console.log('[twitter] ═══ 无推文，采集结束 ═══')
    return 0
  }

  const { error } = await supabaseAdmin
    .from('raw_tweets')
    .upsert(tweets, { onConflict: 'source_url', ignoreDuplicates: true })

  if (error) {
    console.error('[twitter] 入库失败:', error.message)
    return 0
  }

  console.log(`[twitter] ═══ 采集完成 — ${tweets.length} 条入库 ═══`)
  return tweets.length
}
