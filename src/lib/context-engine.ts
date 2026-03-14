// Context Engine V17 — Insight-driven + 外部搜索兜底 + AI 生成连接词 + 跨信号去重
// AI 只填 JSON 字段（日期、数字、实体名），代码组装句子
// 对比不再要求严格维度匹配，而是要求能推导出有价值的结论

import { supabaseAdmin } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import { generateQueryEmbedding } from '@/lib/embedding'
import { searchWeb } from '@/lib/web-search'
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
  metric_dimension: string  // 维度标签
  connector: string         // V17: AI 生成的连接词，符合语境（如 "此前，" "作为参照，" "同一赛道中，"）
  source_url?: string       // V17: 外部搜索时的来源 URL
  // 当前 vs 历史并排对比
  current_entity?: string
  current_value?: string
  delta_label?: string
  // 对比说明
  comparison_basis?: string
  insight?: string          // null
}

export interface ContextResult {
  context_lines: string[]
  comparisons: ContextComparison[]
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
  source: 'reference' | 'historical' | 'web'
  content: string
  reference_id?: string
  entity?: string
  date?: string
  metric_value?: string
  source_url?: string  // V17: 外部搜索来源
}

async function retrieveCandidates(
  fact: FactInput,
  eventType: EventPattern | null,
): Promise<CandidateContext[]> {
  const candidates: CandidateContext[] = []

  // 2A: 参考知识库 — 规则检索
  let refEvents: ReferenceEvent[] = []
  if (eventType) {
    refEvents = searchReferenceByType(eventType, 3)
  }
  const tagMatches = searchReferenceByTags(fact.tags, 3)
  for (const tm of tagMatches) {
    if (!refEvents.some(r => r.id === tm.id)) refEvents.push(tm)
  }
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

  // Generate embedding once
  let queryEmb: number[] | null = null
  try {
    queryEmb = await generateQueryEmbedding(fact.content)
  } catch { /* continue */ }

  // 2A+: Vector search for reference_events
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
  } catch { /* continue */ }

  // 2B: 历史事实检索
  try {
    let historicalFound = false
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
  } catch { /* continue */ }

  return candidates
}

// ── Stage 2C: 外部搜索兜底 ──
// 当内部候选不足时，通过 web search 找外部对比数据

async function retrieveExternalCandidates(fact: FactInput): Promise<CandidateContext[]> {
  const candidates: CandidateContext[] = []

  try {
    // 构造搜索查询: 提取核心实体和主题
    const query = `${fact.content} 历史数据 对比`
    const results = await searchWeb(query, 5)

    for (const r of results) {
      candidates.push({
        source: 'web',
        content: `[外部] ${r.title}: ${r.description}`,
        source_url: r.url,
        date: r.date ?? undefined,
      })
    }
  } catch { /* continue */ }

  return candidates
}

// ── Metric Dimension Classification ──

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

