// V2 多来源交叉验证员
// metric类型: 纯代码比数值
// event类型: Claude Haiku 判断
// 核心原则: 信息源独立性

import { readFileSync } from 'fs'
import { join } from 'path'
import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import type { AtomicFact, V2Result } from '@/lib/types'

const PROMPT_TEMPLATE = readFileSync(
  join(process.cwd(), 'src/config/prompts/cross-source.md'),
  'utf-8'
)

// ─── Step 0: 信息源独立性检查 (纯代码) ───

interface SourceIndependence {
  independent: boolean
  note: string
}

function checkSourceIndependence(urls: string[]): SourceIndependence {
  if (urls.length < 2) {
    return { independent: false, note: 'Only one source' }
  }

  // 去重
  const unique = [...new Set(urls)]
  if (unique.length < 2) {
    return { independent: false, note: 'All source_urls are identical' }
  }

  // 检查域名
  const domains = unique.map(url => {
    try { return new URL(url).hostname.replace('www.', '') } catch { return url }
  })
  const uniqueDomains = [...new Set(domains)]

  if (uniqueDomains.length < 2) {
    return { independent: false, note: `All sources from same domain: ${uniqueDomains[0]}` }
  }

  return { independent: true, note: `${uniqueDomains.length} independent domains: ${uniqueDomains.join(', ')}` }
}

// ─── Step 1: 查找同一事件的事实组 ───

async function findRelatedFacts(fact: AtomicFact): Promise<AtomicFact[]> {
  // 同一周 + 有标签重叠的事实 (不包括自身)
  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .eq('week_number', fact.week_number)
    .neq('id', fact.id)
    .neq('source_url', fact.source_url) // 不同来源
    .eq('verification_status', 'pending_verification')

  if (error || !data) return []

  // 过滤: 标签重叠 > 50% 或标题相似
  return (data as AtomicFact[]).filter(other => {
    const overlap = fact.tags.filter(t => other.tags.includes(t))
    return overlap.length >= Math.ceil(fact.tags.length * 0.5)
  })
}

// ─── Step 2a: Metric 类型 — 纯代码比数值 ───

function crossValidateMetric(fact: AtomicFact, related: AtomicFact[]): V2Result {
  const sameMetric = related.filter(
    r => r.fact_type === 'metric' && r.metric_name === fact.metric_name && r.metric_value != null
  )

  if (sameMetric.length === 0) {
    return singleSourceResult(fact)
  }

  const urls = [fact.source_url, ...sameMetric.map(r => r.source_url)]
  const independence = checkSourceIndependence(urls)

  if (!independence.independent) {
    return {
      source_count: urls.length,
      consistent_count: 0,
      cross_validation: 'single_source',
      is_minority: false,
      majority_value: null,
      independent_sources: false,
      source_urls: urls,
      source_independence_note: independence.note,
      details: null,
    }
  }

  const claimedValue = fact.metric_value!
  const allValues = [claimedValue, ...sameMetric.map(r => r.metric_value!)]

  // 检查值的一致性
  let consistentCount = 0
  for (const v of allValues) {
    const deviation = Math.abs((v - claimedValue) / claimedValue) * 100
    if (deviation <= 5) consistentCount++
  }

  const totalSources = allValues.length
  const isConsistent = consistentCount === totalSources
  const hasDeviation = !isConsistent && consistentCount >= totalSources * 0.5

  // 判断是否为少数方
  const median = allValues.sort((a, b) => a - b)[Math.floor(allValues.length / 2)]
  const isMajority = Math.abs((claimedValue - median) / median) <= 0.05
  const isMinority = !isMajority && totalSources >= 3

  let crossValidation: V2Result['cross_validation']
  if (isConsistent) crossValidation = 'consistent'
  else if (hasDeviation) crossValidation = 'partially_consistent'
  else crossValidation = 'inconsistent'

  return {
    source_count: totalSources,
    consistent_count: consistentCount,
    cross_validation: crossValidation,
    is_minority: isMinority,
    majority_value: String(median),
    independent_sources: true,
    source_urls: urls,
    source_independence_note: independence.note,
    details: `Values: ${allValues.join(', ')}`,
  }
}

