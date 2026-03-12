// V3 数值合理性验证员 — 纯TypeScript代码，不用AI
// 检查 metric 类型事实的数值是否在合理范围内

import { findSanityRule, HISTORICAL_DEVIATION } from '@/config/numerical-ranges'
import { supabaseAdmin } from '@/db/client'
import type { AtomicFact, V3Result } from '@/lib/types'

// ─── 主验证函数 ───

export async function validateNumericalSanity(fact: AtomicFact): Promise<V3Result> {
  // 非 metric 类型直接跳过
  if (fact.fact_type !== 'metric' || fact.metric_name == null || fact.metric_value == null) {
    return { sanity: 'not_applicable', reason: null, historical_reference: null }
  }

  const metricName = fact.metric_name
  const value = fact.metric_value

  // ═══ Step 1: 静态范围检查 ═══

  const rule = findSanityRule(metricName)
  if (rule) {
    if (rule.min != null && value < rule.min) {
      return {
        sanity: 'likely_error',
        reason: `${metricName}=${value} is below minimum ${rule.min}`,
        historical_reference: null,
      }
    }
    if (rule.max != null && value > rule.max) {
      return {
        sanity: 'likely_error',
        reason: `${metricName}=${value} exceeds maximum ${rule.max}`,
        historical_reference: null,
      }
    }
  }

  // ═══ Step 2: 历史数据对比 ═══

  const historical = await getHistoricalValue(metricName, fact.fact_date)
  if (historical == null) {
    // 无历史数据可比，仅靠静态范围
    return { sanity: 'normal', reason: 'Within static range, no historical data', historical_reference: null }
  }

  // Guard against division by zero
  if (historical === 0) {
    return value === 0
      ? { sanity: 'normal', reason: 'Both current and historical are zero', historical_reference: 0 }
      : { sanity: 'anomaly', reason: `${metricName}=${value} but historical is 0`, historical_reference: 0 }
  }

  const deviationPct = Math.abs((value - historical) / historical) * 100
  const deviationMultiple = Math.max(value, historical) / Math.min(value, historical)

  if (deviationMultiple >= HISTORICAL_DEVIATION.likely_error_x) {
    return {
      sanity: 'likely_error',
      reason: `${metricName}=${value} is ${deviationMultiple.toFixed(1)}x from historical ${historical} (likely magnitude error)`,
      historical_reference: historical,
    }
  }

  if (deviationPct > HISTORICAL_DEVIATION.anomaly_pct) {
    return {
      sanity: 'anomaly',
      reason: `${metricName}=${value} deviates ${deviationPct.toFixed(1)}% from historical ${historical}`,
      historical_reference: historical,
    }
  }

  // ═══ Step 3: 异常阈值检查 (周变化率等) ═══

  if (rule?.anomaly_threshold != null && Math.abs(value) > rule.anomaly_threshold) {
    return {
      sanity: 'anomaly',
      reason: `${metricName}=${value} exceeds anomaly threshold ${rule.anomaly_threshold}`,
      historical_reference: historical,
    }
  }

  return { sanity: 'normal', reason: null, historical_reference: historical }
}

// ─── 查询历史数据 ───

async function getHistoricalValue(metricName: string, factDate: Date): Promise<number | null> {
  // 查 raw_onchain_metrics 中该 metric 的最近值 (±7天内)
  const dateStr = new Date(factDate).toISOString()

  const { data, error } = await supabaseAdmin
    .from('raw_onchain_metrics')
    .select('metric_value')
    .eq('metric_name', metricName)
    .lt('fetched_at', dateStr)
    .order('fetched_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) return null
  return data[0].metric_value
}

// ─── 批量验证 ───

export async function validateNumericalSanityBatch(
  facts: AtomicFact[]
): Promise<Map<string, V3Result>> {
  const results = new Map<string, V3Result>()
  for (const fact of facts) {
    results.set(fact.id, await validateNumericalSanity(fact))
  }
  return results
}
