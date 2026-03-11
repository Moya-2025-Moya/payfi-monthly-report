// V1 来源回溯验证员 — Fetch source_url + Claude Haiku 判断事实与原文是否匹配

import { readFileSync } from 'fs'
import { join } from 'path'
import { callHaikuJSON } from '@/lib/ai-client'
import type { AtomicFact, V1Result } from '@/lib/types'

const PROMPT_TEMPLATE = readFileSync(
  join(process.cwd(), 'src/config/prompts/source-traceback.md'),
  'utf-8'
)

const MAX_ARTICLE_LENGTH = 10000

// ─── Fetch 原文内容 ───

async function fetchArticleText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'StablePulse/1.0 (fact-verification)',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) return null

    const html = await res.text()

    // 简易正文提取: 去掉HTML标签，保留文本
    // 生产环境应使用 @mozilla/readability
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (text.length < 50) return null
    return text
  } catch {
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
    return { status: 'source_unavailable', evidence_quote: null, match_score: 0 }
  }

  // Fetch 原文
  const articleText = await fetchArticleText(fact.source_url)
  if (!articleText) {
    return { status: 'source_unavailable', evidence_quote: null, match_score: 0 }
  }

  // 截断长文本
  const truncated = truncateToRelevant(articleText, fact.content_en, MAX_ARTICLE_LENGTH)

  // AI 判断
  const prompt = PROMPT_TEMPLATE
    .replace('{fact_content}', fact.content_en)
    .replace('{article_text}', truncated)

  try {
    const result = await callHaikuJSON<V1Result>(prompt)

    // 校验返回格式
    if (!result.status || !['matched', 'partial', 'no_match', 'source_unavailable'].includes(result.status)) {
      return { status: 'source_unavailable', evidence_quote: null, match_score: 0 }
    }

    return {
      status: result.status,
      evidence_quote: result.evidence_quote ?? null,
      match_score: Math.max(0, Math.min(100, result.match_score ?? 0)),
    }
  } catch {
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
