'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { DiffResult } from '@/lib/types'

/* Delta arrow indicator */
function Delta({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (value === 0) return null
  const isUp = value > 0
  const color = isUp ? 'var(--success)' : 'var(--danger)'
  return (
    <span className="inline-flex items-center gap-0.5 text-[13px] font-mono font-medium" style={{ color }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
        {isUp
          ? <path d="M6 9V3m0 0L3 6m3-3l3 3" />
          : <path d="M6 3v6m0 0l3-3m-3 3L3 6" />}
      </svg>
      {isUp ? '+' : ''}{value}{suffix}
    </span>
  )
}

function ChangeRow({ type, text }: { type: '+' | '-' | '~'; text: string }) {
  const colors = { '+': 'var(--success)', '-': 'var(--danger)', '~': 'var(--info)' }
  return (
    <div className="flex items-start gap-3 py-1.5 text-[13px] font-mono">
      <span style={{ color: colors[type] }}>{type}</span>
      <span style={{ color: 'var(--fg-secondary)' }}>{text}</span>
    </div>
  )
}

function AISummary({ changes }: { changes: string[] }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (changes.length === 0) return
    setLoading(true)
    fetch('/api/diff/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
    })
      .then(r => r.json())
      .then(d => setSummary(d.summary || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [changes])

  if (!summary && !loading) return null

  return (
    <div className="mb-4 px-4 py-3 rounded-lg border" style={{ borderColor: 'var(--info-muted)', background: 'var(--info-soft)' }}>
      <span className="text-[11px] font-medium" style={{ color: 'var(--info)' }}>本周最大变化: </span>
      <span className="text-[13px]" style={{ color: 'var(--fg-body)' }}>
        {loading ? '生成摘要...' : summary}
      </span>
    </div>
  )
}

export function DiffDisplay({ diff }: { diff: DiffResult }) {
  // Collect all changes as text for AI summary
  const allChanges: string[] = []
  for (const e of diff.new_entities) allChanges.push(`新增实体: ${e.name}`)
  for (const c of diff.status_changes) allChanges.push(`${c.entity_name} 状态: ${c.from} → ${c.to}`)
  for (const m of diff.metric_changes) allChanges.push(`${m.entity_name} ${m.metric}: ${m.change_pct > 0 ? '+' : ''}${m.change_pct.toFixed(1)}%`)
  for (const t of diff.timeline_updates) allChanges.push(`${t.timeline_name}: 新增 ${t.new_nodes} 个节点`)

  // Sort metric changes by absolute impact
  const sortedMetrics = [...diff.metric_changes].sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))

  const factDelta = diff.fact_count.week_b - diff.fact_count.week_a
  const entityDelta = diff.entity_count.week_b - diff.entity_count.week_a

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>
        <span>{diff.week_a}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--fg-faint)" strokeWidth="1.5"><path d="M2 6h8m0 0L7 3m3 3L7 9" /></svg>
        <span>{diff.week_b}</span>
      </div>

      {/* AI summary */}
      <AISummary changes={allChanges} />

      {/* Stat cards with delta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <p className="text-[24px] font-semibold" style={{ color: 'var(--fg-title)' }}>{diff.fact_count.week_b}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>事实总数</p>
            <Delta value={factDelta} />
          </div>
        </Card>
        <Card>
          <p className="text-[24px] font-semibold" style={{ color: 'var(--fg-title)' }}>{diff.entity_count.week_b}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>实体数</p>
            <Delta value={entityDelta} />
          </div>
        </Card>
        <Card>
          <p className="text-[24px] font-semibold" style={{ color: 'var(--fg-title)' }}>{diff.new_entities.length}</p>
          <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--fg-faint)' }}>新增实体</p>
        </Card>
        <Card>
          <p className="text-[24px] font-semibold" style={{ color: 'var(--fg-title)' }}>{diff.new_contradictions}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>新增矛盾</p>
            {diff.resolved_contradictions > 0 && (
              <span className="text-[11px] font-mono" style={{ color: 'var(--success)' }}>已解决 {diff.resolved_contradictions}</span>
            )}
          </div>
        </Card>
      </div>

      {diff.new_entities.length > 0 && (
        <Card>
          <CardHeader><CardTitle>新增实体</CardTitle></CardHeader>
          {diff.new_entities.map(e => <ChangeRow key={e.id} type="+" text={e.name} />)}
        </Card>
      )}
      {diff.status_changes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>状态变更</CardTitle></CardHeader>
          {diff.status_changes.map((c, i) => <ChangeRow key={i} type="~" text={`${c.entity_name}: ${c.from} → ${c.to}`} />)}
        </Card>
      )}
      {sortedMetrics.length > 0 && (
        <Card>
          <CardHeader><CardTitle>指标变化</CardTitle></CardHeader>
          {sortedMetrics.map((m, i) => (
            <ChangeRow key={i} type={m.change_pct >= 0 ? '+' : '-'}
              text={`${m.entity_name} ${m.metric}: ${m.old_value.toLocaleString()} → ${m.new_value.toLocaleString()} (${m.change_pct > 0 ? '+' : ''}${m.change_pct.toFixed(1)}%)`} />
          ))}
        </Card>
      )}
      {diff.timeline_updates.length > 0 && (
        <Card>
          <CardHeader><CardTitle>时间线更新</CardTitle></CardHeader>
          {diff.timeline_updates.map((t, i) => <ChangeRow key={i} type="+" text={`${t.timeline_name}: 新增 ${t.new_nodes} 个节点`} />)}
        </Card>
      )}
      {(diff.blind_spot_changes.newly_covered.length > 0 || diff.blind_spot_changes.new_gaps.length > 0) && (
        <Card>
          <CardHeader><CardTitle>盲区变化</CardTitle></CardHeader>
          {diff.blind_spot_changes.newly_covered.map((s, i) => <ChangeRow key={`c${i}`} type="+" text={s} />)}
          {diff.blind_spot_changes.new_gaps.map((s, i) => <ChangeRow key={`g${i}`} type="-" text={s} />)}
        </Card>
      )}
    </div>
  )
}