// ── Stage 3: AI 结构化提取 (V17 格式) ──
// SOP: 1) 分析事实核心主题 2) 从候选中找能产生 insight 的对比 3) 生成符合语境的连接词

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

  const factDimension = classifyMetricDimension(fact.content)

  const result = await callHaikuJSON<{
    comparisons: ContextComparison[]
    confidence: 'high' | 'medium' | 'low'
  }>(
    `你是结构化数据提取工具。严格按以下 SOP 操作。

═══════════════════════════════════
SOP 第一步：分析当前事实
═══════════════════════════════════
当前事实: "${fact.content}"
事件类型: ${eventType ?? '未分类'}
日期: ${fact.fact_date}
${factDimension ? `系统预判维度: ${factDimension}` : ''}

═══════════════════════════════════
SOP 第二步：从候选中找有价值的对比
═══════════════════════════════════
候选历史材料 (${filteredCandidates.length} 条):
${candidatesText}

选择标准（按优先级排序）:
1. 【最优】同维度对比: 交易量 vs 交易量，市值 vs 市值 → 可以直接量化差异
2. 【次优】同主题不同角度: 同一实体的不同指标，或同一事件的不同阶段 → 可以提供背景
3. 【可接受】同行业先例: 类似公司/产品的类似动作 → 可以作为参照
4. 【拒绝】毫无关联: 无法推导出任何有价值的结论 → 返回空数组

⚠️ 核心判断标准: 读者看到这个对比后，能否得出一个 solid 的结论？
  ✓ "Airwallex G轮融资 3.3亿" → 对比 "Circle F轮融资 4亿" → 结论: 同赛道融资规模相当
  ✓ "USDC 交易量 12万亿" → 对比 "USDT 交易量 8万亿" → 结论: USDC 交易量已超 USDT
  ✗ "USDC 交易量 12万亿" → 对比 "USDT 市值 100亿" → 无法比较，不同指标
  ✗ "法案延迟" → 对比 "Coinbase IPO" → 完全不相关

═══════════════════════════════════
SOP 第三步：填充结构化字段
═══════════════════════════════════
每个对比数据点:
{
  "reference_event": "历史事件简称（中文，实体名保留英文）",
  "metric_label": "对比维度名（纯中文）",
  "metric_value": "历史数值（必须含数字，禁止包含日期年份）",
  "date_range": "历史时间范围（必须含年份）",
  "metric_dimension": "维度标签",
  "used_candidate_index": 候选编号,
  "connector": "连接词（见下方规则）",
  "current_entity": "当前事实实体名（可省略）",
  "current_value": "当前事实同维度数值（可省略）",
  "delta_label": "差值（可省略）",
  "comparison_basis": "可比性依据（一句话）",
  "insight": null
}

═══════════════════════════════════
连接词规则（connector 字段）
═══════════════════════════════════
连接词必须准确反映对比关系，不能随意使用。从以下选项中选择最贴切的:
- "此前，" → 同一实体/主题的历史事件（时间递进关系）
- "作为参照，" → 同行业/同赛道的类似事件（横向参照）
- "同一赛道中，" → 竞品/同类公司的类似动作
- "在此之前，" → 时间上更早的相关先例
- "从行业历史看，" → 更宏观的行业背景参照

⚠️ 禁止使用 "相比之下，" — 这个词过于笼统，不传达任何信息
⚠️ 禁止使用 "值得注意的是，" — 这是主观评价
⚠️ 每个对比的 connector 必须不同

═══════════════════════════════════
绝对规则
═══════════════════════════════════
1. 只能使用上面的候选材料，禁止外部知识
2. ⚠️ metric_value 只放数值，禁止包含年份/日期（日期放 date_range）
3. reference_event 用简短事件名，禁止评价词
4. 如果候选材料不足以形成有价值的对比，必须返回空数组
5. current_entity/current_value/delta_label 三个字段要么全部提供，要么全部省略
6. delta_label 禁止评价词，只写 "快/慢/大/小/多/少 + 数值"
7. 所有描述字段用中文，实体名保留英文
8. 提取 1 个（最多 1 个）对比数据点，质量优先

输出严格 JSON:
{"comparisons": [...], "confidence": "high"|"medium"|"low"}`,
    { system: '结构化数据提取工具。输出严格 JSON。只提取事实字段。所有描述性字段用中文（实体名保留英文）。对比必须能推导出有价值的结论。', maxTokens: 800 }
  )

  const comparisons = result.comparisons ?? []

  // Map back to original candidate indices if we filtered
  const usedRefs = comparisons
    .filter(c => c.used_candidate_index >= 0 && c.used_candidate_index < filteredCandidates.length && filteredCandidates[c.used_candidate_index].reference_id)
    .map(c => filteredCandidates[c.used_candidate_index].reference_id!)

  // Attach source_url from web candidates
  for (const comp of comparisons) {
    const cand = filteredCandidates[comp.used_candidate_index]
    if (cand?.source_url) {
      comp.source_url = cand.source_url
    }
  }

  return {
    comparisons,
    confidence: result.confidence ?? 'medium',
    usedRefs: [...new Set(usedRefs)],
  }
}

// ── Template assembly ──

function assembleContextLine(comp: ContextComparison): string {
  const cleanValue = comp.metric_value.replace(/\s*\(?\d{4}[年.]?\d{0,2}[月.]?\d{0,2}日?\)?/g, '').trim()
  const value = cleanValue || comp.metric_value
  return `${comp.reference_event}，${comp.metric_label}为 ${value}（${comp.date_range}）`
}

