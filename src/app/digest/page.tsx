// Public daily digest — renders the same 36h window the Telegram push uses,
// grouped by category, with every source link preserved. No auth.

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

function formatBeijingDate(): string {
  return new Date().toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '.')
}

async function fetchDigestEvents(): Promise<Event[]> {
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000)
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .gte('published_at', since.toISOString())
    .order('importance', { ascending: true })
    .order('published_at', { ascending: false })

  if (error || !data) return []
  return data as Event[]
}

export default async function DigestPage() {
  const events = await fetchDigestEvents()
  const dateLabel = formatBeijingDate()

  const byCategory = new Map<string, Event[]>()
  for (const e of events) {
    const cat = e.category in CATEGORY_EMOJI ? e.category : 'other'
    const bucket = byCategory.get(cat) ?? []
    bucket.push(e)
    byCategory.set(cat, bucket)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <header className="mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-xl font-bold" style={{ color: 'var(--fg-title)' }}>
          📰 $U Daily News
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
          {dateLabel} · 共 {events.length} 条事件
        </p>
      </header>

      {events.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>暂无事件</p>
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
