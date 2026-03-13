// Context Engine V12 — 结构化输出 + 模板组装
// AI 只填 JSON 字段（日期、数字、实体名），代码组装句子
// 这彻底消除了 AI 注入主观意见的可能性

import { supabaseAdmin } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import { generateQueryEmbedding } from '@/lib/embedding'
import {
  type EventPattern,
  type ReferenceEvent,
  searchReferenceByTags,
  searchReferenceByType,
} from '@/config/reference-events'

// ── Types ──

export interface ContextResult {
  context_lines: string[]  // 2-3 条模板组装的上下文句
  event_type: EventPattern | null
  used_reference_ids: string[]
  confidence: 'high' | 'medium' | 'low'
}

interface FactInput {
  content: string
  tags: string[]
  fact_date: string     // YYYY-MM-DD
  entity?: string
}

// ── Stage 1: 事件分类 (纯规则) ──

const CLASSIFICATION_RULES: { pattern: EventPattern; keywords: string[] }[] = [
  { pattern: 'ipo_filing', keywords: ['s-1', 'ipo', '上市', '公开发行', '直接上市', 'sec 提交', '招股'] },
  { pattern: 'enforcement', keywords: ['罚款', '和解', 'wells notice', '执法', '诉讼', '指控', '处罚', 'sec 起诉'] },
  { pattern: 'regulatory_bill', keywords: ['法案', '法规', '立法', '通过', '委员会', 'genius', 'mica', '监管框架', '咨询文件'] },
  { pattern: 'market_cap_change', keywords: ['市值', '市场份额', '突破', '增长', '下跌', '$', '亿', 'billion', 'tvl'] },
  { pattern: 'tvl_milestone', keywords: ['tvl', '锁仓', '总锁定', 'defi'] },
  { pattern: 'funding_round', keywords: ['融资', '领投', 'series', '轮', '投资', '估值', '收购'] },
  { pattern: 'product_launch', keywords: ['发布', '上线', '推出', '发行', '集成', 'launch', '合作'] },
  { pattern: 'partnership', keywords: ['合作', '协议', '联盟', 'partnership', '收购', '并购'] },
]

export function classifyEvent(fact: FactInput): EventPattern | null {
  const text = `${fact.content} ${fact.tags.join(' ')}`.toLowerCase()
  let bestMatch: EventPattern | null = null
  let bestScore = 0

  for (const rule of CLASSIFICATION_RULES) {
    const score = rule.keywords.filter(kw => text.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestMatch = rule.pattern
    }
  }

  return bestScore >= 1 ? bestMatch : null
}

// ── Stage 2: 候选检索 (确定性) ──

interface CandidateContext {
  source: 'reference' | 'historical'
  content: string
  reference_id?: string
  entity?: string
  date?: string
  metric_value?: string
}