// ── Quality Gate 2: Schema 校验 ──

const OPINION_WORDS = /可能|或许|预计|看好|利空|建议|值得|关注|重大|利好|趋势|前景|有望|显著|意义|令人|震撼|突破性|革命/

function validateComparison(comp: ContextComparison, candidateCount: number): boolean {
  if (comp.used_candidate_index < 0 || comp.used_candidate_index >= candidateCount) return false
  if (!/\d/.test(comp.metric_value ?? '')) return false
  if (!/\d{4}/.test(comp.date_range ?? '')) return false
  const allText = `${comp.reference_event} ${comp.metric_label} ${comp.metric_value}`
  if (OPINION_WORDS.test(allText)) return false
  if (comp.delta_label && OPINION_WORDS.test(comp.delta_label)) return false
  const line = assembleContextLine(comp)
  if (line.length < 5 || line.length > 160) return false
  return true
}

// ── Quality Gate 2.5: Delta numeric validation ──

function extractNumber(s: string): number | null {
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
    return { ...comp, delta_label: undefined }
  }

  const ratio = currentNum / refNum
  const pctDiff = Math.abs((ratio - 1) * 100)

  const claimedMatch = comp.delta_label.match(/([\d.]+)\s*(%|x|倍)/)
  if (!claimedMatch) return comp

  const claimedNum = parseFloat(claimedMatch[1])
  const claimedUnit = claimedMatch[2]

  let expectedNum: number
  if (claimedUnit === 'x' || claimedUnit === '倍') {
    expectedNum = ratio > 1 ? ratio : 1 / ratio
  } else {
    expectedNum = pctDiff
  }

  if (Math.abs(claimedNum - expectedNum) / Math.max(expectedNum, 1) > 0.2) {
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

// ── Quality Gate 2.8: Relevance check ──

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

// ── Quality Gate 2.9: Insight Value Check ──
// V17: 不再要求严格维度匹配，而是检查对比是否能推导出有价值的结论
// 拒绝明显无关的对比（如 交易量 vs 市值），但允许同主题不同角度

function validateInsightValue(comp: ContextComparison, fact: FactInput): boolean {
  const factDim = classifyMetricDimension(fact.content)
  const compDim = classifyMetricDimension(`${comp.metric_label} ${comp.reference_event}`)

  // 如果两者维度都能识别且完全不同，需要检查是否有合理关联
  if (factDim && compDim && factDim !== compDim) {
    // 允许的跨维度组合（有合理关联）
    const ALLOWED_CROSS: [MetricDimension, MetricDimension][] = [
      ['融资规模', '市值'],       // 融资 vs 估值/市值 — 常见对比
      ['市值', '融资规模'],
      ['交易量', '市场份额'],     // 量 vs 份额 — 互补视角
      ['市场份额', '交易量'],
      ['TVL', '市值'],            // TVL vs 市值 — DeFi 常见
      ['市值', 'TVL'],
      ['用户增长', '交易量'],     // 用户 vs 交易量 — 相关指标
      ['交易量', '用户增长'],
    ]
    const isAllowed = ALLOWED_CROSS.some(([a, b]) => a === factDim && b === compDim)
    if (!isAllowed) return false
  }

  return true
}

// ── Quality Gate 3: Insight 校验 ──

function validateInsight(comp: ContextComparison, fact: FactInput): boolean {
  const dateMatch = comp.date_range.match(/(\d{4})[年.](\d{1,2})/)
  if (dateMatch) {
    const refDate = new Date(`${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-15`)
    const factDate = new Date(fact.fact_date)
    const daysDiff = Math.abs((factDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff < 60) {
      if (!fact.entity || !comp.reference_event || comp.reference_event.toLowerCase().includes(fact.entity.toLowerCase())) {
        return false
      }
    }
  }

  const trivialDelta = /[+-]?0\.?\d?%/.test(comp.metric_value)
  if (trivialDelta && !/[1-9]\d/.test(comp.metric_value)) return false

  if (comp.metric_label.length < 2) return false

  return true
}

// ── Connector validation ──

const VALID_CONNECTORS = [
  '此前，', '作为参照，', '同一赛道中，', '在此之前，', '从行业历史看，',
]

function sanitizeConnector(connector: string | undefined): string {
  if (!connector) return '作为参照，'
  const trimmed = connector.trim().replace(/，$/, '') + '，'
  // Check against known good connectors
  if (VALID_CONNECTORS.includes(trimmed)) return trimmed
  // Reject banned connectors
  if (trimmed.includes('相比之下') || trimmed.includes('值得注意')) return '作为参照，'
  // Accept if it looks reasonable (4-10 chars, ends with ，)
  if (trimmed.length >= 3 && trimmed.length <= 12) return trimmed
  return '作为参照，'
}

// ── 主入口 ──

export async function generateFactContext(
  fact: FactInput,
  excludeReferenceIds?: Set<string>,
): Promise<ContextResult> {
  const eventType = classifyEvent(fact)
  let candidates = await retrieveCandidates(fact, eventType)

  // Gate 1: 候选充分性 — 内部候选不足时尝试外部搜索
  if (candidates.length === 0) {
    candidates = await retrieveExternalCandidates(fact)
    if (candidates.length === 0) {
      return { context_lines: [], comparisons: [], event_type: eventType, used_reference_ids: [], confidence: 'low' }
    }
  }

  try {
    const { comparisons, confidence, usedRefs } = await generateStructuredContext(fact, eventType, candidates, excludeReferenceIds)

    // Gate 2: Schema 校验
    const schemaValid = comparisons.filter(c => validateComparison(c, candidates.length))

    // Gate 2.5: Delta numeric validation
    const deltaValidated = schemaValid.map(c => validateDelta(c))

    // Gate 2.8: Relevance
    const relevanceValid = deltaValidated.filter(c => validateRelevance(c, fact))

    // Gate 2.9: Insight value — 对比必须能推导出有价值的结论
    const insightValueValid = relevanceValid.filter(c => validateInsightValue(c, fact))

    // Gate 3: Insight 校验
    const insightValid = insightValueValid.filter(c => validateInsight(c, fact))

    // Sanitize connectors
    const withConnectors = insightValid.map(c => ({
      ...c,
      connector: sanitizeConnector(c.connector),
    }))

    if (confidence === 'low' && withConnectors.length === 0) {
      // 内部候选通不过 gate → 尝试外部搜索
      if (!candidates.some(c => c.source === 'web')) {
        const externalCandidates = await retrieveExternalCandidates(fact)
        if (externalCandidates.length > 0) {
          const allCandidates = [...candidates, ...externalCandidates]
          const retry = await generateStructuredContext(fact, eventType, allCandidates, excludeReferenceIds)
          const retryValid = retry.comparisons
            .filter(c => validateComparison(c, allCandidates.length))
            .map(c => validateDelta(c))
            .filter(c => validateRelevance(c, fact))
            .filter(c => validateInsightValue(c, fact))
            .filter(c => validateInsight(c, fact))
            .map(c => ({ ...c, connector: sanitizeConnector(c.connector) }))

          if (retryValid.length > 0) {
            const final = retryValid.slice(0, 1)
            return {
              context_lines: final.map(assembleContextLine),
              comparisons: final,
              event_type: eventType,
              used_reference_ids: retry.usedRefs,
              confidence: retry.confidence,
            }
          }
        }
      }
      return { context_lines: [], comparisons: [], event_type: eventType, used_reference_ids: [], confidence: 'low' }
    }

    const finalComparisons = withConnectors.slice(0, 1)
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
 * V17: 每条信号保证有对比（内部 → 外部兜底）
 */
export async function generateBatchContext(
  facts: FactInput[],
): Promise<Map<number, ContextResult>> {
  const results = new Map<number, ContextResult>()
  const usedRefIds = new Set<string>()

  for (let i = 0; i < facts.length; i++) {
    const result = await generateFactContext(facts[i], usedRefIds)
    results.set(i, result)

    for (const refId of result.used_reference_ids) {
      usedRefIds.add(refId)
    }
  }
  return results
}
