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

// Daily collection
// 执行顺序：
//   Wave 1 (并行): on-chain, news, companies, products, regulatory
//   Wave 2 (串行): funding — 依赖 raw_news 表，必须在 news 之后
export async function runDailyCollection(): Promise<{
  results: Record<string, { status: 'ok' | 'error'; count: number }>
  duration_ms: number
}> {
  const start = Date.now()
  const results: Record<string, { status: 'ok' | 'error'; count: number }> = {}

  function recordResult(name: string, result: PromiseSettledResult<CollectorResult | number>) {
    if (result.status === 'fulfilled') {
      const val = result.value
      const count = typeof val === 'number' ? val : val.total
      results[name] = { status: 'ok', count }
    } else {
      results[name] = { status: 'error', count: 0 }
      console.error(`[Collector] ${name} failed:`, result.reason)
    }
  }

  // Wave 1: 独立采集器并行
  const wave1 = [
    { name: 'on-chain', fn: collectOnChainData },
    { name: 'news', fn: collectNews },
    { name: 'companies', fn: collectCompanyData },
    { name: 'products', fn: collectProductUpdates },
    { name: 'regulatory', fn: collectRegulatory },
  ]

  const wave1Results = await Promise.allSettled(wave1.map(t => t.fn()))
  wave1Results.forEach((r, i) => recordResult(wave1[i].name, r))

  // Wave 2: funding 依赖 news 数据，必须在 wave1 之后
  const fundingResult = await Promise.allSettled([collectFunding()])
  recordResult('funding', fundingResult[0])

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
