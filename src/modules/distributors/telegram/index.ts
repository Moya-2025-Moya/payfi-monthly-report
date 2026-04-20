// ============================================================
// $U Daily News V2 — Telegram Distributor
//
// Two output formats:
//   pushDailySummary()   — 10:00 Beijing digest, ALL events grouped by category
//   pushWeeklySummary()  — Monday trend analysis (AI opinion allowed)
//
// Also: bot commands (/watch, /unwatch, /list)
// ============================================================

import { supabaseAdmin } from '@/db/client'
import { SOURCES } from '@/config/sources'
import type { Event, WeeklySummary } from '@/lib/types'

// ─── Config ────────────────────────────────────────────────────────────────

const BOT_TOKEN = SOURCES.telegram.botToken
const CHAT_ID = SOURCES.telegram.chatId
const THREAD_CN = SOURCES.telegram.threadCn

// Telegram hard limit is 4096 chars per message; leave headroom for the
// footer line and any final-count text we append.
const TG_MESSAGE_SOFT_LIMIT = 3900

// ─── Core send ─────────────────────────────────────────────────────────────

async function sendToThread(
  text: string,
  threadId?: number,
): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('[telegram] Bot token or chat ID not configured')
    return
  }

  const body: Record<string, unknown> = {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }
  if (threadId !== undefined) body.message_thread_id = threadId

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telegram API error ${res.status}: ${err}`)
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function todayLabel(): string {
  const d = new Date()
  return d.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\//g, '.')
}

const CATEGORY_EMOJI: Record<string, string> = {
  regulatory: '📋',
  partnership: '🤝',
  product: '🚀',
  funding: '💰',
  market: '📊',
  policy: '📜',
  technical: '⚙️',
  other: '📌',
}

const CATEGORY_LABEL_ZH: Record<string, string> = {
  regulatory: '监管动态',
  policy: '政策风向',
  funding: '融资并购',
  partnership: '合作生态',
  product: '产品发布',
  market: '市场数据',
  technical: '技术进展',
  other: '其他',
}

// Output order for the daily digest sections.
const CATEGORY_ORDER: string[] = [
  'regulatory',
  'policy',
  'funding',
  'partnership',
  'product',
  'market',
  'technical',
  'other',
]

const IMPORTANCE_EMOJI: Record<number, string> = {
  1: '🔴',
  2: '🟠',
  3: '🔵',
  4: '⚪',
}

function sourceLink(urls: string[]): string {
  if (urls.length === 0) return ''
  if (urls.length === 1) return ` <a href="${urls[0]}">🔗</a>`
  return ` <a href="${urls[0]}">🔗</a> +${urls.length - 1}`
}

// ─── Daily Summary (10:00 Beijing, single message, category-grouped) ───────

// Compact one-line format: importance marker (1/2 only) + clickable title.
// Title links to the first source URL; additional sources noted as "+N".
function formatEventLine(e: Event): string {
  const impEmoji = e.importance <= 2 ? `${IMPORTANCE_EMOJI[e.importance]} ` : '· '
  const primaryUrl = e.source_urls[0]
  const extra = e.source_urls.length > 1 ? ` +${e.source_urls.length - 1}` : ''
  const title = esc(e.title_zh)
  const linked = primaryUrl ? `<a href="${primaryUrl}">${title}</a>` : title
  return `${impEmoji}${linked}${extra}\n`
}

function buildDigestBody(
  byCategory: Map<string, Event[]>,
  total: number,
  omitted: number,
): string {
  let body = `📰 <b>$U Daily News 日报</b> · ${todayLabel()}\n`
  for (const cat of CATEGORY_ORDER) {
    const bucket = byCategory.get(cat)
    if (!bucket || bucket.length === 0) continue
    const catEmoji = CATEGORY_EMOJI[cat] ?? '📌'
    const catLabel = CATEGORY_LABEL_ZH[cat] ?? cat
    body += `\n━━ ${catEmoji} ${catLabel} (${bucket.length}) ━━\n`
    for (const e of bucket) body += formatEventLine(e)
  }
  const footer = omitted > 0
    ? `\n── 今日 ${total} 条，另有 ${omitted} 条略`
    : `\n── 今日共 ${total} 条事件`
  return body + footer
}

export async function pushDailySummary(): Promise<number> {
  // 36h window gives late-published items a chance; the real dedup key is
  // `included_in_daily=false`.
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000)

  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .gte('published_at', since.toISOString())
    .eq('included_in_daily', false)
    .order('importance', { ascending: true })
    .order('published_at', { ascending: false })

  if (error || !events || events.length === 0) {
    console.log('[telegram] No events for daily summary')
    return 0
  }

  const allEvents = events as Event[]
  const total = allEvents.length

  // Bucket by category, preserving the importance/recency order within each.
  const byCategory = new Map<string, Event[]>()
  for (const e of allEvents) {
    const cat = e.category in CATEGORY_EMOJI ? e.category : 'other'
    const bucket = byCategory.get(cat) ?? []
    bucket.push(e)
    byCategory.set(cat, bucket)
  }

  // Enforce single-message delivery. If the full digest would exceed the
  // Telegram soft limit, drop trailing items starting from the lowest-priority
  // category (CATEGORY_ORDER is reverse-priority order for dropping) until it
  // fits. Within a category, drop the least-important item first.
  let omitted = 0
  const dropOrder = [...CATEGORY_ORDER].reverse()
  let body = buildDigestBody(byCategory, total, omitted)

  while (body.length > TG_MESSAGE_SOFT_LIMIT) {
    let dropped = false
    for (const cat of dropOrder) {
      const bucket = byCategory.get(cat)
      if (bucket && bucket.length > 0) {
        bucket.pop() // drop the last (already sorted: lowest importance/oldest last)
        if (bucket.length === 0) byCategory.delete(cat)
        omitted++
        dropped = true
        break
      }
    }
    if (!dropped) break // nothing left to trim
    body = buildDigestBody(byCategory, total, omitted)
  }

  await sendToThread(body, THREAD_CN)

  // Mark ALL events (including omitted) as included_in_daily to prevent
  // re-surfacing in subsequent daily runs.
  const ids = allEvents.map(e => e.id)
  await supabaseAdmin
    .from('events')
    .update({ included_in_daily: true })
    .in('id', ids)

  console.log(`[telegram] Daily summary pushed: ${total - omitted}/${total} events (${body.length} chars)`)
  return total
}

// ─── Weekly Trend Summary (Monday) ─────────────────────────────────────────

export async function pushWeeklySummary(summary: WeeklySummary): Promise<void> {
  let cnMsg = `📊 <b>$U Daily News 周报</b> · ${summary.week_number}\n`

  if (summary.trends.length > 0) {
    cnMsg += `\n━━ 趋势研判 ━━\n`
    for (const trend of summary.trends) {
      const directionEmoji = trend.direction === 'heating' ? '🔥'
        : trend.direction === 'cooling' ? '❄️'
        : trend.direction === 'emerging' ? '🌱'
        : '➡️'

      cnMsg += `\n📌 <b>${esc(trend.title_zh)}</b> ${directionEmoji}\n`
      cnMsg += `${esc(trend.description_zh)}\n`
    }
  }

  // Stats
  const stats = summary.stats
  if (stats.event_count) {
    const categories = Object.entries(stats.category_breakdown ?? {})
      .filter(([, count]) => count > 0)
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(' | ')
    cnMsg += `\n── 本周 ${stats.event_count} 条事件 | ${categories}`
  }

  await sendToThread(cnMsg, THREAD_CN)

  // Mark as pushed
  await supabaseAdmin
    .from('weekly_summaries')
    .update({ pushed_to_tg: true })
    .eq('id', summary.id)

  console.log(`[telegram] Weekly summary pushed: ${summary.week_number}`)
}

// ─── Pipeline Alert (errors) ───────────────────────────────────────────────

export async function sendPipelineAlert(message: string): Promise<void> {
  try {
    await sendToThread(`⚠️ <b>Pipeline Alert</b>\n\n${esc(message)}`)
  } catch (err) {
    console.error('[telegram] Failed to send alert:', err)
  }
}
