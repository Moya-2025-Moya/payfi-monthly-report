// Context Engine V16 — 维度匹配 + 跨信号去重 + 日期去重
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
  reference_event: string   // e.g. "Coinbase 上市"
  metric_label: string      // e.g. "S-1 提交到上市耗时"
  metric_value: string      // e.g. "118 天" (纯数值，禁止包含日期)
  date_range: string        // e.g. "2020年12月→2021年4月"
  used_candidate_index: number
  metric_dimension: string  // V16: 维度标签 (交易量/市值/融资规模/市场份额/...)
  // V14: 当前 vs 历史并排对比
  current_entity?: string     // e.g. "Circle"
  current_value?: string      // e.g. "25 天"
  delta_label?: string        // e.g. "快 42%" or "大 1.7x"
  // V15: 对比说明
  comparison_basis?: string   // e.g. "同为稳定币发行方 IPO，对比上市进程速度"
  insight?: string            // e.g. null (不再需要)
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

// ── Stage 3: AI 结构化提取 (V16 格式) ──
// SOP: 1) 识别当前事实的核心指标维度 2) 只从候选中找同维度数据 3) 填充结构化字段

async function generateStructuredContext(
  fact: FactInput,
  eventType: EventPattern | null,
  candidates: CandidateContext[],
  excludeReferenceIds?: Set<string>,
): Promise<{ comparisons: ContextComparison[]; confidence: 'high' | 'medium' | 'low'; usedRefs: string[] }> {
  // Pre-filter: remove candidates whose reference_id is already used by other signals
  const filteredCandidates = excludeReferenceIds
    ? candidates.filter(c => !c.reference_id || !excludeReferenceIds.has(c.reference_id))
    : candidates

  if (filteredCandidates.length === 0) {
    return { comparisons: [], confidence: 'low', usedRefs: [] }
  }

  const candidatesText = filteredCandidates
    .map((c, i) => `[${i}] ${c.content}`)
    .join('\n')

  // Detect the core metric dimension of the fact for the prompt
  const factDimension = classifyMetricDimension(fact.content)

  const result = await callHaikuJSON<{
    comparisons: ContextComparison[]
    confidence: 'high' | 'medium' | 'low'
  }>(
    `你是结构化数据提取工具。严格按以下 SOP 操作。

═══════════════════════════════════
SOP 第一步：识别当前事实的核心指标维度
═══════════════════════════════════
当前事实: "${fact.content}"
事件类型: ${eventType ?? '未分类'}
日期: ${fact.fact_date}
${factDimension ? `系统预判维度: ${factDimension}` : ''}

指标维度定义表（必须选择其中一个）:
- 交易量: 链上交易量、转账量、结算量、处理量（单位: 美元/笔数）
- 市值: 市值、总供应量、流通市值（单位: 美元）
- 市场份额: 占比、份额、比例（单位: %）
- 融资规模: 融资金额、估值（单位: 美元）
- TVL: 锁仓量、TVL（单位: 美元）
- 上市进程: IPO、S-1、上市耗时（单位: 天/月）
- 监管处罚: 罚款金额、和解金额（单位: 美元）
- 用户增长: 用户数、账户数（单位: 人/个）

═══════════════════════════════════
SOP 第二步：从候选中筛选同维度数据
═══════════════════════════════════
候选历史材料 (${filteredCandidates.length} 条):
${candidatesText}

⚠️ 核心约束: 只能选择与当前事实**完全相同指标维度**的候选。
例：当前事实讲「交易量」→ 只能对比其他「交易量」数据
     当前事实讲「市值」→ 只能对比其他「市值」数据
     绝对禁止: 交易量 vs 市值、融资 vs 上市、市场份额 vs 交易量

如果候选中没有同维度数据 → 直接返回空数组 {"comparisons": [], "confidence": "low"}

═══════════════════════════════════
SOP 第三步：填充结构化字段
═══════════════════════════════════
每个对比数据点:
{
  "reference_event": "历史事件简称（中文，实体名保留英文）",
  "metric_label": "对比维度名（纯中文，如 '链上交易量' '稳定币市值'）",
  "metric_value": "历史数值（必须含数字，禁止包含日期年份）",
  "date_range": "历史时间范围（必须含年份，如 '2024年3月' '2021年→2022年'）",
  "metric_dimension": "维度标签（从上面的维度定义表中选一个）",
  "used_candidate_index": 候选编号,
  "current_entity": "当前事实实体名（可省略）",
  "current_value": "当前事实同维度数值（可省略）",
  "delta_label": "差值（可省略，格式: 快/慢/大/小/多/少 + 百分比或倍数）",
  "comparison_basis": "可比性依据（一句话）",
  "insight": null
}

═══════════════════════════════════
绝对规则
═══════════════════════════════════
1. 只能使用上面的候选材料，禁止外部知识
2. ⚠️ metric_value 只放数值，禁止包含年份/日期（日期放 date_range）
   ✓ 正确: metric_value="100 亿美元", date_range="2024年3月"
   ✗ 错误: metric_value="100 亿美元 (2024年3月)"
3. ⚠️ metric_dimension 必须与当前事实的核心维度完全一致
4. reference_event 用简短事件名，禁止评价词
5. 如果候选材料不足以形成同维度对比，必须返回空数组
6. current_entity/current_value/delta_label 三个字段要么全部提供，要么全部省略
7. delta_label 禁止评价词（"显著""惊人"），只写 "快/慢/大/小/多/少 + 数值"
8. 所有描述字段用中文，实体名保留英文
9. 提取 1-2 个（不超过 2 个）对比数据点

输出严格 JSON:
{"comparisons": [...], "confidence": "high"|"medium"|"low"}`,
    { system: '结构化数据提取工具。输出严格 JSON。只提取事实字段。所有描述性字段必须用中文（实体名保留英文）。禁止跨维度对比。', maxTokens: 1000 }
  )

  const comparisons = result.comparisons ?? []
  const usedRefs = comparisons
    .filter(c => c.used_candidate_index >= 0 && c.used_candidate_index < filteredCandidates.length && filteredCandidates[c.used_candidate_index].reference_id)
    .map(c => filteredCandidates[c.used_candidate_index].reference_id!)

  return {
    comparisons,
    confidence: result.confidence ?? 'medium',
    usedRefs: [...new Set(usedRefs)],
  }
}