async function retrieveCandidates(
  fact: FactInput,
  eventType: EventPattern | null,
): Promise<CandidateContext[]> {
  const candidates: CandidateContext[] = []

  // 2A: 参考知识库 — 规则检索 (always available)
  let refEvents: ReferenceEvent[] = []
  if (eventType) {
    refEvents = searchReferenceByType(eventType, 3)
  }
  const tagMatches = searchReferenceByTags(fact.tags, 3)
  for (const tm of tagMatches) {
    if (!refEvents.some(r => r.id === tm.id)) refEvents.push(tm)
  }

  for (const ref of refEvents.slice(0, 4)) {
    const milestonesText = ref.milestones.map(m => `${m.date}: ${m.event}`).join('; ')
    const metricsText = Object.entries(ref.metrics).map(([k, v]) => `${k}=${v}`).join(', ')
    candidates.push({
      source: 'reference',
      content: `[${ref.entity}] ${milestonesText} | 指标: ${metricsText}`,
      reference_id: ref.id,
      entity: ref.entity,
    })
  }

  // 2A+: Vector search for reference_events in DB (if embeddings available)
  try {
    const queryEmb = await generateQueryEmbedding(fact.content)
    if (queryEmb) {
      const { data: refMatches } = await supabaseAdmin.rpc('match_reference_events', {
        query_embedding: JSON.stringify(queryEmb),
        match_threshold: 0.4,
        match_count: 3,
      })
      if (refMatches) {
        for (const rm of refMatches) {
          if (candidates.some(c => c.reference_id === rm.id)) continue
          const milestones = (rm.milestones as { date: string; event: string }[]) ?? []
          const metrics = (rm.metrics as Record<string, string | number>) ?? {}
          const milestonesText = milestones.map(m => `${m.date}: ${m.event}`).join('; ')
          const metricsText = Object.entries(metrics).map(([k, v]) => `${k}=${v}`).join(', ')
          candidates.push({
            source: 'reference',
            content: `[${rm.entity}] ${milestonesText} | 指标: ${metricsText}`,
            reference_id: rm.id,
            entity: rm.entity,
          })
        }
      }
    }
  } catch {
    // Vector search not available — continue with rule-based results
  }

  // 2B: 历史事实检索 — vector search first, fallback to tag overlap
  try {
    let historicalFound = false

    // Try vector search
    const queryEmb = await generateQueryEmbedding(fact.content)
    if (queryEmb) {
      const { data: vectorMatches } = await supabaseAdmin.rpc('match_facts', {
        query_embedding: JSON.stringify(queryEmb),
        match_threshold: 0.5,
        match_count: 10,
        filter_before_date: fact.fact_date,
      })
      if (vectorMatches && vectorMatches.length > 0) {
        historicalFound = true
        for (const hf of vectorMatches) {
          const content = hf.content_zh || hf.content_en
          if (content) {
            candidates.push({
              source: 'historical',
              content: `[${String(hf.fact_date).split('T')[0]}] ${content}`,
              date: String(hf.fact_date).split('T')[0],
            })
          }
        }
      }
    }

    // Fallback: tag overlap (when no embeddings or no vector matches)
    if (!historicalFound) {
      const tagFilter = fact.tags.slice(0, 5)
      if (tagFilter.length > 0) {
        const { data: historicalFacts } = await supabaseAdmin
          .from('atomic_facts')
          .select('content_zh, content_en, fact_date, tags')
          .in('verification_status', ['verified', 'partially_verified'])
          .lt('fact_date', fact.fact_date)
          .overlaps('tags', tagFilter)
          .order('fact_date', { ascending: false })
          .limit(10)

        if (historicalFacts) {
          for (const hf of historicalFacts) {
            const content = hf.content_zh || hf.content_en
            if (content) {
              candidates.push({
                source: 'historical',
                content: `[${String(hf.fact_date).split('T')[0]}] ${content}`,
                date: String(hf.fact_date).split('T')[0],
              })
            }
          }
        }
      }
    }
  } catch {
    // DB 查询失败不影响流程
  }

  return candidates
}

// ── Stage 3: AI 结构化提取 + 模板组装 ──

// AI 返回的结构化字段 — 每个字段都是可验证的事实片段
interface StructuredContextItem {
  comparison_type: 'timeline' | 'metric' | 'precedent'
  entity: string           // 被比较的实体
  historical_event: string // 历史事件描述 (纯事实)
  date: string             // 历史事件日期
  metric_value?: string    // 相关数值 (如 "$52B", "3年")
  source_index: number     // 候选材料编号
}

// 模板: 根据 comparison_type 组装句子
function assembleContextLine(item: StructuredContextItem): string {
  switch (item.comparison_type) {
    case 'timeline':
      // "Coinbase 于 2021-04-14 通过直接上市登陆纳斯达克"
      return `${item.entity} 于 ${item.date} ${item.historical_event}`
    case 'metric':
      // "USDC 市值在 2023-03-11 为 $36.2B"
      if (item.metric_value) {
        return `${item.entity} ${item.historical_event}，${item.date} 为 ${item.metric_value}`
      }
      return `${item.entity} 于 ${item.date} ${item.historical_event}`
    case 'precedent':
      // "2023年 Circle S-1 首次提交后 SEC 曾退回要求修改"
      return `${item.date} ${item.entity} ${item.historical_event}`
    default:
      return `${item.entity} 于 ${item.date} ${item.historical_event}`
  }
}

