// Public daily digest — renders the events for a given calendar day
// (Asia/Shanghai). Supports date navigation via ?date=YYYY-MM-DD query param.
// No auth.

import Link from 'next/link'
import { supabaseAdmin } from '@/db/client'
import type { Event, EventCategory } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

const CATEGORY_ORDER: EventCategory[] = [
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

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────
// All date strings are "YYYY-MM-DD" in the Asia/Shanghai calendar.

const SH_TZ = 'Asia/Shanghai'

function todayInSH(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: SH_TZ })
}

// Parse a YYYY-MM-DD query param. Invalid/missing → today.
function resolveDate(raw: string | undefined): string {
  if (!raw) return todayInSH()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return todayInSH()
  const d = new Date(`${raw}T00:00:00+08:00`)
  if (isNaN(d.getTime())) return todayInSH()
  return raw
}

// Return the UTC ISO timestamps for [start, end) of a SH calendar day.
function dayWindowUTC(shDate: string): { startISO: string; endISO: string } {
  const start = new Date(`${shDate}T00:00:00+08:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

function shiftDay(shDate: string, deltaDays: number): string {
  const d = new Date(`${shDate}T00:00:00+08:00`)
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toLocaleDateString('en-CA', { timeZone: SH_TZ })
}

function formatDateLabel(shDate: string): string {
  // "2026.04.24 (周四)" — Chinese weekday abbrev
  const d = new Date(`${shDate}T00:00:00+08:00`)
  const weekday = d.toLocaleDateString('zh-CN', { timeZone: SH_TZ, weekday: 'short' })
  return `${shDate.replace(/-/g, '.')} · ${weekday}`
}

// ─── Data ─────────────────────────────────────────────────────────────────

async function fetchEventsForDay(shDate: string): Promise<Event[]> {
  const { startISO, endISO } = dayWindowUTC(shDate)
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .gte('published_at', startISO)
    .lt('published_at', endISO)
    .order('importance', { ascending: true })
    .order('published_at', { ascending: false })

  if (error || !data) return []
  return data as Event[]
}

// Roll up historical counts for the last 30 days so the archive strip can
// link to every non-empty day.
async function fetchArchiveStrip(): Promise<{ date: string; count: number }[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabaseAdmin
    .from('events')
    .select('published_at')
    .gte('published_at', since)
    .limit(10000)

  const buckets = new Map<string, number>()
  for (const row of data ?? []) {
    const pub = (row as { published_at: string }).published_at
    const day = new Date(pub).toLocaleDateString('en-CA', { timeZone: SH_TZ })
    buckets.set(day, (buckets.get(day) ?? 0) + 1)
  }
  return [...buckets.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function DigestPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const today = todayInSH()
  const activeDate = resolveDate(params.date)
  const [events, archive] = await Promise.all([
    fetchEventsForDay(activeDate),
    fetchArchiveStrip(),
  ])

  const byCategory = new Map<string, Event[]>()
  for (const e of events) {
    const cat = e.category in CATEGORY_EMOJI ? e.category : 'other'
    const bucket = byCategory.get(cat) ?? []
    bucket.push(e)
    byCategory.set(cat, bucket)
  }

  const prevDate = shiftDay(activeDate, -1)
  const nextDate = shiftDay(activeDate, 1)
  const isToday = activeDate === today
  const canGoForward = activeDate < today

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <header className="mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold" style={{ color: 'var(--fg-title)' }}>
            📰 $U Daily News
          </h1>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {formatDateLabel(activeDate)} · 共 {events.length} 条事件
          </p>
        </div>

        {/* Date nav */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <Link
            href={`/digest?date=${prevDate}`}
            className="px-2 py-1 rounded border"
            style={{ borderColor: 'var(--border)', color: 'var(--fg-body)' }}>
            ← {prevDate}
          </Link>
          {canGoForward ? (
            <Link
              href={`/digest?date=${nextDate}`}
              className="px-2 py-1 rounded border"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-body)' }}>
              {nextDate} →
            </Link>
          ) : (
            <span className="px-2 py-1 rounded border"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', opacity: 0.5 }}>
              {nextDate} →
            </span>
          )}
          {!isToday && (
            <Link
              href="/digest"
              className="px-2 py-1 rounded underline"
              style={{ color: 'var(--accent, #2563eb)' }}>
              回到今日
            </Link>
          )}
          {/* Native date picker — submits via form GET so server can re-render */}
          <form action="/digest" method="get" className="ml-auto flex items-center gap-1">
            <input
              type="date"
              name="date"
              defaultValue={activeDate}
              max={today}
              className="px-1 py-0.5 rounded border text-xs"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg-body)' }}
            />
            <button type="submit" className="px-2 py-0.5 rounded border text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-body)' }}>
              跳转
            </button>
          </form>
        </div>

        {/* Archive strip: last 30 days with event counts */}
        {archive.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs" style={{ color: 'var(--fg-muted)' }}>
            <span className="shrink-0">归档:</span>
            {archive.map(a => {
              const isActive = a.date === activeDate
              const mmdd = a.date.slice(5)
              return (
                <Link
                  key={a.date}
                  href={`/digest?date=${a.date}`}
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    background: isActive ? 'var(--accent, #2563eb)' : 'var(--surface)',
                    color: isActive ? 'var(--accent-fg, white)' : 'var(--fg-secondary)',
                    border: `1px solid ${isActive ? 'var(--accent, #2563eb)' : 'var(--border)'}`,
                  }}>
                  {mmdd}·{a.count}
                </Link>
              )
            })}
          </div>
        )}
      </header>

      {events.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          {activeDate} 暂无事件。可能是采集/处理那天没有跑，或该日新闻为空。
        </p>
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.map(cat => {
            const bucket = byCategory.get(cat)
            if (!bucket || bucket.length === 0) return null
            const catEmoji = CATEGORY_EMOJI[cat]
            const catLabel = CATEGORY_LABEL_ZH[cat]
            return (
              <section key={cat}>
                <h2 className="text-sm font-semibold mb-3 pb-1 border-b"
                  style={{ color: 'var(--fg-title)', borderColor: 'var(--border)' }}>
                  {catEmoji} {catLabel} <span style={{ color: 'var(--fg-muted)' }}>({bucket.length})</span>
                </h2>
                <ul className="space-y-4">
                  {bucket.map(e => (
                    <li key={e.id} className="text-sm">
                      <div className="font-medium flex items-start gap-2"
                        style={{ color: 'var(--fg-body)' }}>
                        <span className="shrink-0">{IMPORTANCE_EMOJI[e.importance] ?? '·'}</span>
                        <span>{e.title_zh}</span>
                      </div>
                      {e.summary_zh && (
                        <p className="mt-1 ml-6 text-xs leading-relaxed"
                          style={{ color: 'var(--fg-secondary)' }}>
                          {e.summary_zh}
                        </p>
                      )}
                      {e.source_urls.length > 0 && (
                        <div className="mt-1.5 ml-6 flex flex-wrap gap-x-3 gap-y-1">
                          {e.source_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="text-xs underline"
                              style={{ color: 'var(--accent, #2563eb)' }}>
                              {hostOf(url)}
                            </a>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
