'use client'

import { useState } from 'react'
import { useDepth } from '@/components/depth/DepthProvider'

interface NarrativeData {
  topic: string
  last_week: string
  this_week: string
  origin?: string
  timeline?: string
  context?: string[]
  weekCount?: number
  next_week?: string
  facts?: { content: string; date: string; tags?: string[]; source_url?: string }[]
}

interface NarrativeRiverProps {
  narratives: NarrativeData[]
}

const COLOR = {
  narrative: '#2563eb',
  context: '#059669',
  narrativeBg: 'rgba(37,99,235,0.06)',
} as const

function Arrow({ dashed }: { dashed?: boolean }) {
  return (
    <div className="flex items-center shrink-0" style={{ color: dashed ? 'var(--fg-muted)' : 'var(--border-hover)' }}>
      <svg width="24" height="12" viewBox="0 0 24 12">
        <path d="M0 6h20m0 0l-4-4m4 4l-4 4" fill="none" stroke="currentColor"
          strokeWidth={dashed ? '1' : '1.5'}
          {...(dashed ? { strokeDasharray: '3 3' } : {})} />
      </svg>
    </div>
  )
}

function FlowCard({ label, text, variant, style: customStyle }: {
  label: string
  text: string
  variant: 'origin' | 'last' | 'current' | 'next'
  style?: React.CSSProperties
}) {
  const styles: Record<string, React.CSSProperties> = {
    origin: { borderColor: 'var(--border)', background: 'var(--surface-alt)' },
    last: { borderColor: 'var(--border)', background: 'var(--surface-alt)' },
    current: { borderColor: COLOR.narrative, background: COLOR.narrativeBg, borderWidth: '2px' },
    next: { borderColor: 'var(--border)', borderStyle: 'dashed' },
  }
  const labelColor = variant === 'current' ? COLOR.narrative : 'var(--fg-muted)'
  const textColor = variant === 'current' ? 'var(--fg-title)' : variant === 'next' ? 'var(--fg-muted)' : 'var(--fg-secondary)'

  return (
    <div className="shrink-0 px-3 py-2 rounded-md border text-[12px]"
      style={{ ...styles[variant], minWidth: '120px', ...customStyle }}>
      <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: labelColor }}>{label}</p>
      <p className={variant === 'current' ? 'font-medium' : ''} style={{ color: textColor }}>{text}</p>
    </div>
  )
}

export function NarrativeRiver({ narratives }: NarrativeRiverProps) {
  const { depth } = useDepth()
  const [expanded, setExpanded] = useState<number | null>(null)

  if (narratives.length === 0) return null

  return (
    <div>
      <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: COLOR.narrative }}>
        叙事追踪
      </h2>
      <div className="space-y-3">
        {narratives.slice(0, 3).map((n, idx) => (
          <div key={idx} className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="px-4 py-3">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-[16px] font-semibold" style={{ color: 'var(--fg-title)' }}>
                  {n.topic}
                </h3>
                {n.weekCount && n.weekCount > 1 && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: COLOR.narrative, background: COLOR.narrativeBg }}>
                    第{n.weekCount}周
                  </span>
                )}
              </div>

              {/* Horizontal flow */}
              <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
                {n.origin && (
                  <>
                    <FlowCard label="起点" text={n.origin} variant="origin" />
                    <Arrow />
                  </>
                )}
                {n.last_week && n.last_week !== '首次追踪' && (
                  <>
                    <FlowCard label="上周" text={n.last_week} variant="last" />
                    <Arrow />
                  </>
                )}
                <FlowCard label="本周" text={n.this_week} variant="current" style={{ minWidth: '140px' }} />
                {n.next_week && (
                  <>
                    <Arrow dashed />
                    <FlowCard label="下周关注" text={n.next_week} variant="next" />
                  </>
                )}
              </div>

              {/* Context (depth >= 1) */}
              {n.context && n.context.length > 0 && (
                <div className="depth-layer-1" data-depth={depth}>
                  <div className="mt-2 mb-2 pl-3 py-2 rounded" style={{ background: 'rgba(5,150,105,0.05)' }}>
                    <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: COLOR.context }}>CONTEXT</p>
                    {n.context.map((c, ci) => (
                      <p key={ci} className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                        · {c}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {n.timeline && (
                <p className="text-[13px] leading-relaxed mt-1 pl-3" style={{ color: 'var(--fg-muted)' }}>
                  时间线: {n.timeline}
                </p>
              )}

              {/* Expandable facts */}
              {n.facts && n.facts.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setExpanded(expanded === idx ? null : idx)}
                    className="text-[11px] font-medium transition-colors"
                    style={{ color: 'var(--accent)' }}>
                    {expanded === idx ? '收起来源' : `查看 ${n.facts.length} 条来源事实 →`}
                  </button>
                  {expanded === idx && (
                    <div className="mt-2 pl-3 border-l space-y-1.5" style={{ borderColor: 'var(--border)' }}>
                      {n.facts.map((f, fi) => (
                        <div key={fi} className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>
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
  )
}
