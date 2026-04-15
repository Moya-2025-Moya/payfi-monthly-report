// B1 事实拆解Agent — 两次prompt流水线
// 输入: raw_*表中的新记录
// 输出: CandidateFact[] (status: pending_verification)

import { readFileSync } from 'fs'
import { join } from 'path'
import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import { normalizeTags } from '@/config/tag-vocabulary'
import { generateEmbeddings } from '@/lib/embedding'
import type { CandidateFact, FactType, Objectivity, SourceType } from '@/lib/types'

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
  objectivity?: Objectivity
  speaker?: string | null
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
      objectivity: fact.objectivity ?? 'fact',
      speaker: fact.speaker ?? null,
      evidence_sentence: fact.evidence_sentence,
      tags: fact.tags,
      metric_name: fact.metric_name ?? null,
      metric_value: fact.metric_value ?? null,
      metric_unit: fact.metric_unit ?? null,
      metric_period: fact.metric_period ?? null,
      metric_change: fact.metric_change ?? null,
      self_check: selfCheck,
    }
  })
}

// ─── 合法 fact_type 白名单 ───

const VALID_FACT_TYPES: Set<string> = new Set(['event', 'metric', 'quote', 'relationship', 'status_change'])

// ─── 过滤: unsupported 丢弃 + fact_type 校验 ───

function filterCandidates(candidates: CandidateFact[]): CandidateFact[] {
  return candidates.filter(c => {
    if (c.self_check === 'unsupported') return false
    if (!VALID_FACT_TYPES.has(c.fact_type)) {
      console.warn(`[fact-splitter] Invalid fact_type "${c.fact_type}", dropping: "${c.content.slice(0, 50)}..."`)
      return false
    }
    return true
  })
}

// ─── 语义查重: trigram Jaccard 相似度 ───

function trigrams(s: string): Set<string> {
  const t = new Set<string>()
  const lower = s.toLowerCase().replace(/\s+/g, '')
  for (let i = 0; i <= lower.length - 3; i++) {
    t.add(lower.slice(i, i + 3))
  }
  return t
}

function jaccardSimilarity(a: string, b: string): number {
  const ta = trigrams(a)
  const tb = trigrams(b)
  if (ta.size === 0 && tb.size === 0) return 1
  let intersection = 0
  for (const t of ta) {
    if (tb.has(t)) intersection++
  }
  return intersection / (ta.size + tb.size - intersection)
}

const DEDUP_SIMILARITY_THRESHOLD = 0.55

// Deduplicate candidates against existing facts in DB for the same week
async function deduplicateAgainstDB(
  candidates: CandidateFact[],
  weekNumber: string
): Promise<CandidateFact[]> {
  if (candidates.length === 0) return []

  // Fetch existing facts for this week (content_zh only, for comparison)
  const { data: existing } = await supabaseAdmin
    .from('atomic_facts')
    .select('content_zh')
    .eq('week_number', weekNumber)
    .limit(500)

  const existingContents = (existing ?? []).map((r: { content_zh: string }) => r.content_zh).filter(Boolean)

  if (existingContents.length === 0) return candidates

  // Filter out candidates that are too similar to existing facts
  const unique = candidates.filter(candidate => {
    for (const ec of existingContents) {
      if (jaccardSimilarity(candidate.content, ec) >= DEDUP_SIMILARITY_THRESHOLD) {
        console.log(`[fact-splitter] Dedup: "${candidate.content.slice(0, 40)}..." similar to existing fact`)
        return false
      }
    }
    return true
  })

  const dropped = candidates.length - unique.length
  if (dropped > 0) {
    console.log(`[fact-splitter] Dedup: dropped ${dropped}/${candidates.length} duplicate candidates`)
  }

  return unique
}

// Deduplicate within a batch of candidates (same batch, cross-source)
function deduplicateWithinBatch(candidates: CandidateFact[]): CandidateFact[] {
  if (candidates.length <= 1) return candidates

  const kept: CandidateFact[] = []
  for (const c of candidates) {
    const isDup = kept.some(k => jaccardSimilarity(c.content, k.content) >= DEDUP_SIMILARITY_THRESHOLD)
    if (!isDup) {
      kept.push(c)
    } else {
      console.log(`[fact-splitter] Intra-batch dedup: "${c.content.slice(0, 40)}..."`)
    }
  }
  return kept
}

// ─── 写入 atomic_facts 表 (status: pending_verification) ───

