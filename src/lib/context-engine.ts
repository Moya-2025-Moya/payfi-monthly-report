// Context Engine — 为每条事实自动匹配历史可比数据
// 三阶段 pipeline: 分类(规则) → 检索(确定性) → 生成(AI) → 验证(确定性)
// AI 只做一件事: 从给定候选材料中选择最相关的，组成对比句

import { supabaseAdmin } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import {
  type EventPattern,
  type ReferenceEvent,
  searchReferenceByTags,
  searchReferenceByType,
} from '@/config/reference-events'

// ── Types ──

export interface ContextResult {
  context_lines: string[]  // 2-3 条结构化上下文，每条含数字和日期
  event_type: EventPattern | null
  used_reference_ids: string[]
  confidence: 'high' | 'medium' | 'low'
}

interface FactInput {
  content: string       // 中文事实内容
  tags: string[]
  fact_date: string     // YYYY-MM-DD
  entity?: string
}

// ── Stage 1: 事件分类 (纯规则，不用 AI) ──

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

// ── Stage 2: 候选检索 (确定性，不用 AI) ──

interface CandidateContext {
  source: 'reference' | 'historical'
  content: string
  reference_id?: string
}

async function retrieveCandidates(
  fact: FactInput,
  eventType: EventPattern | null,
): Promise<CandidateContext[]> {
  const candidates: CandidateContext[] = []

  // 2A: 参考知识库检索
  let refEvents: ReferenceEvent[] = []
  if (eventType) {
    refEvents = searchReferenceByType(eventType, 3)
  }
  // 补充: 按 tags 检索
  const tagMatches = searchReferenceByTags(fact.tags, 3)
  for (const tm of tagMatches) {
    if (!refEvents.some(r => r.id === tm.id)) refEvents.push(tm)
  }

  // 将参考事件转为候选文本
  for (const ref of refEvents.slice(0, 4)) {
    const milestonesText = ref.milestones
      .map(m => `${m.date}: ${m.event}`)
      .join('; ')
    const metricsText = Object.entries(ref.metrics)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')
    candidates.push({
      source: 'reference',
      content: `[${ref.entity}] ${milestonesText} | 指标: ${metricsText}`,
      reference_id: ref.id,
    })
  }

  // 2B: 历史事实检索 (DB)
  try {
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
            })
          }
        }
      }
    }
  } catch {
    // DB 查询失败不影响流程
  }

  return candidates
}

// ── Stage 3: AI 上下文生成 (唯一用 LLM 的地方) ──

async function generateContext(
  fact: FactInput,
  eventType: EventPattern | null,
  candidates: CandidateContext[],
): Promise<{ lines: string[]; confidence: 'high' | 'medium' | 'low'; usedRefs: string[] }> {
  const candidatesText = candidates
    .map((c, i) => `[${i}] ${c.content}`)
    .join('\n')

  const result = await callHaikuJSON<{
    context: string[]
    used_indices: number[]
    confidence: 'high' | 'medium' | 'low'
  }>(
    `你是上下文关联工具。为以下事实生成 2-3 条历史可比上下文。

当前事实:
"${fact.content}"
事件类型: ${eventType ?? '未分类'}
日期: ${fact.fact_date}

候选历史材料 (${candidates.length} 条):
${candidatesText}

绝对规则:
1. 只能使用上面提供的候选材料，禁止使用任何外部知识
2. 每条上下文必须包含具体数字和日期
3. 不做预测 (不说"可能""预计")
4. 不做评价 (不说"值得关注""意义重大""利好")
5. 只陈述可验证的历史事实对比
6. 每条上下文不超过 60 个字
7. 如果候选材料不足以形成有意义的对比，返回空数组

输出严格 JSON:
{
  "context": ["对比句1", "对比句2"],
  "used_indices": [0, 1],
  "confidence": "high"
}`,
    { system: '事实对比引擎。输出严格 JSON。禁止预测和评价。', maxTokens: 800 }
  )

  const usedRefs = (result.used_indices ?? [])
    .filter(i => i >= 0 && i < candidates.length && candidates[i].reference_id)
    .map(i => candidates[i].reference_id!)

  return {
    lines: result.context ?? [],
    confidence: result.confidence ?? 'medium',
    usedRefs,
  }
}

// ── Stage 4: 输出验证 (确定性，不用 AI) ──

const OPINION_WORDS = /可能|或许|预计|看好|利空|建议|值得|关注|重大|利好|趋势|前景/

function validateContextLines(lines: string[]): string[] {
  return lines.filter(line => {
    // 必须有数字
    if (!/\d/.test(line)) return false
    // 不能有主观词汇
    if (OPINION_WORDS.test(line)) return false
    // 长度合理 (5-80 字)
    if (line.length < 5 || line.length > 80) return false
    return true
  })
}

// ── 主入口 ──

/**
 * 为一条事实生成上下文。
 * 如果无法生成有意义的上下文，返回空 context_lines。
 */
export async function generateFactContext(fact: FactInput): Promise<ContextResult> {
  // Stage 1: 分类
  const eventType = classifyEvent(fact)

  // Stage 2: 检索候选
  const candidates = await retrieveCandidates(fact, eventType)

  // 质量门 1: 候选不足 → 不生成
  if (candidates.length === 0) {
    return { context_lines: [], event_type: eventType, used_reference_ids: [], confidence: 'low' }
  }

  // Stage 3: AI 生成
  try {
    const { lines, confidence, usedRefs } = await generateContext(fact, eventType, candidates)

    // Stage 4: 验证
    const validatedLines = validateContextLines(lines)

    // 质量门 2: 低置信度且无有效行 → 丢弃
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
    // AI 调用失败 → 降级为无上下文
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
