// Module A: Data Collectors — unified entry point
// All collectors follow the same pattern: fetch → clean → upsert into raw_* tables

import { collectOnChainData } from './on-chain'
import { collectNews } from './news'
import { collectCompanyData } from './companies'
import { collectProductUpdates } from './products'
import { collectFunding } from './funding'
import { collectTweets } from './twitter'
import { collectRegulatory } from './regulatory'

export {
  collectOnChainData,
  collectNews,
  collectCompanyData,
  collectProductUpdates,
  collectFunding,
  collectTweets,
  collectRegulatory,
}

// Collector result with per-source breakdown
export interface CollectorResult {
  total: number
  breakdown: { source: string; count: number }[]
}

// Daily collection: A1-A5, A7 in parallel
export async function runDailyCollection(): Promise<{
  results: Record<string, { status: 'ok' | 'error'; count: number }>
  duration_ms: number
}> {
  const start = Date.now()
  const results: Record<string, { status: 'ok' | 'error'; count: number }> = {}

  const tasks = [
    { name: 'on-chain', fn: collectOnChainData },
    { name: 'news', fn: collectNews },
    { name: 'companies', fn: collectCompanyData },
    { name: 'products', fn: collectProductUpdates },
    { name: 'funding', fn: collectFunding },
    { name: 'regulatory', fn: collectRegulatory },
  ]

  const settled = await Promise.allSettled(tasks.map(t => t.fn()))

  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      const val = result.value
      const count = typeof val === 'number' ? val : val.total
      results[tasks[i].name] = { status: 'ok', count }
    } else {
      results[tasks[i].name] = { status: 'error', count: 0 }
      console.error(`[Collector] ${tasks[i].name} failed:`, result.reason)
    }
  })

  return { results, duration_ms: Date.now() - start }
}

// Weekly Twitter collection: A6
export async function runWeeklyTwitterCollection(): Promise<{
  result: 'ok' | 'error'
  count: number
  duration_ms: number
}> {
  const start = Date.now()
  try {
    const count = await collectTweets()
    return { result: 'ok', count, duration_ms: Date.now() - start }
  } catch (err) {
    console.error('[Collector] twitter failed:', err)
    return { result: 'error', count: 0, duration_ms: Date.now() - start }
  }
}
