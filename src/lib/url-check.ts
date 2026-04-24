// URL liveness check — used before the Telegram digest is rendered so we
// never publish a link that 404s.
//
// KNOWN LIMITATIONS: from a serverless region (Vercel IP), a reliable 100%
// 404 check is not achievable against modern publishers:
//   • Cloudflare bot-protected sites (The Block, Blockworks, CoinDesk on many
//     paths) return a challenge page identically for real articles AND fake
//     paths — the challenge page IS a 200 OK. We treat these as ALIVE, since
//     a real user's browser will usually pass the challenge and reach the
//     article (different IP reputation, cookies, etc.).
//   • Pure-SPA sites (Cointelegraph articles, Twitter/X) return the same HTML
//     shell regardless of path — the 404 state is rendered client-side only.
//
// What we CAN reliably catch:
//   • DNS failures, malformed URLs, non-http(s) protocols.
//   • Legacy servers that still return 404/410 at the HTTP layer (SEC EDGAR,
//     many WordPress sites, etc.).
//   • Redirects to /404, /not-found, /error paths.
//   • Redirects from an article path down to the bare homepage.
//   • Substring markers in the first ~32KB of body ("page not found",
//     "this tweet was deleted", etc.) and in <title>.
//   • `og:type=article` + `article:published_time` presence = strong alive
//     signal (real articles always emit these; 404 pages don't).
//   • Twitter/X deleted tweets — validated via the publish.twitter.com
//     oembed endpoint, which returns 404 for gone tweets.
//
// Conservative stance: we err on the side of ALIVE when signals are mixed,
// because a false-drop (real article skipped) is worse than a false-keep
// (user clicks and sees a 404 once in a while). Empirically this catches
// ~60-80% of real 404s on the major crypto publishers; total coverage
// requires per-site logic at the collector layer and is out of scope here.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

const DEFAULT_TIMEOUT_MS = 6000
const BODY_SAMPLE_BYTES = 32 * 1024

const HARD_DEAD = new Set([404, 410])

// Path patterns publishers redirect dead articles to.
const DEAD_PATH_RE = /(^|\/)(404|not[-_]?found|error|page-not-found|gone)(\/|$)/i

// Body substrings that strongly indicate a 404 shell. Keep this list specific
// to avoid false-positive on real articles that discuss 404s.
const DEAD_BODY_MARKERS = [
  'page not found',
  'article not found',
  'post not found',
  "page you're looking for",
  'page you are looking for',
  "couldn't find that page",
  "can't find that page",
  "this page doesn't exist",
  'this page does not exist',
  'this tweet was deleted',
  'this post is unavailable',
  "this content isn't available",
  'this content is not available',
  '找不到页面',
  '页面不存在',
  '页面未找到',
  '文章不存在',
]

const DEAD_TITLE_MARKERS = ['404', 'not found', 'page not found', '页面不存在', '找不到']

// Meta tags that real article pages reliably emit and 404 pages don't.
const ALIVE_ARTICLE_RE =
  /<meta\s+[^>]*property=["']og:type["']\s+content=["']article["']|<meta\s+[^>]*property=["']article:published_time["']/i

interface Probe {
  status: number
  finalUrl: string
  body: string
}

async function probe(
  url: string,
  method: 'HEAD' | 'GET',
  timeoutMs: number,
): Promise<Probe | null> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: ctl.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    let body = ''
    if (method === 'GET' && res.body) {
      try {
        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8', { fatal: false })
        let total = 0
        while (total < BODY_SAMPLE_BYTES) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            body += decoder.decode(value, { stream: true })
            total += value.byteLength
          }
        }
        try { await reader.cancel() } catch { /* ignore */ }
      } catch {
        // stream abort / decode issue — partial body is acceptable.
      }
    }
    return { status: res.status, finalUrl: res.url, body }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function isHomepageRedirect(originalUrl: string, finalUrl: string): boolean {
  try {
    const orig = new URL(originalUrl)
    const fin = new URL(finalUrl)
    const sameHost =
      orig.hostname.replace(/^www\./, '') === fin.hostname.replace(/^www\./, '')
    const origHadPath = orig.pathname && orig.pathname !== '/' && orig.pathname !== ''
    const finalIsHome = fin.pathname === '/' || fin.pathname === ''
    return sameHost && !!origHadPath && finalIsHome
  } catch {
    return false
  }
}

