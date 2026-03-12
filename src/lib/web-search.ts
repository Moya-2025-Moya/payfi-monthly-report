// Lightweight web search via Brave Search API (free tier: 2000 queries/month)
// Falls back gracefully if BRAVE_SEARCH_API_KEY is not set

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY

export interface WebSearchResult {
  title: string
  url: string
  description: string
  date: string | null
}

/**
 * Search the web for recent articles. Returns top N results.
 * Returns empty array if API key is not configured.
 */
export async function searchWeb(query: string, count = 5): Promise<WebSearchResult[]> {
  if (!BRAVE_API_KEY) {
    console.log('[web-search] BRAVE_SEARCH_API_KEY not set, skipping')
    return []
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(count),
      freshness: 'py', // past year
      text_decorations: 'false',
    })

    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    })

    if (!res.ok) {
      console.error(`[web-search] Brave API returned ${res.status}`)
      return []
    }

    const data = await res.json() as {
      web?: {
        results?: Array<{
          title: string
          url: string
          description: string
          page_age?: string
          age?: string
        }>
      }
    }

    return (data.web?.results ?? []).map(r => ({
      title: r.title,
      url: r.url,
      description: r.description,
      date: r.page_age ?? r.age ?? null,
    }))
  } catch (err) {
    console.error('[web-search] Failed:', err instanceof Error ? err.message : String(err))
    return []
  }
}
