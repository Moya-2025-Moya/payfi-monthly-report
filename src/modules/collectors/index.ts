// Module A: Data Collectors — unified entry point
// V2: 4 collectors writing to unified raw_items table
// Removed: on-chain (DeFiLlama), companies (SEC/Yahoo), products (GitHub), funding

import { collectNews } from './news'
import { collectTweets } from './twitter'
import { collectRegulatory } from './regulatory'
import { collectBraveSearch } from './brave-search'
import type { CollectionResult, CollectorResult } from '@/lib/types'

export {
  collectNews,
  collectTweets,
  collectRegulatory,
  collectBraveSearch,
}

// Run all collectors in parallel
export async function runCollection(): Promise<CollectionResult> {
  const start = Date.now()
  const results: Record<string, CollectorResult> = {}

  const collectors = [
    { name: 'news', fn: collectNews },
    { name: 'twitter', fn: collectTweets },
    { name: 'regulatory', fn: collectRegulatory },
    { name: 'brave_search', fn: collectBraveSearch },
  ]

  const settled = await Promise.allSettled(collectors.map(c => c.fn()))

  for (let i = 0; i < settled.length; i++) {
    const r = settled[i]
    const name = collectors[i].name
    if (r.status === 'fulfilled') {
      results[name] = { source: name, status: 'ok', count: r.value }
    } else {
      results[name] = { source: name, status: 'error', count: 0, error: String(r.reason) }
      console.error(`[Collector] ${name} failed:`, r.reason)
    }
  }

  return { results, duration_ms: Date.now() - start }
}
