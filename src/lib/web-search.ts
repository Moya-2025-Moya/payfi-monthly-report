// Web search via Brave + Google, merged and deduplicated

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY
const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY
const GOOGLE_CX = process.env.GOOGLE_SEARCH_CX

export interface WebSearchResult {
  title: string
  url: string
  description: string
  date: string | null
  source: 'brave' | 'google'
}

async function searchBrave(query: string, count: number): Promise<WebSearchResult[]> {
  if (!BRAVE_API_KEY) return []
  try {
    const params = new URLSearchParams({
      q: query, count: String(count), freshness: 'py', text_decorations: 'false',
    })
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: { 'Accept': 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': BRAVE_API_KEY },
    })
    if (!res.ok) { console.error(`[brave] HTTP ${res.status}`); return [] }
    const data = await res.json() as {
      web?: { results?: Array<{ title: string; url: string; description: string; page_age?: string; age?: string }> }
    }
    return (data.web?.results ?? []).map(r => ({
      title: r.title, url: r.url, description: r.description,
      date: r.page_age ?? r.age ?? null, source: 'brave' as const,
    }))
  } catch (err) { console.error('[brave] Failed:', err instanceof Error ? err.message : String(err)); return [] }
}

async function searchGoogle(query: string, count: number): Promise<WebSearchResult[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) return []
  try {
    const params = new URLSearchParams({
      key: GOOGLE_API_KEY, cx: GOOGLE_CX, q: query, num: String(Math.min(count, 10)),
      dateRestrict: 'y1', // past year
    })
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`)
    if (!res.ok) { console.error(`[google] HTTP ${res.status}`); return [] }
    const data = await res.json() as {
      items?: Array<{ title: string; link: string; snippet: string; pagemap?: { metatags?: Array<{ 'article:published_time'?: string }> } }>
    }
    return (data.items ?? []).map(r => ({
      title: r.title, url: r.link, description: r.snippet,
      date: r.pagemap?.metatags?.[0]?.['article:published_time']?.split('T')[0] ?? null,
      source: 'google' as const,
    }))
  } catch (err) { console.error('[google] Failed:', err instanceof Error ? err.message : String(err)); return [] }
}

/**
 * Search both Brave + Google, merge and deduplicate by URL domain+path.
 */
export async function searchWeb(query: string, count = 5): Promise<WebSearchResult[]> {
  const [braveResults, googleResults] = await Promise.all([
    searchBrave(query, count),
    searchGoogle(query, count),
  ])

  // Deduplicate by normalized URL
  const seen = new Set<string>()
  const merged: WebSearchResult[] = []

  for (const r of [...braveResults, ...googleResults]) {
    const key = r.url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(r)
  }

  return merged.slice(0, count * 2) // return up to 2x count since we have 2 sources
}
