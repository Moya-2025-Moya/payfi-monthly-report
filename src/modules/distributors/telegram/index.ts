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
import { pickLiveUrl } from '@/lib/url-check'
import { sortUrlsByPriority } from '@/lib/url-priority'
import type { Event, WeeklySummary } from '@/lib/types'
import type { ProgressReporter } from '@/lib/pipeline-progress'

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

// HTML-attribute-safe escape: adds "/' on top of esc(). Use for href values,
// since an unescaped quote inside an attribute would break Telegram's parser.
function escAttr(str: string): string {
  return esc(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
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

// ─── Daily Summary (10:00 Beijing, single message, category-grouped) ───────

// Max events per category in the digest. Within each bucket we keep the
// highest-importance items first (already sorted by the DB query).
const DIGEST_PER_CATEGORY_LIMIT = 5

// Each rendered event carries a guaranteed-live URL. The headline itself is
// the link (no separate 🔗 icon). An optional italic "annotation" line sits
// below the headline and only renders if summary_zh passed the extractor's
// new-information test. Events between sections get one blank line for
// breathing room.
//
// Legacy events may still have multi-sentence summaries; we clip to the first
// sentence and char-cap so layout stays predictable across old/new rows.
const DETAIL_MAX_SENTENCES = 1
const DETAIL_HARD_CHAR_CAP = 140

function takeLeadingSentences(s: string, n: number): string {
  const trimmed = s.trim()
  if (!trimmed) return ''
  const re = /[^。！？!?]+[。！？!?]/g
  const parts: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(trimmed)) !== null && parts.length < n) {
    parts.push(m[0])
  }
  const joined = parts.join('').trim()
  return joined || trimmed
}

function clipDetail(s: string): string {
  const sliced = takeLeadingSentences(s, DETAIL_MAX_SENTENCES)
  if (sliced.length <= DETAIL_HARD_CHAR_CAP) return sliced
  const head = sliced.slice(0, DETAIL_HARD_CHAR_CAP)
  const lastTerm = Math.max(
    head.lastIndexOf('。'), head.lastIndexOf('！'), head.lastIndexOf('？'),
    head.lastIndexOf('!'), head.lastIndexOf('?'),
  )
  return lastTerm > 40 ? head.slice(0, lastTerm + 1) : head + '…'
}

function formatEventBlock(e: Event, liveUrl: string): string {
  // The headline IS the link. <b> inside <a> is permitted by Telegram HTML.
  const title = `<a href="${escAttr(liveUrl)}"><b>${esc(e.title_zh)}</b></a>`
  const detailText = clipDetail(e.summary_zh ?? '')
  // Skip the detail line when empty, too short to carry detail, or when it
  // starts with the literal headline (legacy pre-prompt events sometimes
  // restate the title — for new events the extractor is told to output "").
  const skipDetail =
    !detailText ||
    detailText.length < 10 ||
    detailText.trim().startsWith(e.title_zh.trim())
  if (skipDetail) return `${title}\n`
  // Middle-dot prefix + italic gives a light "annotation" feel. em-dash is
  // forbidden by user preference.
  return `${title}\n<i>· ${esc(detailText)}</i>\n`
}

// Full-digest web page URL. Rendered as a footer link so readers can get
// the unabridged list.
const DIGEST_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://payfi-monthly-report.vercel.app'

