// B1 事实拆解Agent — 两次prompt流水线
// 输入: raw_*表中的新记录
// 输出: CandidateFact[] (status: pending_verification)

import { readFileSync } from 'fs'
import { join } from 'path'
import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import type { CandidateFact, FactType, SourceType } from '@/lib/types'

// ─── Prompt 模板 ───

const PROMPTS_DIR = join(process.cwd(), 'src/config/prompts')

function loadPrompt(filename: string): string {
  return readFileSync(join(PROMPTS_DIR, filename), 'utf-8')
}

// ─── 类型 ───

interface RawRecord {
  id: string
  source_url: string
  source_table: string
  source_type: SourceType
  source_credibility: 'official' | 'media' | 'social' | 'derived'
  published_at: string
  text: string // 提取用的文本 (title + summary/full_text)
}

interface ExtractedFact {
  content: string
  fact_type: FactType
  evidence_sentence: string
  tags: string[]
  metric_name?: string | null
  metric_value?: number | null
  metric_unit?: string | null
  metric_period?: string | null
  metric_change?: string | null
}

interface VerifyVerdict {
  index: number
  verdict: 'supported' | 'partial' | 'unsupported'
  reason: string
}

// ─── Prompt 1: 提取候选事实 ───

async function extractFacts(sourceUrl: string, publishedAt: string, sourceText: string): Promise<ExtractedFact[]> {
  const template = loadPrompt('fact-splitter-extract.md')
  const prompt = template
    .replace('{source_url}', sourceUrl)
    .replace('{published_at}', publishedAt)
    .replace('{source_text}', sourceText)

  return callHaikuJSON<ExtractedFact[]>(prompt)
}

// ─── Prompt 2: 反向自查 ───

async function verifyFacts(sourceText: string, facts: ExtractedFact[]): Promise<VerifyVerdict[]> {
  const template = loadPrompt('fact-splitter-verify.md')
  const prompt = template
    .replace('{source_text}', sourceText)
    .replace('{facts_json}', JSON.stringify(facts, null, 2))

  return callHaikuJSON<VerifyVerdict[]>(prompt)
}

// ─── 合并提取+自查结果 ───

function mergeToCandidates(facts: ExtractedFact[], verdicts: VerifyVerdict[]): CandidateFact[] {
  const verdictMap = new Map(verdicts.map(v => [v.index, v]))

  return facts.map((fact, i) => {
    const verdict = verdictMap.get(i)
    const selfCheck = verdict?.verdict ?? 'unsupported'

    return {
      content: fact.content,
      fact_type: fact.fact_type,
      evidence_sentence: fact.evidence_sentence,
      tags: fact.tags,
      metric_name: fact.metric_name ?? undefined,
      metric_value: fact.metric_value ?? undefined,
      metric_unit: fact.metric_unit ?? undefined,
      metric_period: fact.metric_period ?? undefined,
      metric_change: fact.metric_change ?? undefined,
      self_check: selfCheck,
    }
  })
}

// ─── 过滤: unsupported 丢弃 ───

function filterCandidates(candidates: CandidateFact[]): CandidateFact[] {
  return candidates.filter(c => c.self_check !== 'unsupported')
}

// ─── 写入 atomic_facts 表 (status: pending_verification) ───

async function saveCandidates(
  candidates: CandidateFact[],
  raw: RawRecord,
  weekNumber: string
): Promise<string[]> {
  const rows = candidates.map(c => ({
    content_zh: c.content,
    content_en: '',
    fact_type: c.fact_type,
    tags: c.tags,
    source_id: raw.id,
    source_table: raw.source_table,
    source_type: raw.source_type,
    source_url: raw.source_url,
    source_credibility: raw.source_credibility,
    metric_name: c.metric_name ?? null,
    metric_value: c.metric_value ?? null,
    metric_unit: c.metric_unit ?? null,
    metric_period: c.metric_period ?? null,
    metric_change: c.metric_change ?? null,
    verification_status: 'pending_verification',
    confidence: null,
    confidence_reasons: [],
    v1_result: null,
    v2_result: null,
    v3_result: null,
    v4_result: null,
    v5_result: null,
    fact_date: raw.published_at,
    week_number: weekNumber,
  }))

  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .insert(rows)
    .select('id')

  if (error) throw new Error(`Failed to save candidates: ${error.message}`)
  return (data ?? []).map((r: { id: string }) => r.id)
}

// ─── 从 raw_* 表构建 RawRecord ───

