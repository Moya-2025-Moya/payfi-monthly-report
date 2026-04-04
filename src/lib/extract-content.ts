// Full-text content extraction from URLs using Mozilla Readability + linkedom
// linkedom is a CommonJS-compatible DOM implementation that works on Vercel serverless
// (jsdom has ESM transitive dependencies that break in Vercel's Node runtime)

const FETCH_TIMEOUT_MS = 15_000
const MAX_HTML_SIZE = 2_000_000 // 2MB — skip huge pages
const MAX_TEXT_LENGTH = 30_000 // truncate extremely long articles

const USER_AGENT =
  'Mozilla/5.0 (compatible; StablePulse/1.0; +https://github.com/stablepulse)'

/**
 * Fetch a URL and extract the main article text using Readability.
 * Returns null on any failure (network, parse, empty content).
 */
export async function extractContent(
  url: string
): Promise<{ title: string; text: string } | null> {
  try {
    // linkedom is CommonJS-compatible; Readability works with any DOM implementation
    const { parseHTML } = await import('linkedom')
    const { Readability } = await import('@mozilla/readability')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timer)

    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('html')) return null

    const html = await res.text()
    if (html.length > MAX_HTML_SIZE) return null

    const { document } = parseHTML(html)
    const reader = new Readability(document as unknown as Document)
    const article = reader.parse()

    if (!article?.textContent || article.textContent.trim().length < 50) {
      return null
    }

    const text =
      article.textContent.length > MAX_TEXT_LENGTH
        ? article.textContent.slice(0, MAX_TEXT_LENGTH)
        : article.textContent

    return {
      title: article.title ?? '',
      text: text.trim(),
    }
  } catch (err) {
    console.error('[extract-content] Failed for', url, ':', err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Batch-extract content from multiple URLs with concurrency control.
 * Returns a Map from URL → extracted text (null entries are omitted).
 */
export async function extractContentBatch(
  urls: string[],
  concurrency = 5
): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  const queue = [...urls]

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift()!
      const content = await extractContent(url)
      if (content) {
        results.set(url, content.text)
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () =>
    worker()
  )
  await Promise.all(workers)

  return results
}