// Render a single digest message from the already-trimmed per-category
// buckets. Section count labels reflect `shown` vs the ORIGINAL bucket size
// captured by the caller (so the reader sees "5/11" even after trim drops
// happened).
function buildDigestBody(
  shownByCategory: Map<string, Event[]>,
  originalCounts: Map<string, number>,
  liveUrlByEvent: Map<string, string>,
  total: number,
): string {
  let body = `📰 <b>$U Daily News 日报</b> · ${todayLabel()}\n`
  for (const cat of CATEGORY_ORDER) {
    const bucket = shownByCategory.get(cat)
    if (!bucket || bucket.length === 0) continue
    const catEmoji = CATEGORY_EMOJI[cat] ?? '📌'
    const catLabel = CATEGORY_LABEL_ZH[cat] ?? cat
    const origCount = originalCounts.get(cat) ?? bucket.length
    const countLabel = origCount > bucket.length
      ? `${bucket.length}/${origCount}`
      : `${bucket.length}`
    body += `\n━━ ${catEmoji} ${catLabel} (${countLabel}) ━━\n`
    for (const e of bucket) {
      const live = liveUrlByEvent.get(e.id)
      if (!live) continue // safety: caller filters dead events, but skip defensively
      body += '\n' + formatEventBlock(e, live)
    }
  }
  body += `\n── 今日共 ${total} 条事件`
  const fullListUrl = `${DIGEST_URL.replace(/\/$/, '')}/digest`
  body += `\n<a href="${escAttr(fullListUrl)}">📋 查看完整新闻列表 →</a>`
  return body
}

// If the digest body overflows Telegram's size cap, progressively drop the
// least-important events from the lowest-priority categories until it fits.
// Order of removal (first dropped first):
//   1. importance 4 (⚪), from categories reverse-CATEGORY_ORDER
//   2. importance 3 (🔵), same
//   3. importance 2 (🟠), same
// Importance 1 (🔴) is never dropped — if a digest is still too long after
// exhausting all importance ≥2 items, that's a genuine edge case worth logging
// rather than silently losing critical items.
function trimDigestToFit(
  shownByCategory: Map<string, Event[]>,
  originalCounts: Map<string, number>,
  liveUrlByEvent: Map<string, string>,
  total: number,
): { body: string; droppedCount: number } {
  let body = buildDigestBody(shownByCategory, originalCounts, liveUrlByEvent, total)
  if (body.length <= TG_MESSAGE_SOFT_LIMIT) return { body, droppedCount: 0 }

  const reverseOrder = [...CATEGORY_ORDER].reverse()
  let dropped = 0

  for (const minImportance of [4, 3, 2] as const) {
    for (const cat of reverseOrder) {
      while (body.length > TG_MESSAGE_SOFT_LIMIT) {
        const bucket = shownByCategory.get(cat)
        if (!bucket || bucket.length === 0) break
        // Find the LAST event in this bucket with importance >= minImportance
        // (bucket is already importance-sorted ascending; least important is at
        // the tail).
        let idx = -1
        for (let i = bucket.length - 1; i >= 0; i--) {
          if (bucket[i].importance >= minImportance) { idx = i; break }
        }
        if (idx < 0) break
        bucket.splice(idx, 1)
        dropped++
        body = buildDigestBody(shownByCategory, originalCounts, liveUrlByEvent, total)
      }
      if (body.length <= TG_MESSAGE_SOFT_LIMIT) return { body, droppedCount: dropped }
    }
    if (body.length <= TG_MESSAGE_SOFT_LIMIT) return { body, droppedCount: dropped }
  }

  return { body, droppedCount: dropped }
}

