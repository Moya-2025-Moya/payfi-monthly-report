// Module A: Data Collectors — unified entry point
// V2: 4 collectors writing to unified raw_items table
// Removed: on-chain (DeFiLlama), companies (SEC/Yahoo), products (GitHub), funding

import { collectNews } from './news'
import { collectTweets } from './twitter'
import { collectRegulatory } from './regulatory'
import { collectBraveSearch } from './brave-search'
import type { CollectionResult, CollectorResult } from '@/lib/types'
import type { ProgressReporter } from '@/lib/pipeline-progress'

export {
  collectNews,
  collectTweets,
  collectRegulatory,
  collectBraveSearch,
}

// Run all collectors in parallel. If a reporter is provided, each collector's
// start/finish is mirrored to the pipeline_runs row so the admin UI can show
// live progress.
export async function runCollection(
  opts: { reportProgress?: ProgressReporter } = {},
): Promise<CollectionResult> {
  const start = Date.now()
  const results: Record<string, CollectorResult> = {}
  const report = opts.reportProgress

  const collectors = [
    { name: 'news', fn: collectNews },
    { name: 'twitter', fn: collectTweets },
    { name: 'regulatory', fn: collectRegulatory },
    { name: 'brave_search', fn: collectBraveSearch },
  ]

  await report?.({ level: 'info', message: `Starting ${collectors.length} collectors in parallel` })

  // Wrap each collector so we can report per-source completion as it lands.
  const settled = await Promise.allSettled(
    collectors.map(async (c) => {
      await report?.({ level: 'progress', message: `↪ ${c.name}: starting` })
      try {
        const n = await c.fn()
        await report?.({
          level: 'success',
          message: `✓ ${c.name}: ${n} items`,
        })
        return n
      } catch (err) {
        await report?.({
          level: 'error',
          message: `✗ ${c.name}: ${err instanceof Error ? err.message : String(err)}`,
        })
        throw err
      }
    }),
  )

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

  const total = Object.values(results).reduce((s, r) => s + r.count, 0)
  await report?.({
    level: 'info',
    message: `Collection done: ${total} items across ${collectors.length} sources`,
    stats: { raw_items_collected: total, duration_ms: Date.now() - start },
  })

  return { results, duration_ms: Date.now() - start }
}
