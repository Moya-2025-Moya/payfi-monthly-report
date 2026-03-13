// Phase 2E: Self-growing knowledge base
// After each snapshot pipeline, extract significant events and add to reference_events
// This makes the context engine smarter over time

import { supabaseAdmin } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import { generateEmbeddings } from '@/lib/embedding'

interface NewReferenceEvent {
  id: string
  entity: string
  type: string
  milestone_date: string
  milestone_event: string
  metric_key?: string
  metric_value?: string
  tags: string[]
}

/**
 * Analyze this week's top facts and extract 0-3 events worth adding to the KB.
 * Only adds events that are genuinely reference-worthy (IPOs, major regulatory, milestones).
 */
export async function growKnowledgeBase(weekNumber: string): Promise<number> {
  // Fetch this week's verified facts
  const { data: facts } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_zh, fact_type, tags, fact_date, metric_name, metric_value, metric_unit')
    .eq('week_number', weekNumber)
    .in('verification_status', ['verified', 'partially_verified'])
    .order('fact_date', { ascending: false })
    .limit(30)

  if (!facts || facts.length < 3) return 0

  // Fetch existing reference_events to avoid duplicates
  const { data: existing } = await supabaseAdmin
    .from('reference_events')
    .select('id, entity')
    .limit(200)

  const existingIds = new Set((existing ?? []).map(e => e.id))

  const factsText = facts.map((f, i) =>
    `[${i}] ${f.content_zh} (${f.fact_type}, ${String(f.fact_date).split('T')[0]}, tags: ${(f.tags as string[]).join(',')})`
  ).join('\n')

  // AI: pick 0-3 events worthy of becoming reference knowledge
  const result = await callHaikuJSON<{ events: NewReferenceEvent[] }>(
    `你是知识库策展工具。从本周事实中选出 0-3 个值得成为"参考知识"的重大事件。

参考知识 = 未来分析师做行业对比时会反复引用的里程碑。

入选标准（必须至少满足 1 个）:
- IPO/上市/重大融资 (≥$100M)
- 监管里程碑（法案通过、重大执法）
- 市值/TVL 历史新高
- 行业格局性收购/合作

不入选:
- 常规产品更新
- 小额融资
- 日常市场波动
- 观点/分析

本周事实:
${factsText}

对每个入选事件，提取:
- id: 唯一标识 (如 "circle-ipo-2026", "genius-act-committee-2026")
- entity: 主要实体名
- type: ipo_filing | regulatory_bill | market_cap_change | funding_round | product_launch | partnership | enforcement | tvl_milestone
- milestone_date: YYYY-MM-DD
- milestone_event: 一句话事实描述
- metric_key: 关键指标名 (如 "valuation", "market_cap")，没有则省略
- metric_value: 指标值 (如 "$5B")，没有则省略
- tags: 相关标签数组

如果本周没有值得入选的事件，返回空数组。宁缺毋滥。

输出 JSON: { "events": [...] }`,
    { system: '知识库策展工具。输出严格 JSON。只选真正的里程碑。', maxTokens: 1000 }
  )

  const newEvents = (result.events ?? []).filter(e => !existingIds.has(e.id))
  if (newEvents.length === 0) return 0

  // Generate embeddings
  const texts = newEvents.map(e =>
    `${e.entity} ${e.type}: ${e.milestone_date} ${e.milestone_event}. Tags: ${e.tags.join(', ')}`
  )
  const embeddings = await generateEmbeddings(texts)

  // Insert into DB
  let added = 0
  for (let i = 0; i < newEvents.length; i++) {
    const e = newEvents[i]
    const row: Record<string, unknown> = {
      id: e.id,
      entity: e.entity,
      type: e.type,
      milestones: [{ date: e.milestone_date, event: e.milestone_event }],
      metrics: e.metric_key && e.metric_value ? { [e.metric_key]: e.metric_value } : {},
      tags: e.tags,
      auto_generated: true,
      verified: false,  // Quality gate: auto-generated events start unverified
    }
    if (embeddings?.[i]) {
      row.embedding = JSON.stringify(embeddings[i])
    }

    // Insert only — never overwrite existing entries (protects verified data)
    const { error } = await supabaseAdmin
      .from('reference_events')
      .upsert(row, { onConflict: 'id', ignoreDuplicates: true })

    if (!error) added++
  }

  return added
}
