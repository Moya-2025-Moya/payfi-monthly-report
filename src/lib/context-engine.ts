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
  // V14: 当前 vs 历史并排对比
  current_entity?: string     // e.g. "Circle"
  current_value?: string      // e.g. "25 天"
  delta_label?: string        // e.g. "快 42%" or "大 1.7x"
  // V15: 对比说明
  comparison_basis?: string   // e.g. "同为稳定币发行方 IPO，对比上市进程速度"
  insight?: string            // e.g. "Circle 进程比 Coinbase 快 42%，可能受益于更友好的监管环境"
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

const CLASSIFICATION_RULES: { pattern: EventPattern; keywords: string[]; weight: number }[] = [
  // Higher weight = higher priority when tie-breaking. Order matters for same-weight.
  // Deduplicated: each keyword appears in at most ONE category (the most specific one)
  { pattern: 'ipo_filing', keywords: ['s-1', 'ipo', '上市', '公开发行', '直接上市', 'sec 提交', '招股'], weight: 3 },
  { pattern: 'enforcement', keywords: ['罚款', '和解', 'wells notice', '执法', '诉讼', '指控', '处罚', 'sec 起诉'], weight: 3 },
  { pattern: 'regulatory_bill', keywords: ['法案', '法规', '立法', '委员会', 'genius', 'mica', '监管框架', '咨询文件'], weight: 2 },
  { pattern: 'tvl_milestone', keywords: ['tvl', '锁仓', '总锁定'], weight: 2 },
  { pattern: 'market_cap_change', keywords: ['市值', '市场份额', 'billion', '亿'], weight: 1 },
  { pattern: 'funding_round', keywords: ['融资', '领投', 'series', '轮', '估值'], weight: 2 },
  { pattern: 'product_launch', keywords: ['发布', '上线', '推出', '发行', '集成', 'launch'], weight: 1 },
  { pattern: 'partnership', keywords: ['合作', '协议', '联盟', 'partnership', '并购', '收购'], weight: 1 },
]