async function generateStructuredContext(
  fact: FactInput,
  eventType: EventPattern | null,
  candidates: CandidateContext[],
): Promise<{ items: StructuredContextItem[]; confidence: 'high' | 'medium' | 'low'; usedRefs: string[] }> {
  const candidatesText = candidates
    .map((c, i) => `[${i}] ${c.content}`)
    .join('\n')

  const result = await callHaikuJSON<{
    items: StructuredContextItem[]
    confidence: 'high' | 'medium' | 'low'
  }>(
    `你是结构化数据提取工具。从候选材料中提取可与当前事实对比的历史数据点。

当前事实:
"${fact.content}"
事件类型: ${eventType ?? '未分类'}
日期: ${fact.fact_date}

候选历史材料 (${candidates.length} 条):
${candidatesText}

提取 1-3 个对比数据点。每个数据点必须是以下结构:
{
  "comparison_type": "timeline" | "metric" | "precedent",
  "entity": "实体名",
  "historical_event": "纯事实动作（如'通过直接上市登陆纳斯达克'、'市值突破 $50B'）",
  "date": "YYYY-MM-DD 或 YYYY年",
  "metric_value": "相关数值（如'$52B'、'3年'），没有则省略",
  "source_index": 候选材料编号
}

绝对规则:
1. 只能使用上面的候选材料，禁止使用外部知识
2. historical_event 只写客观动作，不加评价词（禁止"重大""关键""值得"）
3. date 必须填具体日期或年份
4. 如果候选材料不足以形成对比，返回空数组

输出严格 JSON:
{
  "items": [...],
  "confidence": "high" | "medium" | "low"
}`,
    { system: '结构化数据提取工具。输出严格 JSON。只提取事实字段。', maxTokens: 800 }
  )

  const usedRefs = (result.items ?? [])
    .filter(item => item.source_index >= 0 && item.source_index < candidates.length && candidates[item.source_index].reference_id)
    .map(item => candidates[item.source_index].reference_id!)

  return {
    items: result.items ?? [],
    confidence: result.confidence ?? 'medium',
    usedRefs: [...new Set(usedRefs)],
  }
}

// ── Stage 4: 验证 (确定性) ──

const OPINION_WORDS = /可能|或许|预计|看好|利空|建议|值得|关注|重大|利好|趋势|前景|有望|显著/

function validateContextLines(lines: string[]): string[] {
  return lines.filter(line => {
    if (!/\d/.test(line)) return false
    if (OPINION_WORDS.test(line)) return false
    if (line.length < 5 || line.length > 80) return false
    return true
  })
}

// ── 主入口 ──

export async function generateFactContext(fact: FactInput): Promise<ContextResult> {
  const eventType = classifyEvent(fact)
  const candidates = await retrieveCandidates(fact, eventType)

  if (candidates.length === 0) {
    return { context_lines: [], event_type: eventType, used_reference_ids: [], confidence: 'low' }
  }

  try {
    const { items, confidence, usedRefs } = await generateStructuredContext(fact, eventType, candidates)

    // 模板组装: AI 的结构化字段 → 代码模板 → 最终句子
    const assembledLines = items.map(assembleContextLine)
    const validatedLines = validateContextLines(assembledLines)

    if (confidence === 'low' && validatedLines.length === 0) {
      return { context_lines: [], event_type: eventType, used_reference_ids: [], confidence: 'low' }
    }

    return {
      context_lines: validatedLines.slice(0, 3),
      event_type: eventType,
      used_reference_ids: usedRefs,
      confidence,
    }
  } catch {
    return { context_lines: [], event_type: eventType, used_reference_ids: [], confidence: 'low' }
  }
}

/**
 * 批量为多条事实生成上下文 (串行，避免 rate limit)
 */
export async function generateBatchContext(
  facts: FactInput[],
): Promise<Map<number, ContextResult>> {
  const results = new Map<number, ContextResult>()
  for (let i = 0; i < facts.length; i++) {
    results.set(i, await generateFactContext(facts[i]))
  }
  return results
}