// ─── Step 2b: Event 类型 — AI 判断 ───

async function crossValidateEvent(fact: AtomicFact, related: AtomicFact[]): Promise<V2Result> {
  const sameEvent = related.filter(
    r => r.fact_type !== 'metric' // event, quote, relationship, status_change
  )

  if (sameEvent.length === 0) {
    return singleSourceResult(fact)
  }

  const urls = [fact.source_url, ...sameEvent.map(r => r.source_url)]
  const independence = checkSourceIndependence(urls)

  if (!independence.independent) {
    return {
      source_count: urls.length,
      consistent_count: 0,
      cross_validation: 'single_source',
      is_minority: false,
      majority_value: null,
      independent_sources: false,
      source_urls: urls,
      source_independence_note: independence.note,
      details: null,
    }
  }

  // 构建 AI 输入
  const sourceDescriptions = [fact, ...sameEvent]
    .map((f, i) => `--- Source ${i + 1} ---\nURL: ${f.source_url}\nFact: ${f.content_en}\nDate: ${new Date(f.fact_date).toISOString().split('T')[0]}`)
    .join('\n\n')

  const prompt = PROMPT_TEMPLATE.replace('{source_descriptions}', sourceDescriptions)

  try {
    const aiResult = await callHaikuJSON<{
      not_same_event?: boolean
      independent_sources: boolean
      source_urls: string[]
      source_independence_note: string
      cross_validation: string
      consistent_points: string[]
      inconsistent_points: string[]
      summary: string
    }>(prompt)

    if (aiResult.not_same_event) {
      return singleSourceResult(fact)
    }

    const cv = aiResult.cross_validation as V2Result['cross_validation']
    const validCv = ['consistent', 'partially_consistent', 'inconsistent', 'single_source'].includes(cv)
      ? cv
      : 'single_source'

    const consistentCount = validCv === 'consistent' ? urls.length
      : validCv === 'partially_consistent' ? Math.ceil(urls.length * 0.7)
      : 0

    return {
      source_count: urls.length,
      consistent_count: consistentCount,
      cross_validation: validCv,
      is_minority: aiResult.inconsistent_points?.length > 0 && urls.length >= 3
        ? false // AI doesn't tell us who is minority; default to safe
        : false,
      majority_value: null,
      independent_sources: aiResult.independent_sources,
      source_urls: aiResult.source_urls ?? urls,
      source_independence_note: aiResult.source_independence_note ?? independence.note,
      details: aiResult.summary,
    }
  } catch {
    // AI 失败时降级为 single_source
    return singleSourceResult(fact)
  }
}

// ─── 辅助 ───

function singleSourceResult(fact: AtomicFact): V2Result {
  return {
    source_count: 1,
    consistent_count: 1,
    cross_validation: 'single_source',
    is_minority: false,
    majority_value: null,
    independent_sources: false,
    source_urls: [fact.source_url],
    source_independence_note: 'Only one source available',
    details: null,
  }
}

// ─── 主验证函数 ───

export async function validateCrossSource(fact: AtomicFact): Promise<V2Result> {
  const related = await findRelatedFacts(fact)

  if (related.length === 0) {
    return singleSourceResult(fact)
  }

  if (fact.fact_type === 'metric') {
    return crossValidateMetric(fact, related)
  }

  return crossValidateEvent(fact, related)
}

// ─── 批量验证 ───

export async function validateCrossSourceBatch(
  facts: AtomicFact[]
): Promise<Map<string, V2Result>> {
  const results = new Map<string, V2Result>()
  for (const fact of facts) {
    results.set(fact.id, await validateCrossSource(fact))
  }
  return results
}