export function classifyEvent(fact: FactInput): EventPattern | null {
  const text = `${fact.content} ${fact.tags.join(' ')}`.toLowerCase()
  let bestMatch: EventPattern | null = null
  let bestScore = 0

  for (const rule of CLASSIFICATION_RULES) {
    const hits = rule.keywords.filter(kw => text.includes(kw)).length
    // Weighted score: more specific categories (higher weight) win ties
    const score = hits * 10 + rule.weight
    if (hits >= 1 && score > bestScore) {
      bestScore = score
      bestMatch = rule.pattern
    }
  }

  return bestMatch
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

  // Generate embedding once for both vector searches
  let queryEmb: number[] | null = null
  try {
    queryEmb = await generateQueryEmbedding(fact.content)
  } catch {
    // Embedding unavailable — continue with rule-based results
  }

  // 2A+: Vector search for reference_events in DB (if embeddings available)
  try {
    if (queryEmb) {
      const { data: refMatches } = await supabaseAdmin.rpc('match_reference_events', {
        query_embedding: JSON.stringify(queryEmb),
        match_threshold: 0.4,
        match_count: 3,
      })
      if (refMatches) {
        for (const rm of refMatches) {
          if (candidates.some(c => c.reference_id === rm.id)) continue
          // Quality gate: skip low-confidence auto-generated events
          // Auto-generated events start at 0.6 confidence — usable but deprioritized
          if (rm.auto_generated && rm.verified === false && (rm.confidence_score ?? 0) < 0.5) continue
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

    // Reuse embedding from above
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
  "reference_event": "被比较的历史事件名",
  "metric_label": "对比维度 (如 '估值' '融资规模' '上市耗时')",
  "metric_value": "历史数值 (必须包含数字)",
  "date_range": "历史时间范围 (必须包含年份)",
  "used_candidate_index": 候选材料编号,
  "current_entity": "当前事实的实体名 (从当前事实中提取，可省略)",
  "current_value": "当前事实在同一维度的数值 (可省略)",
  "delta_label": "差值 (如 '快 42%' 或 '大 1.7x'，可省略)",
  "comparison_basis": "为什么这两者可比 (一句话，如 '同为加密支付公司融资，对比融资估值规模')",
  "insight": "基于对比的客观推测 (一句话，用'或许''可能'等不确定语气，如 'Airwallex G轮估值接近 Circle 2022年F轮水平，或许说明两者处于相似的发展阶段')"
}

绝对规则:
1. 只能使用上面的候选材料，禁止使用外部知识
2. reference_event 用简短事件名，不加评价词
3. metric_label 只写客观维度名 (禁止"重大""关键""值得")
4. metric_value 必须包含数字
5. date_range 必须包含年份
6. 如果候选材料不足以形成有意义的对比，返回空数组
7. current_entity 从当前事实中提取实体名，如无法确定则省略此字段
8. current_value 必须包含数字，与 metric_value 同维度，如当前事实无明确数值则省略
9. delta_label 只写客观差值（禁止"显著""惊人"等评价词），格式: "快/慢/大/小/多/少 + 百分比或倍数"
10. current_entity/current_value/delta_label 三个字段要么全部提供，要么全部省略
11. comparison_basis 和 insight 必须提供
12. comparison_basis 说明可比性依据 (行业/规模/阶段相似)
13. insight 必须用不确定语气（"或许""可能""一定程度上"），禁止斩钉截铁的确定性推导（禁止"说明""体现""证明""表明""反映"等断言词）。正确示例: "或许说明直接上市路径效率更高"；错误示例: "说明直接上市路径相比 SPAC 路径效率更高"
13. **所有字段必须使用中文**（实体名保留英文原名，如 "Circle"/"Coinbase"，但描述文字必须中文）
    - reference_event: "Coinbase 上市" 而非 "Coinbase IPO"
    - metric_label: "S-1 提交到上市耗时" 而非 "S-1 to IPO duration"
    - metric_value: "118 天" 而非 "118 days"
    - delta_label: "快 42%" 而非 "42% faster"

输出严格 JSON:
{
  "comparisons": [...],
  "confidence": "high" | "medium" | "low"
}`,
    { system: '结构化数据提取工具。输出严格 JSON。只提取事实字段。所有描述性字段必须用中文（实体名保留英文）。', maxTokens: 1000 }
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
  let line = `${comp.reference_event}: ${comp.metric_label} ${comp.metric_value} (${comp.date_range})`
  if (comp.current_entity && comp.current_value) {
    line += ` | ${comp.current_entity} 当前: ${comp.current_value}`
    if (comp.delta_label) line += ` — ${comp.delta_label}`
  }
  return line
}

// ── Quality Gate 2: Schema 校验 ──

const OPINION_WORDS = /可能|或许|预计|看好|利空|建议|值得|关注|重大|利好|趋势|前景|有望|显著|意义|令人|震撼|突破性|革命/

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
  // Validate delta_label against opinion words if present
  if (comp.delta_label && OPINION_WORDS.test(comp.delta_label)) return false
  // Assembled line length check
  const line = assembleContextLine(comp)
  if (line.length < 5 || line.length > 160) return false
  return true
}

// ── Quality Gate 2.5: Delta numeric validation ──
// Don't trust AI math — verify delta_label against actual numbers

function extractNumber(s: string): number | null {
  // Extract first numeric value, handling "$5B", "118 天", "42%", "$1.7B" etc.
  const match = s.match(/[\$￥]?([\d,.]+)\s*(b|billion|m|million|k|万|亿|%|天|days?)?/i)
  if (!match) return null
  let num = parseFloat(match[1].replace(/,/g, ''))
  const unit = (match[2] ?? '').toLowerCase()
  if (unit === 'b' || unit === 'billion') num *= 1e9
  else if (unit === 'm' || unit === 'million') num *= 1e6
  else if (unit === 'k') num *= 1e3
  else if (unit === '亿') num *= 1e8
  else if (unit === '万') num *= 1e4
  return num
}

function validateDelta(comp: ContextComparison): ContextComparison {
  if (!comp.delta_label || !comp.current_value || !comp.metric_value) return comp

  const currentNum = extractNumber(comp.current_value)
  const refNum = extractNumber(comp.metric_value)
  if (currentNum === null || refNum === null || refNum === 0) {
    // Can't validate — strip delta rather than show potentially wrong data
    return { ...comp, delta_label: undefined }
  }

  const ratio = currentNum / refNum
  const pctDiff = Math.abs((ratio - 1) * 100)

  // Extract claimed percentage/multiplier from delta_label
  const claimedMatch = comp.delta_label.match(/([\d.]+)\s*(%|x|倍)/)
  if (!claimedMatch) return comp // non-standard format, keep as-is

  const claimedNum = parseFloat(claimedMatch[1])
  const claimedUnit = claimedMatch[2]

  let expectedNum: number
  if (claimedUnit === 'x' || claimedUnit === '倍') {
    expectedNum = ratio > 1 ? ratio : 1 / ratio
  } else {
    expectedNum = pctDiff
  }

  // Allow 20% tolerance for rounding differences
  if (Math.abs(claimedNum - expectedNum) / Math.max(expectedNum, 1) > 0.2) {
    // Recalculate with correct value
    const direction = comp.delta_label.match(/^(快|慢|大|小|多|少|高|低)/)?.[0] ?? ''
    if (pctDiff > 100) {
      const multiplier = (ratio > 1 ? ratio : 1 / ratio).toFixed(1)
      return { ...comp, delta_label: `${direction} ${multiplier}x` }
    } else {
      return { ...comp, delta_label: `${direction} ${Math.round(pctDiff)}%` }
    }
  }

  return comp
}

// ── Quality Gate 3: Insight 校验 (V13 新增) ──
// Schema 通过不等于有洞察。过滤无价值的对比。

function validateInsight(comp: ContextComparison, fact: FactInput): boolean {
  // Rule 1: Reference must be >60 days from fact — otherwise it's just recent noise
  // Parse dates like "2020.12→2021.04", "2024.06", "2025.01.15"
  const dateMatch = comp.date_range.match(/(\d{4})\.(\d{2})\.?(\d{2})?/)
  if (dateMatch) {
    const refDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3] ?? '15'}`)
    const factDate = new Date(fact.fact_date)
    const daysDiff = Math.abs((factDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff < 60) {
      // Allow if it's a different entity comparison
      if (!fact.entity || !comp.reference_event || comp.reference_event.toLowerCase().includes(fact.entity.toLowerCase())) {
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

    // Gate 2.5: Delta numeric validation — recalculate AI-generated deltas
    const deltaValidated = schemaValid.map(c => validateDelta(c))

    // Gate 3: Insight 校验
    const insightValid = deltaValidated.filter(c => validateInsight(c, fact))

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