function buildText(title: string, summary?: string | null, fullText?: string | null): string {
  const parts = [title]
  if (summary) parts.push(summary)
  if (fullText) parts.push(fullText)
  return parts.join('\n\n')
}

const SOURCE_TABLE_CONFIG: Record<string, {
  sourceType: SourceType
  credibility: 'official' | 'media' | 'social' | 'derived'
  textBuilder: (row: Record<string, unknown>) => string
}> = {
  raw_news: {
    sourceType: 'news',
    credibility: 'media',
    textBuilder: (r) => buildText(r.title as string, r.summary as string | null, r.full_text as string | null),
  },
  raw_filings: {
    sourceType: 'filing',
    credibility: 'official',
    textBuilder: (r) => buildText(`${r.filing_type}: ${r.company_name}`, r.description as string | null, r.full_text as string | null),
  },
  raw_product_updates: {
    sourceType: 'product',
    credibility: 'official',
    textBuilder: (r) => buildText(r.title as string, r.description as string | null),
  },
  raw_funding: {
    sourceType: 'funding',
    credibility: 'media',
    textBuilder: (r) => buildText(
      `${r.project_name} ${r.round ?? ''} funding`,
      `Amount: ${r.amount ?? 'undisclosed'} ${r.amount_unit ?? 'USD'}. Investors: ${(r.investors as string[])?.join(', ') ?? 'undisclosed'}`
    ),
  },
  raw_tweets: {
    sourceType: 'tweet',
    credibility: 'social',
    textBuilder: (r) => `@${r.author_handle} (${r.author_category}): ${r.content}`,
  },
  raw_regulatory: {
    sourceType: 'regulatory',
    credibility: 'official',
    textBuilder: (r) => buildText(r.title as string, r.description as string | null),
  },
}

function toRawRecord(row: Record<string, unknown>, table: string): RawRecord {
  const config = SOURCE_TABLE_CONFIG[table]
  if (!config) throw new Error(`Unknown source table: ${table}`)

  const sourceUrl = (row.source_url ?? row.filing_url ?? '') as string
  const publishedAt = (row.published_at ?? row.filing_date ?? row.posted_at ?? row.announced_at ?? '') as string

  return {
    id: row.id as string,
    source_url: sourceUrl,
    source_table: table,
    source_type: config.sourceType,
    source_credibility: config.credibility,
    published_at: publishedAt,
    text: config.textBuilder(row),
  }
}

// ─── 主函数: 处理单条原始数据 ───

export async function splitFacts(
  row: Record<string, unknown>,
  table: string,
  weekNumber: string
): Promise<{ factIds: string[]; candidates: CandidateFact[]; dropped: number }> {
  const raw = toRawRecord(row, table)

  // 文本过短则跳过
  if (raw.text.length < 30) {
    return { factIds: [], candidates: [], dropped: 0 }
  }

  // 截断过长文本 (token 预算考虑)
  const text = raw.text.length > 15000 ? raw.text.slice(0, 15000) : raw.text

  // Prompt 1: 提取
  const extracted = await extractFacts(raw.source_url, raw.published_at, text)

  if (extracted.length === 0) {
    return { factIds: [], candidates: [], dropped: 0 }
  }

  // Prompt 2: 反向自查
  const verdicts = await verifyFacts(text, extracted)

  // 合并 + 过滤
  const allCandidates = mergeToCandidates(extracted, verdicts)
  const filtered = filterCandidates(allCandidates)
  const dropped = allCandidates.length - filtered.length

  // 写入 DB
  const factIds = await saveCandidates(filtered, raw, weekNumber)

  // 标记原始数据为已处理
  await supabaseAdmin
    .from(table)
    .update({ processed: true })
    .eq('id', raw.id)

  return { factIds, candidates: filtered, dropped }
}

// ─── 批量处理: 获取未处理的原始数据并拆解 ───

export async function processUnprocessedRaw(
  table: string,
  weekNumber: string,
  limit = 50
): Promise<{ total: number; factIds: string[]; dropped: number }> {
  const { data: rows, error } = await supabaseAdmin
    .from(table)
    .select('*')
    .eq('processed', false)
    .limit(limit)

  if (error) throw new Error(`Failed to fetch from ${table}: ${error.message}`)
  if (!rows || rows.length === 0) return { total: 0, factIds: [], dropped: 0 }

  const allFactIds: string[] = []
  let totalDropped = 0

  for (const row of rows) {
    const result = await splitFacts(row, table, weekNumber)
    allFactIds.push(...result.factIds)
    totalDropped += result.dropped
  }

  return { total: rows.length, factIds: allFactIds, dropped: totalDropped }
}
