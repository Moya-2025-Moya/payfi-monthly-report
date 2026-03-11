import { SOURCES } from '@/config/sources'
import { TWITTER_ACCOUNTS } from '@/config/twitter-accounts'
import { supabaseAdmin } from '@/db/client'

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

interface TweetApiItem {
  id: string
  text: string
  author?: {
    userName?: string
    name?: string
  }
  likeCount?: number
  retweetCount?: number
  replyCount?: number
  createdAt?: string
}

interface MonitoredTweetsResponse {
  tweets?: TweetApiItem[]
  data?: TweetApiItem[]
}

// Starter plan limit: 6 monitored accounts
const PRIORITY_HANDLES = [
  'jerallaire',
  'paaborsch',
  'cdixon',
  'nic__carter',
  'MessariCrypto',
  'tokenterminal',
]

function buildTweetUrl(handle: string, tweetId: string): string {
  return `https://twitter.com/${handle}/status/${tweetId}`
}

async function registerMonitoredAccount(handle: string): Promise<void> {
  try {
    const res = await fetch(
      `${SOURCES.twitter.baseUrl}${SOURCES.twitter.endpoints.addMonitor}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': SOURCES.twitter.apiKey,
        },
        body: JSON.stringify({ x_user_name: handle }),
      }
    )

    if (!res.ok) {
      const body = await res.text()
      console.error(`[twitter] Failed to register monitor for @${handle}: ${res.status} ${body}`)
    } else {
      console.log(`[twitter] Registered monitor for @${handle}`)
    }
  } catch (err) {
    console.error(`[twitter] Error registering monitor for @${handle}:`, err)
  }
}

async function fetchMonitoredTweets(handle: string): Promise<TweetApiItem[]> {
  try {
    const url = `${SOURCES.twitter.baseUrl}/oapi/x_user_stream/get_monitored_tweets?x_user_name=${encodeURIComponent(handle)}`
    const res = await fetch(url, {
      headers: {
        'X-API-Key': SOURCES.twitter.apiKey,
      },
    })

    if (!res.ok) {
      console.error(`[twitter] Failed to fetch tweets for @${handle}: ${res.status}`)
      return []
    }

    const data: MonitoredTweetsResponse = await res.json()
    return data.tweets ?? data.data ?? []
  } catch (err) {
    console.error(`[twitter] Error fetching tweets for @${handle}:`, err)
    return []
  }
}

function getAuthorCategory(handle: string): string {
  const account = TWITTER_ACCOUNTS.find(
    (a) => a.handle.toLowerCase() === handle.toLowerCase()
  )
  return account?.category ?? 'general'
}

function mapTweet(tweet: TweetApiItem, handle: string): RawTweet | null {
  if (!tweet.id || !tweet.text) return null

  const authorHandle = tweet.author?.userName ?? handle
  const authorName = tweet.author?.name ?? handle

  return {
    author_handle: authorHandle,
    author_name: authorName,
    author_category: getAuthorCategory(handle),
    source_url: buildTweetUrl(authorHandle, tweet.id),
    content: tweet.text,
    likes: tweet.likeCount ?? 0,
    retweets: tweet.retweetCount ?? 0,
    replies: tweet.replyCount ?? 0,
    posted_at: tweet.createdAt ? new Date(tweet.createdAt).toISOString() : new Date().toISOString(),
    processed: false,
  }
}

export async function collectTweets(): Promise<void> {
  console.log('[twitter] Starting tweet collection...')

  // Register the priority accounts for monitoring
  for (const handle of PRIORITY_HANDLES) {
    await registerMonitoredAccount(handle)
  }

  // Fetch tweets from all monitored accounts
  const allTweets: RawTweet[] = []

  for (const handle of PRIORITY_HANDLES) {
    const tweets = await fetchMonitoredTweets(handle)
    for (const tweet of tweets) {
      const mapped = mapTweet(tweet, handle)
      if (mapped) allTweets.push(mapped)
    }
  }

  if (allTweets.length === 0) {
    console.log('[twitter] No tweets collected.')
    return
  }

  // Deduplicate by source_url
  const seen = new Set<string>()
  const deduped = allTweets.filter((t) => {
    if (seen.has(t.source_url)) return false
    seen.add(t.source_url)
    return true
  })

  console.log(`[twitter] Upserting ${deduped.length} tweets...`)

  const { error } = await supabaseAdmin
    .from('raw_tweets')
    .upsert(deduped, { onConflict: 'source_url' })

  if (error) {
    console.error('[twitter] Upsert failed:', error)
  } else {
    console.log(`[twitter] Successfully upserted ${deduped.length} tweets.`)
  }
}
