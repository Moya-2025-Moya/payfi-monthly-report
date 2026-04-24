import { REGIONS } from '@/config/regions'
import { supabaseAdmin } from '@/db/client'
import { extractContentBatch } from '@/lib/extract-content'
import { filterLiveItems } from '@/lib/url-check'
import RSSParser from 'rss-parser'

// ─── Raw item shape for raw_items table ──────────────────────────────────────

interface RawItem {
  source_type: 'regulatory' | 'sec'
  source_name: string
  source_url: string
  title: string
  content: string | null
  full_text: string | null
  language: string
  published_at: string
  metadata: { region: string; agency: string; doc_type: string }
  processed: boolean
}

const parser = new RSSParser()

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// ─── Keyword filtering ───────────────────────────────────────────────────────

const STRONG_REGULATORY_KEYWORDS = [
  'stablecoin',
  'stable coin',
  'usdc',
  'usdt',
  'pyusd',
  'circle',
  'tether',
  'paxos',
  'cbdc',
  'digital dollar',
  'digital euro',
  'genius act',
  'mica regulation',
  'money transmission',
  'e-money',
]

const WEAK_REGULATORY_KEYWORDS = [
  'digital asset',
  'crypto',
  'virtual currency',
  'payment',
  'defi',
  'decentralized finance',
  'blockchain',
]

const WEAK_REGULATORY_CONTEXT = [
  'stablecoin',
  'stable',
  'usdc',
  'usdt',
  'payment system',
  'money service',
  'remittance',
  'settlement',
  'e-money',
  'stored value',
]

// ─── Constants ───────────────────────────────────────────────────────────────

const SEC_EFTS_URL = 'https://efts.sec.gov/LATEST/search-index'
const SEC_NEWS_RSS = 'https://www.sec.gov/cgi-bin/rss/news_feed.atom'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function inferDocType(title: string, description: string | null): string {
  const text = `${title} ${description ?? ''}`.toLowerCase()
  if (text.includes('press release') || text.includes('press-release')) return 'press_release'
  if (text.includes('rule') || text.includes('rulemaking')) return 'rule'
  if (text.includes('guidance') || text.includes('guidance letter')) return 'guidance'
  if (text.includes('order')) return 'order'
  if (text.includes('notice')) return 'notice'
  if (text.includes('statement')) return 'statement'
  if (text.includes('report')) return 'report'
  if (text.includes('alert')) return 'alert'
  return 'filing'
}

function inferAgency(title: string, description: string | null, defaultAgency: string): string {
  const text = `${title} ${description ?? ''}`.toLowerCase()
  if (text.includes('sec') || text.includes('securities and exchange')) return 'SEC'
  if (text.includes('cftc') || text.includes('commodity futures')) return 'CFTC'
  if (text.includes('occ') || text.includes('office of the comptroller')) return 'OCC'
  if (text.includes('fdic')) return 'FDIC'
  if (text.includes('federal reserve') || text.includes('fed reserve')) return 'Federal Reserve'
  if (text.includes('fincen')) return 'FinCEN'
  if (text.includes('treasury')) return 'Treasury'
  return defaultAgency
}

function containsRegulatoryKeyword(text: string): boolean {
  const lower = text.toLowerCase()

  if (STRONG_REGULATORY_KEYWORDS.some((kw) => lower.includes(kw))) {
    return true
  }

  const hasWeak = WEAK_REGULATORY_KEYWORDS.some((kw) => lower.includes(kw))
  if (hasWeak) {
    return WEAK_REGULATORY_CONTEXT.some((ctx) => lower.includes(ctx))
  }

  return false
}

// ─── Source: SEC RSS ─────────────────────────────────────────────────────────

async function collectSecRss(): Promise<RawItem[]> {
  const results: RawItem[] = []
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)

  try {
    const feed = await parser.parseURL(SEC_NEWS_RSS)

    for (const item of feed.items) {
      if (!item.link || !item.title) continue

      const publishedAt = item.pubDate ? new Date(item.pubDate) : null
      if (!publishedAt || publishedAt < cutoff) continue

      const description = item.contentSnippet ?? item.summary ?? null
      const combinedText = `${item.title} ${description ?? ''}`
      if (!containsRegulatoryKeyword(combinedText)) continue

      const agency = inferAgency(item.title, description, 'SEC')

      results.push({
        source_type: 'regulatory',
        source_name: agency,
        source_url: item.link,
        title: item.title,
        content: description,
        full_text: null,
        language: 'en',
        published_at: publishedAt.toISOString(),
        metadata: {
          region: 'US',
          agency,
          doc_type: inferDocType(item.title, description),
        },
        processed: false,
      })
    }
  } catch (err) {
    console.error('[regulatory] Failed to fetch SEC RSS:', err)
  }

  return results
}

// ─── Source: SEC EFTS ────────────────────────────────────────────────────────

