'use client'

import { useState } from 'react'
import type { WeeklyStats } from '@/lib/weekly-data'

/* ── Types matching the V10 email format stored in weekly_summary_detailed ── */

interface NarrativeData {
  topic: string
  last_week: string
  this_week: string
  timeline?: string
  comparable?: string
  weekCount?: number
  facts?: { content: string; date: string; tags?: string[]; source_url?: string }[]
}

interface SignalData {
  category: 'milestone' | 'product' | 'data'
  text: string
  source_url?: string
}

interface Props {
  summaryDetailed: string
  stats: WeeklyStats | null
}

const CATEGORY_LABELS: Record<string, string> = {
  milestone: '里程碑',
  product: '产品/合作',
  data: '数据',
}

export function WeeklyMirror({ summaryDetailed, stats }: Props) {
  const [expandedNarrative, setExpandedNarrative] = useState<number | null>(null)

  // Parse the V10 format
  let oneLiner = ''
  let headlines: string[] = []
  let narratives: NarrativeData[] = []
  let signals: SignalData[] = []

  try {
    const parsed = JSON.parse(summaryDetailed)
    oneLiner = parsed.oneLiner || parsed.one_liner || ''
    headlines = parsed.headlines || []
    narratives = parsed.narratives || []
    signals = parsed.signals || []

    // Fallback: V9 format with news + narratives
    if (!oneLiner && parsed.news && Array.isArray(parsed.news)) {
      // Build from legacy format
      const news = parsed.news as { simple_zh?: string; what_happened_zh?: string; tags?: string[]; source_url?: string | null }[]
      oneLiner = news.slice(0, 2).map(n => n.simple_zh || '').filter(Boolean).join('; ')
      headlines = news.slice(0, 3).map(n => n.simple_zh || '').filter(Boolean)
      signals = news.slice(0, 5).map(n => ({
        category: 'data' as const,
        text: n.what_happened_zh || n.simple_zh || '',
        source_url: n.source_url || undefined,
      }))
    }
  } catch { /* ignore */ }

  const totalFacts = stats?.total_facts ?? 0
  const verifiedCount = (stats?.high_confidence ?? 0) + (stats?.medium_confidence ?? 0)
  const crossVerified = 0

  // Group signals by category
  const grouped: Record<string, SignalData[]> = {}
  for (const s of signals) {
    const cat = s.category || 'data'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  }
  const categoryOrder: Array<'milestone' | 'product' | 'data'> = ['milestone', 'product', 'data']

  return (
    <div className="space-y-6">
      {/* One-liner */}
      {oneLiner && (
        <div className="px-4 py-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[14px] font-semibold leading-relaxed" style={{ color: 'var(--fg-title)' }}>
            {oneLiner}
          </p>
          {headlines.length > 0 && (
            <div className="mt-2 space-y-1">
              {headlines.map((h, i) => (
                <p key={i} className="text-[13px]" style={{ color: 'var(--fg-secondary)' }}>
                  · {h}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Narratives */}
      {narratives.length > 0 && (
        <div>
          <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: '#3b82f6' }}>
            叙事追踪
          </h2>
          <div className="space-y-3">
            {narratives.slice(0, 3).map((n, idx) => (
              <div key={idx} className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-[14px] font-semibold" style={{ color: 'var(--fg-title)' }}>
                      {n.topic}
                    </h3>
                    {n.weekCount && n.weekCount > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.1)' }}>
                        第{n.weekCount}周
                      </span>
                    )}
                  </div>

                  {/* Last week */}
                  {n.last_week && n.last_week !== '首次追踪' && (
                    <p className="text-[12px] leading-relaxed mb-1 pl-3 border-l-2" style={{ color: 'var(--fg-muted)', borderColor: 'var(--border)' }}>
                      上周: {n.last_week}
                    </p>
                  )}

                  {/* This week */}
                  <p className="text-[13px] leading-relaxed mb-2 pl-3 border-l-2" style={{ color: 'var(--fg-secondary)', borderColor: '#10b981' }}>
                    本周: {n.this_week}
                  </p>

                  {/* Timeline */}
                  {n.timeline && (
                    <p className="text-[12px] leading-relaxed mb-1 pl-3" style={{ color: 'var(--fg-muted)' }}>
                      时间线: {n.timeline}
                    </p>
                  )}

                  {/* Comparable */}
                  {n.comparable && (
                    <p className="text-[12px] leading-relaxed pl-3" style={{ color: 'var(--fg-muted)' }}>
                      参考: {n.comparable}
                    </p>
                  )}

                  {/* Expandable source facts */}
                  {n.facts && n.facts.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setExpandedNarrative(expandedNarrative === idx ? null : idx)}
                        className="text-[11px] font-medium transition-colors"
                        style={{ color: 'var(--accent)' }}>
                        {expandedNarrative === idx ? '收起来源' : `查看 ${n.facts.length} 条来源事实 →`}
                      </button>
                      {expandedNarrative === idx && (
                        <div className="mt-2 pl-3 border-l space-y-1.5" style={{ borderColor: 'var(--border)' }}>
                          {n.facts.map((f, fi) => (
                            <div key={fi} className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
                              <span className="font-mono mr-2">{f.date}</span>
                              <span>{f.content}</span>
                              {f.source_url && (
                                <a href={f.source_url} target="_blank" rel="noopener noreferrer"
                                  className="ml-1 text-[11px] hover:underline" style={{ color: 'var(--accent)' }}>
                                  [来源]
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signals */}
      {signals.length > 0 && (
        <div>
          <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: '#10b981' }}>
            本周事实
          </h2>
          <div className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="px-4 py-3 space-y-4">
              {categoryOrder.filter(cat => grouped[cat]?.length).map(cat => (
                <div key={cat}>
                  <p className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                    {CATEGORY_LABELS[cat]}:
                  </p>
                  <div className="space-y-1">
                    {grouped[cat]!.map((s, i) => (
                      <p key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                        · {s.text}
                        {s.source_url && (
                          <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                            className="ml-1 text-[11px] hover:underline" style={{ color: 'var(--accent)' }}>
                            [来源]
                          </a>
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Verification footer */}
      {totalFacts > 0 && (
        <div className="text-center py-3">
          <p className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
            {totalFacts}条事实 · {verifiedCount === totalFacts ? '100%' : `${verifiedCount}/${totalFacts}`}来源验证{crossVerified > 0 ? ` · ${crossVerified}条多源交叉` : ''}
          </p>
        </div>
      )}
    </div>
  )
}