export async function pushDailySummary(
  opts: { reportProgress?: ProgressReporter } = {},
): Promise<number> {
  const report = opts.reportProgress ?? (async () => {})

  // 36h window gives late-published items a chance; the real dedup key is
  // `included_in_daily=false`.
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000)

  await report({ level: 'progress', message: 'Loading events (36h window, not yet pushed)…' })
  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .gte('published_at', since.toISOString())
    .eq('included_in_daily', false)
    .order('importance', { ascending: true })
    .order('published_at', { ascending: false })

  if (error || !events || events.length === 0) {
    await report({ level: 'info', message: 'No events to push.' })
    return 0
  }

  const allEvents = events as Event[]
  const total = allEvents.length
  await report({ level: 'info', message: `Loaded ${total} candidate events` })

  // Step A: URL liveness check, in parallel. Every event needs at least one
  // HEAD-verified URL to be included — user policy is no broken links in the
  // digest. Events where all source_urls fail are DROPPED (but still marked
  // included_in_daily below so they don't re-queue tomorrow).
  await report({ level: 'progress', message: `Validating source URLs for ${total} events…` })
  const liveUrlByEvent = new Map<string, string>()
  const liveChecks = await Promise.all(
    allEvents.map(async e => ({
      id: e.id,
      // Sort URLs by domain priority before validating. pickLiveUrl walks
      // the sorted list in order and returns the first live one, so the
      // displayed link is the highest-priority reachable source. Twitter
      // only wins if nothing else is alive.
      url: await pickLiveUrl(sortUrlsByPriority(e.source_urls ?? [])),
    })),
  )
  for (const { id, url } of liveChecks) {
    if (url) liveUrlByEvent.set(id, url)
  }
  const aliveEvents = allEvents.filter(e => liveUrlByEvent.has(e.id))
  const droppedDead = allEvents.length - aliveEvents.length
  await report({
    level: droppedDead > 0 ? 'info' : 'success',
    message: `URL check: ${aliveEvents.length} alive / ${droppedDead} dead`,
  })

  if (aliveEvents.length === 0) {
    // Still mark all as included_in_daily to prevent re-queueing.
    await supabaseAdmin
      .from('events')
      .update({ included_in_daily: true })
      .in('id', allEvents.map(e => e.id))
    await report({ level: 'info', message: 'No events with live URLs — nothing to send.' })
    return 0
  }

  // Step B: Bucket the surviving events by category. `originalCounts` reflects
  // the ALIVE pool (post-validation), so the "shown/total" section label
  // doesn't mislead readers about dead-link drops.
  const byCategory = new Map<string, Event[]>()
  const originalCounts = new Map<string, number>()
  for (const e of aliveEvents) {
    const cat = e.category in CATEGORY_EMOJI ? e.category : 'other'
    const bucket = byCategory.get(cat) ?? []
    bucket.push(e)
    byCategory.set(cat, bucket)
  }
  for (const [cat, bucket] of byCategory) {
    originalCounts.set(cat, bucket.length)
  }

  // Step C: Apply the per-category cap (top N by importance); then if the
  // rendered body is still over the soft limit, progressively drop the
  // least-important events from the lowest-priority categories until it fits.
  const shownByCategory = new Map<string, Event[]>()
  for (const [cat, bucket] of byCategory) {
    shownByCategory.set(cat, bucket.slice(0, DIGEST_PER_CATEGORY_LIMIT))
  }

  const { body, droppedCount } = trimDigestToFit(
    shownByCategory,
    originalCounts,
    liveUrlByEvent,
    aliveEvents.length,
  )
  if (droppedCount > 0) {
    console.warn(
      `[telegram] Digest exceeded ${TG_MESSAGE_SOFT_LIMIT} chars; dropped ${droppedCount} low-importance event(s) to fit.`,
    )
  }
  if (body.length > TG_MESSAGE_SOFT_LIMIT) {
    console.error(
      `[telegram] Digest still ${body.length} chars after trimming — sending anyway; may be rejected by Telegram.`,
    )
  }

  await report({ level: 'progress', message: `Sending to Telegram (${body.length} chars)…` })
  await sendToThread(body, THREAD_CN)

  // Mark ALL events (alive, dead-link, cap-omitted, trim-dropped) as
  // included_in_daily. Today's digest IS the daily summary — events we
  // chose not to surface today shouldn't re-queue for tomorrow and crowd
  // out fresh news. Weekly roll-up uses its own flag.
  await supabaseAdmin
    .from('events')
    .update({ included_in_daily: true })
    .in('id', allEvents.map(e => e.id))

  await report({
    level: 'success',
    message: `Pushed ${aliveEvents.length}/${total} events, ${body.length} chars` +
      (droppedDead > 0 ? `, ${droppedDead} dead-link dropped` : '') +
      (droppedCount > 0 ? `, ${droppedCount} trimmed to fit` : ''),
    stats: { events_pushed: aliveEvents.length },
  })
  return aliveEvents.length
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