// ── Template assembly: structured fields → context line ──
// V16: 自然语言组装，避免日期重复，不使用 | 分隔符

function assembleContextLine(comp: ContextComparison): string {
  // 格式: "{事件}，{维度}为 {数值}（{时间}）"
  // 避免 metric_value 中重复出现的日期信息
  const cleanValue = comp.metric_value.replace(/\s*\(?\d{4}[年.]?\d{0,2}[月.]?\d{0,2}日?\)?/g, '').trim()
  const value = cleanValue || comp.metric_value
  let line = `${comp.reference_event}，${comp.metric_label}为 ${value}（${comp.date_range}）`
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

// ── Metric Dimension Classification ──
// 硬编码维度分组 — 用于 Gate 2.9 维度匹配校验和 prompt 增强

type MetricDimension = '交易量' | '市值' | '市场份额' | '融资规模' | 'TVL' | '上市进程' | '监管处罚' | '用户增长' | null

const DIMENSION_KEYWORDS: { dimension: MetricDimension & string; keywords: string[] }[] = [
  { dimension: '交易量', keywords: ['交易量', '转账量', '结算量', '处理量', '交易额', '转账额', 'volume', 'transaction'] },
  { dimension: '市值', keywords: ['市值', '总供应', '流通', 'market cap', '供应量', '总量'] },
  { dimension: '市场份额', keywords: ['市场份额', '占比', '份额', '比例', 'share', 'dominance'] },
  { dimension: '融资规模', keywords: ['融资', '估值', '领投', 'series', '轮', 'funding', 'valuation', '募资'] },
  { dimension: 'TVL', keywords: ['tvl', '锁仓', '总锁定', 'locked'] },
  { dimension: '上市进程', keywords: ['ipo', 's-1', '上市', '公开发行', '招股', 'listing'] },
  { dimension: '监管处罚', keywords: ['罚款', '和解', '处罚', '执法', 'fine', 'settlement', 'penalty'] },
  { dimension: '用户增长', keywords: ['用户', '账户', '地址数', 'users', 'accounts', 'addresses', '活跃'] },
]

function classifyMetricDimension(text: string): MetricDimension {
  const lower = text.toLowerCase()
  let best: MetricDimension = null
  let bestHits = 0

  for (const { dimension, keywords } of DIMENSION_KEYWORDS) {
    const hits = keywords.filter(kw => lower.includes(kw)).length
    if (hits > bestHits) {
      bestHits = hits
      best = dimension
    }
  }

  return best
}

// ── Quality Gate 2.8: Relevance check ──
// The comparison must be topically related to the original fact.

function extractKeywords(text: string): Set<string> {
  const words = new Set<string>()
  for (const m of text.matchAll(/[A-Z][a-zA-Z0-9]+/g)) words.add(m[0].toLowerCase())
  const cnTerms = ['交易量', '市值', '融资', '上市', '稳定币', '支付', '结算', '监管',
    '牌照', '合规', '合作', '收购', '发行', 'IPO', 'TVL', '锁仓', '罚款', '和解',
    '法案', '估值', '利润', '收入', '用户', '市场份额', '增长', '跨境', '汇款',
    '银行', '托管', '清算', '借贷', '储备', '审计']
  const lowerText = text.toLowerCase()
  for (const term of cnTerms) {
    if (lowerText.includes(term.toLowerCase())) words.add(term.toLowerCase())
  }
  return words
}

function validateRelevance(comp: ContextComparison, fact: FactInput): boolean {
  const factKw = extractKeywords(fact.content)
  const refKw = extractKeywords(`${comp.reference_event} ${comp.metric_label}`)

  let overlap = 0
  for (const w of refKw) {
    if (factKw.has(w)) overlap++
  }
  for (const tag of fact.tags) {
    if (comp.reference_event.toLowerCase().includes(tag.toLowerCase())) overlap++
  }

  return overlap >= 1
}

// ── Quality Gate 2.9: Metric Dimension Match ──
// 核心守门: 事实的指标维度必须与对比的指标维度一致
// 例如: 交易量 只能对比 交易量，市值 只能对比 市值

function validateMetricDimension(comp: ContextComparison, fact: FactInput): boolean {
  const factDim = classifyMetricDimension(fact.content)
  if (!factDim) return true // 无法判断维度时放行，依赖其他 gate

  // 优先使用 AI 返回的 metric_dimension 字段
  const compDimFromAI = comp.metric_dimension?.trim()
  if (compDimFromAI) {
    // AI 返回的维度必须与事实维度一致
    if (compDimFromAI === factDim) return true
    // 模糊匹配: 检查是否包含关键词
    const compDimClassified = classifyMetricDimension(compDimFromAI)
    if (compDimClassified === factDim) return true
    return false
  }

  // Fallback: 从 metric_label 推断维度
  const compDim = classifyMetricDimension(`${comp.metric_label} ${comp.reference_event}`)
  if (!compDim) return true // 无法判断时放行

  return compDim === factDim
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

export async function generateFactContext(
  fact: FactInput,
  excludeReferenceIds?: Set<string>,
): Promise<ContextResult> {
  const eventType = classifyEvent(fact)
  const candidates = await retrieveCandidates(fact, eventType)

  // Gate 1: 候选充分性
  if (candidates.length === 0) {
    return { context_lines: [], comparisons: [], event_type: eventType, used_reference_ids: [], confidence: 'low' }
  }

  try {
    const { comparisons, confidence, usedRefs } = await generateStructuredContext(fact, eventType, candidates, excludeReferenceIds)

    // Gate 2: Schema 校验
    const schemaValid = comparisons.filter(c => validateComparison(c, candidates.length))

    // Gate 2.5: Delta numeric validation — recalculate AI-generated deltas
    const deltaValidated = schemaValid.map(c => validateDelta(c))

    // Gate 2.8: Relevance — comparison must be topically related to the fact
    const relevanceValid = deltaValidated.filter(c => validateRelevance(c, fact))

    // Gate 2.9: Metric Dimension Match — 交易量只能对比交易量，市值只能对比市值
    const dimensionValid = relevanceValid.filter(c => validateMetricDimension(c, fact))

    // Gate 3: Insight 校验
    const insightValid = dimensionValid.filter(c => validateInsight(c, fact))

    if (confidence === 'low' && insightValid.length === 0) {
      return { context_lines: [], comparisons: [], event_type: eventType, used_reference_ids: [], confidence: 'low' }
    }

    // Template assembly — limit to 2 comparisons max
    const finalComparisons = insightValid.slice(0, 2)
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
 * 批量为多条事实生成上下文 (串行 + 跨信号去重)
 * V16: 每个信号使用的 reference_id 不会被后续信号重复使用
 */
export async function generateBatchContext(
  facts: FactInput[],
): Promise<Map<number, ContextResult>> {
  const results = new Map<number, ContextResult>()
  const usedRefIds = new Set<string>()

  for (let i = 0; i < facts.length; i++) {
    const result = await generateFactContext(facts[i], usedRefIds)
    results.set(i, result)

    // Track used references to prevent reuse across signals
    for (const refId of result.used_reference_ids) {
      usedRefIds.add(refId)
    }
  }
  return results
}
