// B7 Timeline Generator Agent — 按公司/叙事生成结构化时间线
// 用户输入一个公司名或叙事主题，Agent 从数据库检索相关事实，
// 用 AI 整理出清晰的时间线叙事
//
// SOP (标准操作流程):
// 1. 解析用户查询 → 识别实体名/叙事主题
// 2. 在 entities 表模糊匹配实体
// 3. 通过 fact_entities 获取关联事实
// 4. 如果是叙事主题，通过 tags/content 全文搜索事实
// 5. 按时间排序事实
// 6. 调用 AI 整理成结构化时间线（中文输出）
// 7. 返回结构化结果

import { supabaseAdmin } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import type { AtomicFact } from '@/lib/types'

// ─── Types ───

export interface TimelineEvent {
  date: string
  title: string
  description: string
  significance: 'high' | 'medium' | 'low'
  fact_ids: string[]
}

export interface GeneratedTimeline {
  subject: string
  subject_type: 'entity' | 'narrative'
  summary: string
  events: TimelineEvent[]
  total_facts_found: number
  date_range: { from: string; to: string } | null
}

// ─── SOP Step 1-4: 检索相关事实 ───

async function findEntityByName(query: string): Promise<{ id: string; name: string } | null> {
  // 精确匹配
  const { data: exact } = await supabaseAdmin
    .from('entities')
    .select('id, name')
    .ilike('name', query)
    .limit(1)

  if (exact && exact.length > 0) return exact[0] as { id: string; name: string }

  // 别名匹配
  const { data: alias } = await supabaseAdmin
    .from('entities')
    .select('id, name')
    .contains('aliases', [query])
    .limit(1)

  if (alias && alias.length > 0) return alias[0] as { id: string; name: string }

  // 模糊匹配
  const { data: fuzzy } = await supabaseAdmin
    .from('entities')
    .select('id, name')
    .ilike('name', `%${query}%`)
    .limit(1)

  if (fuzzy && fuzzy.length > 0) return fuzzy[0] as { id: string; name: string }

  return null
}

async function getFactsByEntity(entityId: string): Promise<AtomicFact[]> {
  const { data: links } = await supabaseAdmin
    .from('fact_entities')
    .select('fact_id')
    .eq('entity_id', entityId)

  if (!links || links.length === 0) return []

  const factIds = links.map((l: { fact_id: string }) => l.fact_id)

  const { data: facts } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('id', factIds)
    .in('verification_status', ['verified', 'partially_verified'])
    .order('fact_date', { ascending: true })
    .limit(100)

  return (facts ?? []) as AtomicFact[]
}

async function getFactsByNarrative(query: string): Promise<AtomicFact[]> {
  // 搜索标签和内容
  const { data: byTag } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('verification_status', ['verified', 'partially_verified'])
    .contains('tags', [query])
    .order('fact_date', { ascending: true })
    .limit(50)

  const { data: byContent } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('verification_status', ['verified', 'partially_verified'])
    .or(`content_en.ilike.%${query}%,content_zh.ilike.%${query}%`)
    .order('fact_date', { ascending: true })
    .limit(50)

  // 合并去重
  const seen = new Set<string>()
  const combined: AtomicFact[] = []
  for (const fact of [...(byTag ?? []), ...(byContent ?? [])] as AtomicFact[]) {
    if (!seen.has(fact.id)) {
      seen.add(fact.id)
      combined.push(fact)
    }
  }

  // 按日期排序
  combined.sort((a, b) => new Date(a.fact_date).getTime() - new Date(b.fact_date).getTime())
  return combined
}

// ─── SOP Step 5-6: AI 整理时间线 ───

interface AITimelineResponse {
  summary: string
  events: {
    date: string
    title: string
    description: string
    significance: 'high' | 'medium' | 'low'
    source_indices: number[]
  }[]
}

function buildPrompt(subject: string, facts: AtomicFact[]): string {
  const factsText = facts.map((f, i) => {
    const date = f.fact_date instanceof Date ? f.fact_date.toISOString().split('T')[0] : String(f.fact_date).split('T')[0]
    const content = f.content_zh || f.content_en
    return `[${i}] ${date} | ${content} | 标签: ${f.tags.join(', ')} | 可信度: ${f.confidence ?? '未知'}`
  }).join('\n')

  return `你是一个专业的稳定币行业分析师。请根据以下已验证的原子事实，为「${subject}」整理一条清晰的时间线。

## 要求
1. 用中文输出
2. 每个时间线事件必须有：日期、标题（简短）、描述（1-2句话）、重要性（high/medium/low）
3. 按时间顺序排列
4. 合并同一天的相关事实
5. 过滤掉与主题无关的事实
6. 在 summary 中用 2-3 句话概括整条时间线的核心脉络
7. source_indices 引用下方事实列表的索引号

## 事实列表（共 ${facts.length} 条）
${factsText}

## 输出格式（JSON）
{
  "summary": "时间线概述...",
  "events": [
    {
      "date": "2026-01-15",
      "title": "事件标题",
      "description": "事件描述...",
      "significance": "high",
      "source_indices": [0, 3]
    }
  ]
}`
}

// ─── SOP Step 7: 主函数 ───

export async function generateTimeline(query: string): Promise<GeneratedTimeline> {
  console.log(`[B7] Generating timeline for: "${query}"`)

  // Step 1-2: 尝试匹配实体
  const entity = await findEntityByName(query)
  let facts: AtomicFact[]
  let subjectType: 'entity' | 'narrative'
  let subject: string

  if (entity) {
    console.log(`[B7] Matched entity: ${entity.name} (${entity.id})`)
    facts = await getFactsByEntity(entity.id)
    subjectType = 'entity'
    subject = entity.name
  } else {
    console.log(`[B7] No entity match, treating as narrative query`)
    facts = await getFactsByNarrative(query)
    subjectType = 'narrative'
    subject = query
  }

  console.log(`[B7] Found ${facts.length} relevant facts`)

  if (facts.length === 0) {
    return {
      subject,
      subject_type: subjectType,
      summary: `暂未找到与「${subject}」相关的已验证事实。`,
      events: [],
      total_facts_found: 0,
      date_range: null,
    }
  }

  // Step 5-6: AI 整理
  const prompt = buildPrompt(subject, facts)
  const aiResult = await callHaikuJSON<AITimelineResponse>(prompt)

  // Map source_indices to fact IDs
  const events: TimelineEvent[] = aiResult.events.map(e => ({
    date: e.date,
    title: e.title,
    description: e.description,
    significance: e.significance,
    fact_ids: (e.source_indices ?? [])
      .filter(i => i >= 0 && i < facts.length)
      .map(i => facts[i].id),
  }))

  const firstDate = facts[0].fact_date instanceof Date
    ? facts[0].fact_date.toISOString().split('T')[0]
    : String(facts[0].fact_date).split('T')[0]
  const lastDate = facts[facts.length - 1].fact_date instanceof Date
    ? facts[facts.length - 1].fact_date.toISOString().split('T')[0]
    : String(facts[facts.length - 1].fact_date).split('T')[0]

  console.log(`[B7] Generated timeline with ${events.length} events`)

  return {
    subject,
    subject_type: subjectType,
    summary: aiResult.summary,
    events,
    total_facts_found: facts.length,
    date_range: { from: firstDate, to: lastDate },
  }
}
