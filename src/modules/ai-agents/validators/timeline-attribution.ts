// V6 时间线归属验证员 — Claude Haiku
// 独立验证B3的归属建议: 事实X → 时间线Y

import { readFileSync } from 'fs'
import { join } from 'path'
import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import type { AtomicFact, V6Result, Timeline, TimelineFact } from '@/lib/types'

const PROMPT_TEMPLATE = readFileSync(
  join(process.cwd(), 'src/config/prompts/timeline-attribution.md'),
  'utf-8'
)

// ─── 获取时间线的已有节点 ───

async function getTimelineEvents(timelineId: string): Promise<string> {
  const { data: tf } = await supabaseAdmin
    .from('timeline_facts')
    .select('fact_id, order_index')
    .eq('timeline_id', timelineId)
    .order('order_index', { ascending: true })
    .limit(30)

  if (!tf || tf.length === 0) return '(No existing events)'

  const factIds = tf.map((t: { fact_id: string }) => t.fact_id)
  const { data: facts } = await supabaseAdmin
    .from('atomic_facts')
    .select('content_zh, content_en, fact_date')
    .in('id', factIds)
    .order('fact_date', { ascending: true })

  if (!facts || facts.length === 0) return '(No existing events)'

  return facts
    .map((f: { content_zh: string; content_en: string; fact_date: string | Date }) =>
      `- [${new Date(f.fact_date).toISOString().split('T')[0]}] ${f.content_zh || f.content_en}`
    )
    .join('\n')
}

// ─── 主验证函数 ───

export async function validateTimelineAttribution(
  fact: AtomicFact,
  timelineId: string
): Promise<V6Result> {
  // 获取时间线信息
  const { data: timeline, error } = await supabaseAdmin
    .from('timelines')
    .select('*')
    .eq('id', timelineId)
    .single()

  if (error || !timeline) {
    return { confirmed: false, confidence: 0, reason: 'Timeline not found' }
  }

  const tl = timeline as Timeline
  const events = await getTimelineEvents(timelineId)

  const prompt = PROMPT_TEMPLATE
    .replace('{timeline_name}', tl.name)
    .replace('{timeline_description}', tl.description ?? 'No description')
    .replace('{timeline_events}', events)
    .replace('{fact_content}', fact.content_zh || fact.content_en)
    .replace('{fact_date}', new Date(fact.fact_date).toISOString().split('T')[0])

  try {
    const result = await callHaikuJSON<V6Result>(prompt)

    return {
      confirmed: result.confirmed ?? false,
      confidence: Math.max(0, Math.min(100, result.confidence ?? 0)),
      reason: result.reason ?? 'No reason provided',
    }
  } catch {
    return { confirmed: false, confidence: 0, reason: 'AI validation failed' }
  }
}

// ─── 批量验证 (处理B3的归属建议) ───

export interface AttributionSuggestion {
  factId: string
  timelineId: string
}

export async function validateTimelineAttributionBatch(
  suggestions: AttributionSuggestion[],
  factsMap: Map<string, AtomicFact>
): Promise<Map<string, V6Result>> {
  const results = new Map<string, V6Result>()

  for (const s of suggestions) {
    const fact = factsMap.get(s.factId)
    if (!fact) {
      results.set(s.factId, { confirmed: false, confidence: 0, reason: 'Fact not found' })
      continue
    }
    results.set(s.factId, await validateTimelineAttribution(fact, s.timelineId))
  }

  return results
}

// ─── 根据V6结果更新 timeline_facts 的归属状态 ───

export async function applyAttributionResults(
  results: Map<string, V6Result>,
  suggestions: AttributionSuggestion[]
): Promise<void> {
  for (const s of suggestions) {
    const v6 = results.get(s.factId)
    if (!v6) continue

    const status = v6.confirmed
      ? 'confirmed'
      : v6.confidence >= 40
        ? 'uncertain'
        : 'rejected'

    await supabaseAdmin
      .from('timeline_facts')
      .update({
        v6_result: v6,
        attribution_status: status,
      })
      .eq('fact_id', s.factId)
      .eq('timeline_id', s.timelineId)
  }
}
