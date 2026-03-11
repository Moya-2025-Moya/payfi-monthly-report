// V5 时序一致性验证员
// Step 1: 纯代码规则检查日期范围
// Step 2: AI辅助 (仅在有时间线冲突时调用)

import { readFileSync } from 'fs'
import { join } from 'path'
import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import type { AtomicFact, V5Result } from '@/lib/types'

const PROMPT_TEMPLATE = readFileSync(
  join(process.cwd(), 'src/config/prompts/temporal-consistency.md'),
  'utf-8'
)

// ─── Step 1: 纯代码规则 ───

interface CodeCheckResult {
  pass: boolean
  conflict?: string
  needsAI: boolean
  entityId?: string
  timelineEvents?: string
}

async function codeCheck(fact: AtomicFact): Promise<CodeCheckResult> {
  const factDate = new Date(fact.fact_date)
  const now = new Date()

  // 规则 1: 事实日期不能是未来日期 (允许 +2 天容差)
  const futureThreshold = new Date(now.getTime() + 2 * 86400000)
  if (factDate > futureThreshold) {
    return {
      pass: false,
      conflict: `Fact date ${factDate.toISOString().split('T')[0]} is in the future`,
      needsAI: false,
    }
  }

  // 规则 2: 事实日期不应太旧 (>2年前可能有误)
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
  if (factDate < twoYearsAgo) {
    return {
      pass: false,
      conflict: `Fact date ${factDate.toISOString().split('T')[0]} is more than 2 years old, possibly wrong`,
      needsAI: false,
    }
  }

  // 规则 3: 查找相关实体的时间线，检查是否有冲突
  const entityTimeline = await getEntityTimeline(fact)
  if (!entityTimeline) {
    return { pass: true, needsAI: false }
  }

  // 如果有时间线数据，需要 AI 判断是否有逻辑矛盾
  return {
    pass: true, // 暂定通过，由 AI 进一步判断
    needsAI: true,
    entityId: entityTimeline.entityId,
    timelineEvents: entityTimeline.events,
  }
}

// ─── 查实体时间线 ───

interface EntityTimelineData {
  entityId: string
  entityName: string
  events: string
}

async function getEntityTimeline(fact: AtomicFact): Promise<EntityTimelineData | null> {
  // 通过 fact_entities 找关联实体
  const { data: factEntities } = await supabaseAdmin
    .from('fact_entities')
    .select('entity_id')
    .eq('fact_id', fact.id)
    .limit(1)

  if (!factEntities || factEntities.length === 0) {
    // 事实尚未关联实体 (B2还没跑), 尝试用 tags 匹配
    return findTimelineByTags(fact.tags)
  }

  const entityId = factEntities[0].entity_id

  // 查实体名称
  const { data: entity } = await supabaseAdmin
    .from('entities')
    .select('name')
    .eq('id', entityId)
    .single()

  if (!entity) return null

  // 查该实体的时间线及事实
  const { data: timelines } = await supabaseAdmin
    .from('timelines')
    .select('id, name')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .limit(3)

  if (!timelines || timelines.length === 0) return null

  const timelineIds = timelines.map(t => t.id)
  const { data: timelineFacts } = await supabaseAdmin
    .from('timeline_facts')
    .select('fact_id, order_index')
    .in('timeline_id', timelineIds)
    .order('order_index', { ascending: true })
    .limit(20)

  if (!timelineFacts || timelineFacts.length === 0) return null

  // 获取时间线事实的内容
  const factIds = timelineFacts.map(tf => tf.fact_id)
  const { data: facts } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_en, fact_date')
    .in('id', factIds)
    .order('fact_date', { ascending: true })

  if (!facts || facts.length === 0) return null

  const events = facts
    .map(f => `- [${new Date(f.fact_date).toISOString().split('T')[0]}] ${f.content_en}`)
    .join('\n')

  return { entityId, entityName: entity.name, events }
}

async function findTimelineByTags(tags: string[]): Promise<EntityTimelineData | null> {
  if (tags.length === 0) return null

  // 用第一个 tag 匹配实体 name/aliases
  const { data: entities } = await supabaseAdmin
    .from('entities')
    .select('id, name')
    .or(tags.map(t => `name.ilike.%${t}%`).join(','))
    .limit(1)

  if (!entities || entities.length === 0) return null

  const entity = entities[0]
  const { data: timelines } = await supabaseAdmin
    .from('timelines')
    .select('id')
    .eq('entity_id', entity.id)
    .eq('status', 'active')
    .limit(1)

  if (!timelines || timelines.length === 0) return null

  const { data: timelineFacts } = await supabaseAdmin
    .from('timeline_facts')
    .select('fact_id')
    .eq('timeline_id', timelines[0].id)
    .order('order_index', { ascending: true })
    .limit(20)

  if (!timelineFacts || timelineFacts.length === 0) return null

  const factIds = timelineFacts.map(tf => tf.fact_id)
  const { data: facts } = await supabaseAdmin
    .from('atomic_facts')
    .select('content_en, fact_date')
    .in('id', factIds)
    .order('fact_date', { ascending: true })

  if (!facts || facts.length === 0) return null

  const events = facts
    .map(f => `- [${new Date(f.fact_date).toISOString().split('T')[0]}] ${f.content_en}`)
    .join('\n')

  return { entityId: entity.id, entityName: entity.name, events }
}

// ─── Step 2: AI 判断 (仅在有时间线冲突时) ───

async function aiCheck(
  factContent: string,
  factDate: string,
  entityName: string,
  timelineEvents: string
): Promise<V5Result> {
  const prompt = PROMPT_TEMPLATE
    .replace('{entity_name}', entityName)
    .replace('{timeline_events}', timelineEvents)
    .replace('{fact_content}', factContent)
    .replace('{fact_date}', factDate)

  try {
    const result = await callHaikuJSON<V5Result>(prompt)

    if (!result.temporal_status || !['consistent', 'conflict'].includes(result.temporal_status)) {
      return { temporal_status: 'unchecked', conflict_detail: null }
    }

    return {
      temporal_status: result.temporal_status,
      conflict_detail: result.conflict_detail ?? null,
    }
  } catch {
    return { temporal_status: 'unchecked', conflict_detail: null }
  }
}

// ─── 主验证函数 ───

export async function validateTemporalConsistency(fact: AtomicFact): Promise<V5Result> {
  const check = await codeCheck(fact)

  // 纯代码检查就发现冲突
  if (!check.pass) {
    return {
      temporal_status: 'conflict',
      conflict_detail: check.conflict ?? 'Date range check failed',
    }
  }

  // 需要 AI 进一步判断
  if (check.needsAI && check.timelineEvents) {
    // 查实体名
    const { data: entity } = await supabaseAdmin
      .from('entities')
      .select('name')
      .eq('id', check.entityId!)
      .single()

    const entityName = entity?.name ?? 'Unknown'

    return aiCheck(
      fact.content_en,
      new Date(fact.fact_date).toISOString().split('T')[0],
      entityName,
      check.timelineEvents
    )
  }

  // 没有时间线数据可比 → unchecked (不否定也不确认)
  return { temporal_status: 'unchecked', conflict_detail: null }
}

// ─── 批量验证 ───

export async function validateTemporalConsistencyBatch(
  facts: AtomicFact[]
): Promise<Map<string, V5Result>> {
  const results = new Map<string, V5Result>()
  for (const fact of facts) {
    results.set(fact.id, await validateTemporalConsistency(fact))
  }
  return results
}
