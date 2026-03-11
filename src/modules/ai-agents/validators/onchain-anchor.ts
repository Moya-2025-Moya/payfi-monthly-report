// V4 链上数据锚定验证员 — 纯TypeScript代码，不用AI
// 比对声称链上数据的事实与 raw_onchain_metrics 中的实际数据

import { supabaseAdmin } from '@/db/client'
import type { AtomicFact, V4Result } from '@/lib/types'

// 只有这些 metric 前缀与链上数据有关
const ONCHAIN_METRIC_PREFIXES = [
  'market_cap_',
  'tvl_',
  'daily_volume_',
  'weekly_volume_',
  'holder_count_',
  'active_wallets_',
  'chain_share_',
  'total_supply_',
]

function isOnchainMetric(metricName: string): boolean {
  return ONCHAIN_METRIC_PREFIXES.some(prefix => metricName.startsWith(prefix))
}

// ─── 主验证函数 ───

export async function validateOnchainAnchor(fact: AtomicFact): Promise<V4Result> {
  // 非 metric 或非链上 metric → 不适用
  if (
    fact.fact_type !== 'metric' ||
    fact.metric_name == null ||
    fact.metric_value == null ||
    !isOnchainMetric(fact.metric_name)
  ) {
    return {
      anchor_status: 'not_applicable',
      claimed_value: null,
      actual_value: null,
      deviation_pct: null,
    }
  }

  const claimed = fact.metric_value
  const actual = await getOnchainValue(fact.metric_name, fact.fact_date)

  if (actual == null) {
    return {
      anchor_status: 'no_anchor_data',
      claimed_value: claimed,
      actual_value: null,
      deviation_pct: null,
    }
  }

  // 计算偏差
  const deviationPct = actual === 0
    ? (claimed === 0 ? 0 : 100)
    : Math.abs((claimed - actual) / actual) * 100

  if (deviationPct <= 5) {
    return { anchor_status: 'anchored', claimed_value: claimed, actual_value: actual, deviation_pct: deviationPct }
  }

  if (deviationPct <= 20) {
    return { anchor_status: 'deviation', claimed_value: claimed, actual_value: actual, deviation_pct: deviationPct }
  }

  return { anchor_status: 'mismatch', claimed_value: claimed, actual_value: actual, deviation_pct: deviationPct }
}

// ─── 查链上实际数据 (±1天范围) ───

async function getOnchainValue(metricName: string, factDate: Date): Promise<number | null> {
  const date = new Date(factDate)
  const dayBefore = new Date(date.getTime() - 86400000).toISOString()
  const dayAfter = new Date(date.getTime() + 86400000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('raw_onchain_metrics')
    .select('metric_value, fetched_at')
    .eq('metric_name', metricName)
    .gte('fetched_at', dayBefore)
    .lte('fetched_at', dayAfter)
    .order('fetched_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) return null
  return data[0].metric_value
}

// ─── 批量验证 ───

export async function validateOnchainAnchorBatch(
  facts: AtomicFact[]
): Promise<Map<string, V4Result>> {
  const results = new Map<string, V4Result>()
  for (const fact of facts) {
    results.set(fact.id, await validateOnchainAnchor(fact))
  }
  return results
}