async function collectSecEfts(): Promise<RawItem[]> {
  const results: RawItem[] = []
  const now = new Date()
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS)

  const params = new URLSearchParams({
    q: 'stablecoin',
    dateRange: 'custom',
    startdt: formatDate(sevenDaysAgo),
    enddt: formatDate(now),
  })

  try {
    const res = await fetch(`${SEC_EFTS_URL}?${params}`, {
      headers: { 'User-Agent': 'payfi-monthly-report/1.0' },
    })

    if (!res.ok) {
      console.error(`[regulatory] SEC EFTS fetch failed: ${res.status}`)
      return []
    }

    const data: {
      hits?: {
        hits?: Array<{
          _source?: {
            file_date?: string
            display_names?: Array<{ name: string }>
            period_of_report?: string
            form_type?: string
            file_num?: string
            entity_name?: string
          }
          _id?: string
        }>
      }
    } = await res.json()

    const hits = data.hits?.hits ?? []

    for (const hit of hits) {
      const source = hit._source
      if (!source) continue

      const entityName = source.entity_name ?? source.display_names?.[0]?.name ?? 'Unknown'
      const fileDate = source.file_date ? new Date(source.file_date) : null
      if (!fileDate) continue

      const filingId = hit._id ?? ''
      const sourceUrl = filingId
        ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=${source.file_num ?? filingId}`
        : 'https://efts.sec.gov'

      const title = `${source.form_type ?? 'Filing'} — ${entityName}`

      results.push({
        source_type: 'sec',
        source_name: 'SEC',
        source_url: sourceUrl,
        title,
        content: null,
        full_text: null,
        language: 'en',
        published_at: fileDate.toISOString(),
        metadata: {
          region: 'US',
          agency: 'SEC',
          doc_type: source.form_type ?? 'filing',
        },
        processed: false,
      })
    }
  } catch (err) {
    console.error('[regulatory] Failed to fetch SEC EFTS:', err)
  }

  return results
}

// ─── Source: Regional RSS ────────────────────────────────────────────────────

async function collectRegionRssSources(): Promise<RawItem[]> {
  const results: RawItem[] = []
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)

  for (const region of REGIONS) {
    if (!('rss_sources' in region) || !Array.isArray(region.rss_sources)) continue

    for (const rssUrl of region.rss_sources) {
      try {
        const feed = await parser.parseURL(rssUrl)

        for (const item of feed.items) {
          if (!item.link || !item.title) continue

          const publishedAt = item.pubDate ? new Date(item.pubDate) : null
          if (!publishedAt || publishedAt < cutoff) continue

          const description = item.contentSnippet ?? item.summary ?? null
          const combinedText = `${item.title} ${description ?? ''}`
          if (!containsRegulatoryKeyword(combinedText)) continue

          const agency = inferAgency(item.title, description, region.agencies[0] ?? 'Unknown')

          results.push({
            source_type: 'regulatory',
            source_name: agency,
            source_url: item.link,
            title: item.title,
            content: description,
            full_text: null,
            language: 'en',
            published_at: publishedAt.toISOString(),
            metadata: {
              region: region.code,
              agency,
              doc_type: inferDocType(item.title, description),
            },
            processed: false,
          })
        }
      } catch (err) {
        console.error(`[regulatory] Failed to fetch RSS for ${region.code} (${rssUrl}):`, err)
      }
    }
  }

  return results
}

// ─── Full-text enrichment ────────────────────────────────────────────────────

async function enrichWithFullText(items: RawItem[]): Promise<void> {
  const urls = items.map((i) => i.source_url)
  console.log(`[regulatory] Fetching full text for ${urls.length} items...`)

  const textMap = await extractContentBatch(urls, 5)

  let enriched = 0
  for (const item of items) {
    const text = textMap.get(item.source_url)
    if (text) {
      item.full_text = text
      enriched++
    }
  }

  console.log(`[regulatory] Full text extracted: ${enriched}/${items.length}`)
}

// ─── Main collector ──────────────────────────────────────────────────────────

export async function collectRegulatory(): Promise<number> {
  console.log('[regulatory] Starting regulatory collection...')

  const [secRss, secEfts, regionRss] = await Promise.all([
    collectSecRss(),
    collectSecEfts(),
    collectRegionRssSources(),
  ])

  console.log(
    `[regulatory] Sources — SEC RSS: ${secRss.length}, SEC EFTS: ${secEfts.length}, Regional RSS: ${regionRss.length}`
  )

  const allItems = [...secRss, ...secEfts, ...regionRss]

  if (allItems.length === 0) {
    console.log('[regulatory] No regulatory items found.')
    return 0
  }

  // Deduplicate by source_url in-memory
  const seen = new Set<string>()
  const deduped = allItems.filter((item) => {
    if (seen.has(item.source_url)) return false
    seen.add(item.source_url)
    return true
  })

  // URL liveness filter — SEC EDGAR URLs are very stable but RSS items from
  // non-US regulators occasionally 404 (feed mirrors that roll off, etc.).
  const liveCheck = await filterLiveItems(
    deduped,
    it => it.source_url,
    { concurrency: 8, timeoutMs: 6000 },
  )
  if (liveCheck.dead.length > 0) {
    console.log(
      `[regulatory] URL check: ${liveCheck.alive.length} live / ${liveCheck.dead.length} dead (dropped)`,
    )
  }
  const liveItems = liveCheck.alive
  if (liveItems.length === 0) {
    console.log('[regulatory] No live URLs; skipping upsert.')
    return 0
  }

  // Fetch full text for all items
  await enrichWithFullText(liveItems)

  console.log(`[regulatory] Upserting ${liveItems.length} items to raw_items...`)

  const { error } = await supabaseAdmin
    .from('raw_items')
    .upsert(liveItems, { onConflict: 'source_url', ignoreDuplicates: true })

  if (error) {
    console.error('[regulatory] Upsert failed:', error)
    return 0
  }

  console.log(`[regulatory] Successfully upserted ${liveItems.length} items.`)
  return liveItems.length
}
