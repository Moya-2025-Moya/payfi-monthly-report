'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'

interface TimelineEvent {
  date: string
  title: string
  description: string
  significance: 'high' | 'medium' | 'low'
  fact_ids: string[]
}

interface GeneratedTimeline {
  subject: string
  subject_type: 'entity' | 'narrative'
  summary: string
  events: TimelineEvent[]
  total_facts_found: number
  date_range: { from: string; to: string } | null
}

const SIGNIFICANCE_STYLES: Record<string, { dot: string; label: string }> = {
  high: { dot: 'var(--danger)', label: '重要' },
  medium: { dot: 'var(--accent)', label: '一般' },
  low: { dot: 'var(--fg-faint)', label: '次要' },
}

export function TimelineGenerator() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GeneratedTimeline | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/timeline-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`)
      } else {
        setResult(data as GeneratedTimeline)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg-title)' }}>生成时间线</p>
        <p className="text-[11px] mb-4" style={{ color: 'var(--fg-faint)' }}>
          输入公司名（如 Circle、Tether）或叙事主题（如 IPO、MiCA 监管），AI 将从数据库中检索相关事实并整理成时间线。
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="输入公司名或叙事主题..."
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            disabled={loading}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !query.trim()}
            className="shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: loading ? 'var(--surface-alt)' : 'var(--accent)',
              color: loading ? 'var(--fg-muted)' : 'var(--accent-fg, #fff)',
              opacity: !query.trim() ? 0.5 : 1,
            }}
          >
            {loading ? '生成中...' : '生成时间线'}
          </button>
        </div>
        {error && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
      </Card>

      {/* 生成结果 */}
      {result && (
        <div className="mt-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--fg-title)' }}>
                {result.subject}
                <span className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
                  {result.subject_type === 'entity' ? '实体' : '叙事'}
                </span>
              </h3>
              <span className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>
                {result.total_facts_found} 条事实
                {result.date_range && ` · ${result.date_range.from} ~ ${result.date_range.to}`}
              </span>
            </div>

            {/* 概述 */}
            <p className="text-[13px] leading-relaxed mb-6 p-3 rounded-md"
              style={{ background: 'var(--surface-alt)', color: 'var(--fg-body)' }}>
              {result.summary}
            </p>

            {/* 时间线 */}
            {result.events.length > 0 ? (
              <div className="relative pl-6 border-l" style={{ borderColor: 'var(--border)' }}>
                {result.events.map((event, i) => {
                  const sig = SIGNIFICANCE_STYLES[event.significance] ?? SIGNIFICANCE_STYLES.medium
                  return (
                    <div key={i} className="relative mb-5 pb-1">
                      <div className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full border-2"
                        style={{ background: sig.dot, borderColor: 'var(--surface)' }} />
                      <div className="flex items-center gap-3 mb-1">
                        <time className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>
                          {event.date}
                        </time>
                        <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ color: sig.dot, border: `1px solid ${sig.dot}` }}>
                          {sig.label}
                        </span>
                      </div>
                      <p className="text-[13px] font-medium mb-0.5" style={{ color: 'var(--fg-title)' }}>
                        {event.title}
                      </p>
                      <p className="text-[12px]" style={{ color: 'var(--fg-body)' }}>
                        {event.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>未能整理出时间线事件。</p>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
