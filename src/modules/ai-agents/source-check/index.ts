// V1 Source Check — Simplified source traceback for V2
//
// Only runs on importance 1-2 events.
// Checks if the event summary is supported by its source article text.
// Uses stored full_text from raw_items, falls back to HTTP fetch.

import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import type { V1Result, ExtractedEvent } from '@/lib/types'

const MAX_ARTICLE_LENGTH = 10000

// ─── Get article text from raw_items ───

async function getArticleText(rawItemIds: string[]): Promise<string | null> {
  if (rawItemIds.length === 0) return null

  const { data, error } = await supabaseAdmin
    .from('raw_items')
    .select('title, content, full_text, source_url')
    .in('id', rawItemIds)
    .limit(3) // check up to 3 sources

  if (error || !data || data.length === 0) return null

  // Combine available text from sources
  const parts: string[] = []
  for (const row of data) {
    const r = row as { title: string | null; content: string | null; full_text: string | null }
    const text = r.full_text ?? r.content ?? r.title
    if (text && text.length > 10) {
      parts.push(text)
    }
  }

  if (parts.length === 0) return null
  return parts.join('\n\n---\n\n').slice(0, MAX_ARTICLE_LENGTH)
}

// ─── Fallback: Fetch from URL ───

async function fetchArticleText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'UDailyNews/1.0 (fact-verification)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
    })

    clearTimeout(timeout)
    if (!res.ok) return null

    const html = await res.text()
    // Basic HTML stripping
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return text.length > 50 ? text.slice(0, MAX_ARTICLE_LENGTH) : null
  } catch {
    return null
  }
}

// ─── V1 Check ──────────────────────────────────────────────────────────────

export async function checkSource(event: ExtractedEvent): Promise<V1Result> {
  // Get article text
  let articleText = await getArticleText(event.raw_item_ids)

  // Fallback: fetch from first source URL
  if (!articleText && event.source_urls.length > 0) {
    articleText = await fetchArticleText(event.source_urls[0])
  }

  if (!articleText) {
    return { status: 'partial', evidence_quote: null, match_score: 50 }
  }

  // Ask AI to verify
  try {
    const result = await callHaikuJSON<{
      status: 'matched' | 'partial' | 'no_match'
      evidence_quote: string | null
      match_score: number
    }>(
      `Verify if this event summary is supported by the source article.

Event title: ${event.title_en || event.title_zh}
Event summary: ${event.summary_en || event.summary_zh}

Source article text:
${articleText}

Return JSON:
{
  "status": "matched" | "partial" | "no_match",
  "evidence_quote": "exact quote from article that supports the event, or null",
  "match_score": 0-100
}

- "matched": the event is clearly supported by the article
- "partial": some aspects are supported but details may differ
- "no_match": the article does not support this event`,
      { maxTokens: 512 }
    )

    return {
      status: result.status,
      evidence_quote: result.evidence_quote ?? null,
      match_score: result.match_score ?? 50,
    }
  } catch (err) {
    console.error('[source-check] AI call failed:', err instanceof Error ? err.message : String(err))
    return { status: 'partial', evidence_quote: null, match_score: 50 }
  }
}

// ─── Batch check for multiple events ───

export async function checkSources(events: ExtractedEvent[]): Promise<Map<number, V1Result>> {
  const results = new Map<number, V1Result>()

  // Only check importance 1-2
  const toCheck = events
    .map((e, i) => ({ event: e, index: i }))
    .filter(({ event }) => event.importance <= 2)

  console.log(`[source-check] Checking ${toCheck.length}/${events.length} events (importance 1-2 only)`)

  // Process sequentially to avoid overwhelming the AI
  for (const { event, index } of toCheck) {
    const result = await checkSource(event)
    results.set(index, result)
    console.log(`[source-check]   Event "${event.title_zh.slice(0, 30)}" → ${result.status} (${result.match_score})`)
  }

  return results
}