function looksDead(p: Probe, originalUrl: string): boolean {
  if (HARD_DEAD.has(p.status)) return true
  if (p.status >= 500 && p.status < 600) return true

  try {
    const finalPath = new URL(p.finalUrl).pathname
    if (finalPath && DEAD_PATH_RE.test(finalPath)) return true
  } catch { /* ignore */ }

  if (isHomepageRedirect(originalUrl, p.finalUrl)) return true

  if (p.body) {
    // Strong ALIVE signal from article metadata — short-circuit to alive.
    if (ALIVE_ARTICLE_RE.test(p.body)) return false

    const lower = p.body.toLowerCase()
    for (const m of DEAD_BODY_MARKERS) if (lower.includes(m)) return true
    const titleMatch = p.body.match(/<title[^>]*>([^<]*)<\/title>/i)
    if (titleMatch) {
      const title = titleMatch[1].toLowerCase().trim()
      for (const m of DEAD_TITLE_MARKERS) if (title.includes(m)) return true
    }
  }

  return false
}

// Twitter/X-specific: publish.twitter.com/oembed returns 404 for deleted or
// nonexistent tweets and 200 for live ones. This works even though twitter.com
// itself returns 200 for everything.
async function isTweetAlive(url: string, timeoutMs: number): Promise<boolean> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const oembed = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`
    const res = await fetch(oembed, {
      method: 'GET',
      signal: ctl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    })
    if (res.status === 404) return false
    return res.ok
  } catch {
    // Network flake on the oembed endpoint — trust the original URL rather
    // than drop a potentially live tweet.
    return true
  } finally {
    clearTimeout(t)
  }
}

function isTwitterUrl(parsed: URL): boolean {
  const h = parsed.hostname.replace(/^www\./, '')
  return h === 'twitter.com' || h === 'x.com' || h === 'mobile.twitter.com'
}

export async function isUrlAlive(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<boolean> {
  let parsed: URL
  try { parsed = new URL(url) } catch { return false }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

  if (isTwitterUrl(parsed)) {
    return isTweetAlive(url, timeoutMs)
  }

  // HEAD catches DNS failures and legacy-server 404s.
  const head = await probe(url, 'HEAD', timeoutMs)
  if (head && HARD_DEAD.has(head.status)) return false
  if (head && head.status >= 500 && head.status < 600) {
    const getRes = await probe(url, 'GET', timeoutMs)
    if (!getRes) return false
    return !looksDead(getRes, url)
  }

  // GET body scan for soft-404s. If HEAD succeeded but GET fails network-
  // level, be lenient (treat as alive).
  const getRes = await probe(url, 'GET', timeoutMs)
  if (!getRes) return !!head
  return !looksDead(getRes, url)
}

export async function pickLiveUrl(
  urls: string[],
  timeoutMs?: number,
): Promise<string | null> {
  for (const url of urls) {
    if (await isUrlAlive(url, timeoutMs)) return url
  }
  return null
}

// Collector-side bulk filter. Runs isUrlAlive concurrently across `items`,
// limited to `concurrency` in flight at any time. Returns items whose URL
// (via `urlOf(item)`) is alive.
//
// Concurrency matters: 40 HEAD+GETs in parallel is fine, but 300+ against
// the same few hosts can get us rate-limited. Default 10 is empirically
// safe against the publishers we collect from.
export async function filterLiveItems<T>(
  items: T[],
  urlOf: (item: T) => string,
  opts: { concurrency?: number; timeoutMs?: number } = {},
): Promise<{ alive: T[]; dead: T[] }> {
  const concurrency = opts.concurrency ?? 10
  const timeoutMs = opts.timeoutMs ?? 6000

  const alive: T[] = []
  const dead: T[] = []
  let next = 0

  async function worker(): Promise<void> {
    while (true) {
      const i = next++
      if (i >= items.length) return
      const item = items[i]
      const live = await isUrlAlive(urlOf(item), timeoutMs)
      if (live) alive.push(item)
      else dead.push(item)
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  )
  await Promise.all(workers)
  return { alive, dead }
}
