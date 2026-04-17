// ============================================================
// $U Daily News V2 — Telegram Distributor
//
// Three output formats:
//   pushRealtimeEvent()  — importance 1-2 events, pushed immediately
//   pushDailySummary()   — EOD digest of today's events
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

// ─── Real-time Event Card (importance 1-2) ─────────────────────────────────

function formatRealtimeEvent(event: Event): string {
  const emoji = IMPORTANCE_EMOJI[event.importance] ?? '📌'
  const catEmoji = CATEGORY_EMOJI[event.category] ?? ''
  const entities = event.entity_names.length > 0
    ? `\n\n${event.entity_names.join(' · ')}`
    : ''

  return `${emoji} ${catEmoji} <b>${esc(event.title_zh)}</b>

${esc(event.summary_zh)}${entities}${sourceLink(event.source_urls)}`
}

export async function pushRealtimeEvent(eventId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error || !data) {
    console.error('[telegram] Failed to fetch event:', error?.message)
    return
  }

  const event = data as Event

  const cnMessage = formatRealtimeEvent(event)
  await sendToThread(cnMessage, THREAD_CN)

  // Mark as pushed
  await supabaseAdmin
    .from('events')
    .update({ pushed_to_tg: true })
    .eq('id', eventId)

  console.log(`[telegram] Pushed real-time event: ${event.title_zh.slice(0, 40)}`)
}

export async function pushRealtimeEvents(eventIds: string[]): Promise<number> {
  let pushed = 0
  for (const id of eventIds) {
    try {
      await pushRealtimeEvent(id)
      pushed++
    } catch (err) {
      console.error(`[telegram] Failed to push event ${id}:`, err instanceof Error ? err.message : String(err))
    }
  }
  return pushed
}

// ─── Daily Summary (EOD) ───────────────────────────────────────────────────

export async function pushDailySummary(): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .gte('published_at', today.toISOString())
    .lt('published_at', tomorrow.toISOString())
    .eq('included_in_daily', false)
    .order('importance', { ascending: true })
    .order('published_at', { ascending: false })
    .limit(20)

  if (error || !events || events.length === 0) {
    console.log('[telegram] No events for daily summary')
    return 0
  }

  const allEvents = events as Event[]

  // First 10 as top stories (already sorted by importance asc, then recency);
  // anything beyond goes to the briefs section so the footer count matches
  // what the reader actually sees.
  const topEvents = allEvents.slice(0, 10)
  const briefs = allEvents.slice(10)

  // Format CN message
  let cnMsg = `📰 <b>$U Daily News 日报</b> · ${todayLabel()}\n`

  if (topEvents.length > 0) {
    cnMsg += `\n━━ 今日要闻 ━━\n`
    topEvents.forEach((e, i) => {
      const cat = CATEGORY_EMOJI[e.category] ?? ''
      cnMsg += `\n${i + 1}. ${cat} <b>${esc(e.title_zh)}</b>\n${esc(e.summary_zh.slice(0, 100))}${sourceLink(e.source_urls)}\n`
    })
  }

  if (briefs.length > 0) {
    cnMsg += `\n━━ 更多动态 ━━\n`
    briefs.forEach(e => {
      cnMsg += `· ${esc(e.title_zh)}${sourceLink(e.source_urls)}\n`
    })
  }

  cnMsg += `\n── 今日 ${allEvents.length} 条事件`

  await sendToThread(cnMsg, THREAD_CN)

  // Mark as included
  const ids = allEvents.map(e => e.id)
  await supabaseAdmin
    .from('events')
    .update({ included_in_daily: true })
    .in('id', ids)

  console.log(`[telegram] Daily summary pushed: ${allEvents.length} events`)
  return allEvents.length
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
