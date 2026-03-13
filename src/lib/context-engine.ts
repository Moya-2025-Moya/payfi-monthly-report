// Context Engine V13 — 结构化输出 + 模板组装 + Gate 3 Insight 校验
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
  expandComparableEvents,
} from '@/config/reference-events'

// ── Types ──

export interface ContextComparison {
  reference_event: string   // e.g. "Coinbase IPO"
  metric_label: string      // e.g. "S-1 提交到上市"
  metric_value: string      // e.g. "118 天"
  date_range: string        // e.g. "2020.12→2021.04"
  used_candidate_index: number
}

export interface ContextResult {
  context_lines: string[]        // 2-3 条模板组装的上下文句
  comparisons: ContextComparison[] // V13: structured output for email
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

  // Expand with comparable_events for richer context
  refEvents = expandComparableEvents(refEvents, 6)

  for (const ref of refEvents.slice(0, 6)) {
    const milestonesText = ref.milestones.map(m => `${m.date}: ${m.event}`).join('; ')
    const metricsText = Object.entries(ref.metrics).map(([k, v]) => `${k}=${v}`).join(', ')
    const summary = ref.context_summary ? ` | 参照价值: ${ref.context_summary}` : ''
    candidates.push({
      source: 'reference',
      content: `[${ref.entity}] ${milestonesText} | 指标: ${metricsText}${summary}`,
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

// ── Stage 3: AI 结构化提取 (V13 格式) ──

async function generateStructuredContext(
  fact: FactInput,
  eventType: EventPattern | null,
  candidates: CandidateContext[],
): Promise<{ comparisons: ContextComparison[]; confidence: 'high' | 'medium' | 'low'; usedRefs: string[] }> {
  const candidatesText = candidates
    .map((c, i) => `[${i}] ${c.content}`)
    .join('\n')

  const result = await callHaikuJSON<{
    comparisons: ContextComparison[]
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
  "reference_event": "被比较的历史事件名 (如 'Coinbase IPO')",
  "metric_label": "对比维度 (如 'S-1 提交到上市')",
  "metric_value": "数值 (如 '118 天'、'$85.8B')",
  "date_range": "时间范围 (如 '2020.12→2021.04' 或 '2023.01')",
  "used_candidate_index": 候选材料编号
}

绝对规则:
1. 只能使用上面的候选材料，禁止使用外部知识
2. reference_event 用简短事件名，不加评价词
3. metric_label 只写客观维度名 (禁止"重大""关键""值得")
4. metric_value 必须包含数字
5. date_range 必须包含年份
6. 如果候选材料不足以形成有意义的对比，返回空数组

输出严格 JSON:
{
  "comparisons": [...],
  "confidence": "high" | "medium" | "low"
}`,
    { system: '结构化数据提取工具。输出严格 JSON。只提取事实字段。', maxTokens: 800 }
  )

  const comparisons = result.comparisons ?? []
  const usedRefs = comparisons
    .filter(c => c.used_candidate_index >= 0 && c.used_candidate_index < candidates.length && candidates[c.used_candidate_index].reference_id)
    .map(c => candidates[c.used_candidate_index].reference_id!)

  return {
    comparisons,
    confidence: result.confidence ?? 'medium',
    usedRefs: [...new Set(usedRefs)],
  }
}

// ── Template assembly: structured fields → context line ──

function assembleContextLine(comp: ContextComparison): string {
  // "Coinbase IPO: S-1 提交到上市 118 天 (2020.12→2021.04)"
  return `${comp.reference_event}: ${comp.metric_label} ${comp.metric_value} (${comp.date_range})`
}

// ── Quality Gate 2: Schema 校验 ──

const OPINION_WORDS = /可能|或许|预计|看好|利空|建议|值得|关注|重大|利好|趋势|前景|有望|显著/

function validateComparison(comp: ContextComparison, candidateCount: number): boolean {
  // used_candidate_index must point to a real candidate
  if (comp.used_candidate_index < 0 || comp.used_candidate_index >= candidateCount) return false
  // metric_value must contain a number
  if (!/\d/.test(comp.metric_value ?? '')) return false
  // date_range must contain a year
  if (!/\d{4}/.test(comp.date_range ?? '')) return false
  // No opinion words in any field
  const allText = `${comp.reference_event} ${comp.metric_label} ${comp.metric_value}`
  if (OPINION_WORDS.test(allText)) return false
  // Assembled line length check
  const line = assembleContextLine(comp)
  if (line.length < 5 || line.length > 100) return false
  return true
}

// ── Quality Gate 3: Insight 校验 (V13 新增) ──
// Schema 通过不等于有洞察。过滤无价值的对比。

function validateInsight(comp: ContextComparison, fact: FactInput): boolean {
  // Rule 1: 不能是相邻周的同指标数据
  // If date_range only covers ~1 week from fact_date, it's just week-over-week change
  const dateMatch = comp.date_range.match(/(\d{4})\.?(\d{2})?/)
  if (dateMatch) {
    const factYear = parseInt(fact.fact_date.slice(0, 4))
    const factMonth = parseInt(fact.fact_date.slice(5, 7))
    const refYear = parseInt(dateMatch[1])
    const refMonth = dateMatch[2] ? parseInt(dateMatch[2]) : 0
    // Same year + adjacent month = likely too recent
    if (refYear === factYear && refMonth > 0 && Math.abs(refMonth - factMonth) <= 1) {
      // Allow if it's a different entity comparison
      if (!comp.reference_event || comp.reference_event.toLowerCase().includes(fact.entity?.toLowerCase() ?? '___none___')) {
        return false
      }
    }
  }

  // Rule 2: delta must be meaningful — we can't fully validate numerically, but check for trivial patterns
  // "0%", "0.0%", "+0.1%" are trivial
  const trivialDelta = /[+-]?0\.?\d?%/.test(comp.metric_value)
  if (trivialDelta && !/[1-9]\d/.test(comp.metric_value)) return false

  // Rule 3: reference_event must have a concrete outcome (heuristic: must have a metric or date)
  // If metric_label is too vague (e.g., just "情况"), reject
  if (comp.metric_label.length < 2) return false

  return true
}

// ── 主入口 ──

export async function generateFactContext(fact: FactInput): Promise<ContextResult> {
  const eventType = classifyEvent(fact)
  const candidates = await retrieveCandidates(fact, eventType)

  // Gate 1: 候选充分性
  if (candidates.length === 0) {
    return { context_lines: [], comparisons: [], event_type: eventType, used_reference_ids: [], confidence: 'low' }
  }

  try {
    const { comparisons, confidence, usedRefs } = await generateStructuredContext(fact, eventType, candidates)

    // Gate 2: Schema 校验
    const schemaValid = comparisons.filter(c => validateComparison(c, candidates.length))

    // Gate 3: Insight 校验
    const insightValid = schemaValid.filter(c => validateInsight(c, fact))

    if (confidence === 'low' && insightValid.length === 0) {
      return { context_lines: [], comparisons: [], event_type: eventType, used_reference_ids: [], confidence: 'low' }
    }

    // Template assembly
    const finalComparisons = insightValid.slice(0, 3)
    const contextLines = finalComparisons.map(assembleContextLine)

    return {
      context_lines: contextLines,
      comparisons: finalComparisons,
      event_type: eventType,
      used_reference_ids: usedRefs,
      confidence,
    }
  } catch {
    return { context_lines: [], comparisons: [], event_type: eventType, used_reference_ids: [], confidence: 'low' }
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
