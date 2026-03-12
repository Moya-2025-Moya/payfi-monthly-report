// V1 来源回溯验证员 — 用 DB 中的全文 + Claude Haiku 判断事实与原文是否匹配
// 优先使用采集阶段已存储的 full_text，避免重复抓取源 URL

import { readFileSync } from 'fs'
import { join } from 'path'
import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import type { AtomicFact, V1Result } from '@/lib/types'

const PROMPT_TEMPLATE = readFileSync(
  join(process.cwd(), 'src/config/prompts/source-traceback.md'),
  'utf-8'
)

const MAX_ARTICLE_LENGTH = 10000

// ─── 从 DB 获取已采集的原文 ───

async function getStoredArticleText(fact: AtomicFact): Promise<string | null> {
  if (!fact.source_table || !fact.source_id) {
    console.log(`[V1] fact ${fact.id}: source_table 或 source_id 为空，跳过 DB 查询`)
    return null
  }

  try {
    const { data, error } = await supabaseAdmin
      .from(fact.source_table)
      .select('*')
      .eq('id', fact.source_id)
      .single()

    if (error) {
      console.log(`[V1] fact ${fact.id}: DB 查询失败 (${fact.source_table}/${fact.source_id}): ${error.message}`)
      return null
    }
    if (!data) {
      console.log(`[V1] fact ${fact.id}: DB 中未找到源记录 (${fact.source_table}/${fact.source_id})`)
      return null
    }

    // 优先用 full_text，其次 summary/description/content
    const row = data as Record<string, unknown>
    const fullText = row.full_text as string | null
    const summary = (row.summary ?? row.description ?? row.content) as string | null
    const title = (row.title ?? row.product_name ?? '') as string

    if (fullText && fullText.length > 20) {
      return `${title}\n\n${fullText}`
    }
    if (summary && summary.length > 10) {
      return `${title}\n\n${summary}`
    }
    // 即使只有 title 也尝试使用
    if (title.length > 10) {
      console.log(`[V1] fact ${fact.id}: 仅有 title (${title.length} chars)，尝试使用`)
      return title
    }
    console.log(`[V1] fact ${fact.id}: DB 中的原文内容过短 (full_text=${fullText?.length ?? 0}, summary=${summary?.length ?? 0}, title=${title.length})`)
    return null
  } catch (err) {
    console.log(`[V1] fact ${fact.id}: DB 查询异常: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

// ─── Fallback: Fetch 原文 ───

async function fetchArticleText(url: string, factId: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'StablePulse/1.0 (fact-verification)',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.log(`[V1] fact ${factId}: fetch 失败 HTTP ${res.status} — ${url}`)
      return null
    }

    const html = await res.text()
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (text.length < 20) {
      console.log(`[V1] fact ${factId}: fetch 成功但内容过短 (${text.length} chars) — ${url}`)
      return null
    }
    return text
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort')) {
      console.log(`[V1] fact ${factId}: fetch 超时 (15s) — ${url}`)
    } else {
      console.log(`[V1] fact ${factId}: fetch 异常: ${msg} — ${url}`)
    }
    return null
  }
}

// ─── 截断长文本，保留与事实最相关的段落 ───

function truncateToRelevant(text: string, factContent: string, maxLen: number): string {
  if (text.length <= maxLen) return text

  // 从事实中提取关键词
  const keywords = factContent
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 10)

  // 按段落切分，给每段打分
  const paragraphs = text.split(/\n{2,}|\. (?=[A-Z])/)
  const scored = paragraphs.map(p => {
    const lower = p.toLowerCase()
    const score = keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0)
    return { text: p, score }
  })

  // 按相关度排序，取前 N 段
  scored.sort((a, b) => b.score - a.score)

  let result = ''
  for (const p of scored) {
    if (result.length + p.text.length > maxLen) break
    result += p.text + '\n\n'
  }

  return result.trim() || text.slice(0, maxLen)
}

// ─── 主验证函数 ───

export async function validateSourceTraceback(fact: AtomicFact): Promise<V1Result> {
  if (!fact.source_url) {
    console.log(`[V1] fact ${fact.id}: 无 source_url`)
    return { status: 'source_unavailable', evidence_quote: null, match_score: 0 }
  }

  // 优先从 DB 获取已采集的全文，避免重复抓取
  let articleText = await getStoredArticleText(fact)
  if (!articleText) {
    // Fallback: 从源 URL 抓取
    articleText = await fetchArticleText(fact.source_url, fact.id)
  }
  if (!articleText) {
    console.log(`[V1] fact ${fact.id}: DB + fetch 均无法获取原文 → source_unavailable`)
    return { status: 'source_unavailable', evidence_quote: null, match_score: 0 }
  }

  // 截断长文本 (prefer content_zh since B1 now outputs Chinese)
  const factContent = fact.content_zh || fact.content_en
  if (!factContent) {
    console.log(`[V1] fact ${fact.id}: content_zh 和 content_en 均为空`)
    return { status: 'source_unavailable', evidence_quote: null, match_score: 0 }
  }
  const truncated = truncateToRelevant(articleText, factContent, MAX_ARTICLE_LENGTH)

  // AI 判断
  const prompt = PROMPT_TEMPLATE
    .replace('{fact_content}', factContent)
    .replace('{article_text}', truncated)

  try {
    const result = await callHaikuJSON<V1Result>(prompt)

    // 校验返回格式
    if (!result.status || !['matched', 'partial', 'no_match', 'source_unavailable'].includes(result.status)) {
      console.log(`[V1] fact ${fact.id}: AI 返回无效 status: ${JSON.stringify(result.status)}`)
      return { status: 'source_unavailable', evidence_quote: null, match_score: 0 }
    }

    return {
      status: result.status,
      evidence_quote: result.evidence_quote ?? null,
      match_score: Math.max(0, Math.min(100, result.match_score ?? 0)),
    }
  } catch (err) {
    console.log(`[V1] fact ${fact.id}: AI 调用失败: ${err instanceof Error ? err.message : String(err)}`)
    return { status: 'source_unavailable', evidence_quote: null, match_score: 0 }
  }
}

// ─── 批量验证 ───

export async function validateSourceTracebackBatch(
  facts: AtomicFact[]
): Promise<Map<string, V1Result>> {
  const results = new Map<string, V1Result>()

  // 串行处理 (避免并发 fetch 过多)
  for (const fact of facts) {
    results.set(fact.id, await validateSourceTraceback(fact))
  }

  return results
}
