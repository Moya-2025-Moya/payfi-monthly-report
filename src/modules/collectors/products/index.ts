import { SOURCES } from '@/config/sources'
import { WATCHLIST } from '@/config/watchlist'
import { supabaseAdmin } from '@/db/client'
import { extractContentBatch } from '@/lib/extract-content'
import RSSParser from 'rss-parser'
import type { CollectorResult } from '@/modules/collectors'

interface RawProductUpdate {
  product_name: string
  source_type: 'blog' | 'github_release' | 'changelog'
  source_url: string
  title: string
  description: string | null
  full_text: string | null
  version: string | null
  published_at: string
  processed: boolean
}

const parser = new RSSParser()

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// 只保留跟稳定币/支付相关的 release，过滤掉内部工具、SDK 补丁等噪音
const RELEVANT_KEYWORDS = [
  'stablecoin', 'stable', 'usdc', 'usdt', 'pyusd', 'dai', 'usde', 'frax',
  'payment', 'transfer', 'bridge', 'mint', 'redeem', 'swap',
  'compliance', 'kyc', 'aml', 'regulation',
  'cross-chain', 'cross-border', 'settlement',
]

function isRelevantRelease(title: string, body: string | null): boolean {
  const text = `${title} ${body ?? ''}`.toLowerCase()
  return RELEVANT_KEYWORDS.some(kw => text.includes(kw))
}

async function collectBlogUpdates(entity: (typeof WATCHLIST)[number]): Promise<RawProductUpdate[]> {
  if (!('blog_rss' in entity) || !entity.blog_rss) return []

  try {
    const feed = await parser.parseURL(entity.blog_rss as string)
    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)
    const updates: RawProductUpdate[] = []

    for (const item of feed.items) {
      if (!item.link || !item.title) continue

      const publishedAt = item.pubDate ? new Date(item.pubDate) : null
      if (!publishedAt || publishedAt < cutoff) continue

      updates.push({
        product_name: entity.name,
        source_type: 'blog',
        source_url: item.link,
        title: item.title,
        description: item.contentSnippet ?? item.summary ?? null,
        full_text: null,
        version: null,
        published_at: publishedAt.toISOString(),
        processed: false,
      })
    }

    return updates
  } catch (err) {
    console.error(`[products] Failed to parse blog RSS for ${entity.name}:`, err)
    return []
  }
}

async function collectGitHubReleases(entity: (typeof WATCHLIST)[number]): Promise<RawProductUpdate[]> {
  if (!('github_org' in entity) || !entity.github_org) return []

  const org = entity.github_org as string
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)
  const updates: RawProductUpdate[] = []

  try {
    const reposRes = await fetch(
      `https://api.github.com/orgs/${org}/repos?sort=updated&per_page=5`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'payfi-monthly-report',
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
      }
    )

    if (!reposRes.ok) {
      console.error(`[products] GitHub repos fetch failed for ${org}: ${reposRes.status}`)
      return []
    }

    const repos: Array<{ name: string }> = await reposRes.json()

    for (const repo of repos) {
      try {
        const releasesRes = await fetch(
          `https://api.github.com/repos/${org}/${repo.name}/releases?per_page=3`,
          {
            headers: {
              Accept: 'application/vnd.github+json',
              'User-Agent': 'payfi-monthly-report',
              ...(process.env.GITHUB_TOKEN
                ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
                : {}),
            },
          }
        )

        if (!releasesRes.ok) continue

        const releases: Array<{
          html_url: string
          name: string | null
          tag_name: string
          body: string | null
          published_at: string
        }> = await releasesRes.json()

        for (const release of releases) {
          const publishedAt = new Date(release.published_at)
          if (publishedAt < cutoff) continue
          if (!isRelevantRelease(release.name ?? release.tag_name, release.body)) continue

          updates.push({
            product_name: entity.name,
            source_type: 'github_release',
            source_url: release.html_url,
            title: release.name ?? release.tag_name,
            description: release.body ?? null,
            full_text: release.body ?? null, // GitHub release body IS the full text
            version: release.tag_name,
            published_at: publishedAt.toISOString(),
            processed: false,
          })
        }
      } catch (err) {
        console.error(`[products] Failed to fetch releases for ${org}/${repo.name}:`, err)
      }
    }
  } catch (err) {
    console.error(`[products] Failed to fetch GitHub repos for ${org}:`, err)
  }

  return updates
}

// ─── Full-text enrichment (for blog posts — GitHub releases already have body) ─

async function enrichWithFullText(items: RawProductUpdate[]): Promise<void> {
  const blogItems = items.filter(i => i.source_type === 'blog' && !i.full_text)
  if (blogItems.length === 0) return

  const urls = blogItems.map(i => i.source_url)
  console.log(`[products] Fetching full text for ${urls.length} blog posts...`)

  const textMap = await extractContentBatch(urls, 5)

  let enriched = 0
  for (const item of blogItems) {
    const text = textMap.get(item.source_url)
    if (text) {
      item.full_text = text
      enriched++
    }
  }

  console.log(`[products] Full text extracted: ${enriched}/${blogItems.length} blog posts`)
}

// ─── Main collector ──────────────────────────────────────────────────────────

export async function collectProductUpdates(): Promise<CollectorResult> {
  console.log('[products] Starting product updates collection...')

  const allUpdates: RawProductUpdate[] = []
  const perEntity: Record<string, number> = {}

  for (const entity of WATCHLIST) {
    const [blogUpdates, githubUpdates] = await Promise.all([
      collectBlogUpdates(entity),
      collectGitHubReleases(entity),
    ])
    const entityTotal = blogUpdates.length + githubUpdates.length
    if (entityTotal > 0) {
      perEntity[entity.name] = entityTotal
    }
    allUpdates.push(...blogUpdates, ...githubUpdates)
  }

  const breakdown = Object.entries(perEntity).map(([source, count]) => ({ source, count }))

  if (allUpdates.length === 0) {
    console.log('[products] No product updates found.')
    return { total: 0, breakdown }
  }

  // Deduplicate by source_url
  const seen = new Set<string>()
  const deduped = allUpdates.filter((u) => {
    if (seen.has(u.source_url)) return false
    seen.add(u.source_url)
    return true
  })

  // Fetch full text for blog posts
  await enrichWithFullText(deduped)

  console.log(`[products] Upserting ${deduped.length} product updates...`)

  const { error } = await supabaseAdmin
    .from('raw_product_updates')
    .upsert(deduped, { onConflict: 'source_url' })

  if (error) {
    console.error('[products] Upsert failed:', error)
    return { total: 0, breakdown }
  } else {
    console.log(`[products] Successfully upserted ${deduped.length} product updates.`)
    return { total: deduped.length, breakdown }
  }
}
