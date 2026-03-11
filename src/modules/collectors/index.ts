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

// Daily collection: A1-A5, A7 in parallel
export async function runDailyCollection(): Promise<{
  results: Record<string, 'ok' | 'error'>
  duration_ms: number
}> {
  const start = Date.now()
  const results: Record<string, 'ok' | 'error'> = {}

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
    results[tasks[i].name] = result.status === 'fulfilled' ? 'ok' : 'error'
    if (result.status === 'rejected') {
      console.error(`[Collector] ${tasks[i].name} failed:`, result.reason)
    }
  })

  return { results, duration_ms: Date.now() - start }
}

// Weekly Twitter collection: A6
export async function runWeeklyTwitterCollection(): Promise<{
  result: 'ok' | 'error'
  duration_ms: number
}> {
  const start = Date.now()
  try {
    await collectTweets()
    return { result: 'ok', duration_ms: Date.now() - start }
  } catch (err) {
    console.error('[Collector] twitter failed:', err)
    return { result: 'error', duration_ms: Date.now() - start }
  }
}