async function saveCandidates(
  candidates: CandidateFact[],
  raw: RawRecord,
  weekNumber: string
): Promise<string[]> {
  // Dedup against existing DB facts before inserting
  const deduped = await deduplicateAgainstDB(candidates, weekNumber)
  if (deduped.length === 0) return []

  const rows = deduped.map(c => ({
    content_zh: c.content,
    content_en: '',
    fact_type: c.fact_type,
    objectivity: c.objectivity ?? 'fact',
    speaker: c.speaker ?? null,
    tags: normalizeTags(c.tags),
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
  const factIds = (data ?? []).map((r: { id: string }) => r.id)

  // V12: Generate embeddings asynchronously (non-blocking, best-effort)
  if (factIds.length > 0) {
    const texts = deduped.map(c => c.content)
    generateEmbeddings(texts).then(async (embeddings) => {
      if (!embeddings) return
      for (let i = 0; i < factIds.length; i++) {
        if (embeddings[i]) {
          await supabaseAdmin
            .from('atomic_facts')
            .update({ embedding: JSON.stringify(embeddings[i]) })
            .eq('id', factIds[i])
        }
      }
    }).catch(err => {
      console.warn('[fact-splitter] Embedding generation failed (non-critical):', err)
    })
  }

  return factIds
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
    textBuilder: (r) => buildText(r.title as string, r.description as string | null, r.full_text as string | null),
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
    textBuilder: (r) => buildText(r.title as string, r.description as string | null, r.full_text as string | null),
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

const BATCH_SIZE = 4 // 每批并发条数（配合全局 AI 并发限制 6）
const BATCH_DELAY_MS = 2000 // 批间等待 2 秒，避免连续超限

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function processUnprocessedRaw(
  table: string,
  weekNumber: string,
  limit = 200,
  onProgress?: (current: number, total: number) => void,
  onCancelCheck?: () => Promise<void>
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

  // In-memory dedup cache for this table's run (catches cross-source dupes within same run)
  const recentContents: string[] = []

  // 分批串行处理（保证查重能看到前一批的插入）
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE)
    console.log(`[fact-splitter] ${table} 批次 ${batchNum}/${totalBatches} (${batch.length} 条)`)

    // 批内并发提取，但串行保存（先收集candidates，再统一查重+保存）
    const extractResults = await Promise.allSettled(
      batch.map(async (row) => {
        const raw = toRawRecord(row, table)
        if (raw.text.length < 30) return { raw, candidates: [] as CandidateFact[], dropped: 0 }
        const text = raw.text.length > 15000 ? raw.text.slice(0, 15000) : raw.text
        const extracted = await extractFacts(raw.source_url, raw.published_at, text)
        if (extracted.length === 0) {
          console.warn(`[fact-splitter] ${table} item ${raw.id}: AI returned 0 facts from ${text.length} chars`)
          return { raw, candidates: [], dropped: 0 }
        }
        console.log(`[fact-splitter] ${table} item ${raw.id}: extracted ${extracted.length} facts`)
        const verdicts = await verifyFacts(text, extracted)
        const allCandidates = mergeToCandidates(extracted, verdicts)
        const filtered = filterCandidates(allCandidates)
        return { raw, candidates: filtered, dropped: allCandidates.length - filtered.length }
      })
    )

    // Report progress at batch level
    const batchEnd = Math.min(i + BATCH_SIZE, rows.length)
    onProgress?.(batchEnd, rows.length)

    // 串行保存：每条结果先做 in-memory dedup，再保存
    for (const r of extractResults) {
      if (r.status !== 'fulfilled') {
        console.error(`[fact-splitter] ${table} item failed:`, r.reason)
        continue
      }

      const { raw, candidates, dropped } = r.value
      totalDropped += dropped

      // In-memory cross-source dedup
      const unique = candidates.filter(c => {
        const isDup = recentContents.some(rc => jaccardSimilarity(c.content, rc) >= DEDUP_SIMILARITY_THRESHOLD)
        if (isDup) {
          console.log(`[fact-splitter] Cross-source dedup: "${c.content.slice(0, 40)}..."`)
          totalDropped++
          return false
        }
        return true
      })

      if (unique.length > 0) {
        const factIds = await saveCandidates(unique, raw, weekNumber)
        allFactIds.push(...factIds)
        // Add to in-memory cache for cross-source dedup
        for (const c of unique) recentContents.push(c.content)
      }

      // 标记原始数据为已处理
      await supabaseAdmin.from(table).update({ processed: true }).eq('id', raw.id)
    }

    // 非最后一批时：检查取消 + 短暂等待
    if (i + BATCH_SIZE < rows.length) {
      if (onCancelCheck) await onCancelCheck()
      await sleep(BATCH_DELAY_MS)
    }
  }

  return { total: rows.length, factIds: allFactIds, dropped: totalDropped }
}
