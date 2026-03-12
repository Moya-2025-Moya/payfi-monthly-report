'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { RegulatoryTracker } from '@/lib/types'

const STAGES = ['提案', '审议', '通过', '实施'] as const

const STATUS_TO_STAGE: Record<string, number> = {
  proposed: 0,
  hearing: 1,
  committee: 1,
  floor_vote: 2,
  enacted: 3,
  enforcement: 3,
}

const STATUS_ZH: Record<string, string> = {
  proposed: '提案中',
  hearing: '听证中',
  committee: '委员会审议',
  floor_vote: '投票中',
  enacted: '已通过',
  enforcement: '执行中',
}

function StageBar({ status }: { status: string }) {
  const activeIdx = STATUS_TO_STAGE[status] ?? 0
  return (
    <div className="flex items-center gap-0 w-full">
      {STAGES.map((stage, i) => {
        const done = i <= activeIdx
        const isCurrent = i === activeIdx
        return (
          <div key={stage} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full border-2 shrink-0"
                style={{
                  borderColor: done ? 'var(--info)' : 'var(--border)',
                  background: done ? 'var(--info)' : 'transparent',
                  boxShadow: isCurrent ? '0 0 0 3px color-mix(in srgb, var(--info) 20%, transparent)' : 'none',
                }} />
              <span className="text-[11px] font-mono" style={{ color: done ? 'var(--info)' : 'var(--fg-muted)' }}>
                {stage}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className="flex-1 h-[2px] mx-1 rounded" style={{ background: i < activeIdx ? 'var(--info)' : 'var(--border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function TrackerCard({ tracker }: { tracker: RegulatoryTracker }) {
  const dateStr = tracker.current_stage_date
    ? new Date(tracker.current_stage_date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
    : null

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--fg-title)' }}>{tracker.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
              {tracker.region}
            </span>
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'color-mix(in srgb, var(--info) 12%, transparent)', color: 'var(--info)' }}>
              {STATUS_ZH[tracker.status] ?? tracker.status}
            </span>
          </div>
        </div>
        {dateStr && (
          <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--fg-muted)' }}>{dateStr}</span>
        )}
      </div>
      <StageBar status={tracker.status} />
    </div>
  )
}

function TimelineItem({ tracker }: { tracker: RegulatoryTracker }) {
  const dateStr = tracker.current_stage_date
    ? new Date(tracker.current_stage_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    : '--'

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: 'var(--info)' }} />
        <div className="w-[2px] flex-1 mt-1" style={{ background: 'var(--border)' }} />
      </div>
      <div className="pb-6 min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>{dateStr}</span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
            {tracker.region}
          </span>
        </div>
        <p className="text-[13px] font-medium" style={{ color: 'var(--fg-title)' }}>{tracker.name}</p>
        <span className="text-[11px] font-mono mt-0.5 inline-block px-1.5 py-0.5 rounded"
          style={{ background: 'color-mix(in srgb, var(--info) 12%, transparent)', color: 'var(--info)' }}>
          {STATUS_ZH[tracker.status] ?? tracker.status}
        </span>
      </div>
    </div>
  )
}

type ViewMode = 'cards' | 'timeline'

export function RegulatoryView({ trackers }: { trackers: RegulatoryTracker[] }) {
  const [view, setView] = useState<ViewMode>('cards')

  const byRegion = new Map<string, RegulatoryTracker[]>()
  for (const t of trackers) {
    const arr = byRegion.get(t.region) ?? []
    arr.push(t)
    byRegion.set(t.region, arr)
  }

  // Sort by date desc for timeline
  const sorted = [...trackers].sort((a, b) => {
    const da = a.current_stage_date ? new Date(a.current_stage_date).getTime() : 0
    const db = b.current_stage_date ? new Date(b.current_stage_date).getTime() : 0
    return db - da
  })

  if (trackers.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-[15px] mb-1" style={{ color: 'var(--fg-title)' }}>暂无监管追踪项</p>
        <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>监管动态会在数据采集后自动追踪。</p>
      </Card>
    )
  }

  return (
    <div>
      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-lg mb-4 w-fit" style={{ background: 'var(--surface-alt)' }}>
        {(['cards', 'timeline'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors"
            style={{
              background: view === v ? 'var(--surface)' : 'transparent',
              color: view === v ? 'var(--fg-title)' : 'var(--fg-muted)',
              boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}>
            {v === 'cards' ? '卡片视图' : '时间线'}
          </button>
        ))}
      </div>

      {view === 'cards' ? (
        <div className="space-y-4">
          {[...byRegion.entries()].map(([region, items]) => (
            <div key={region}>
              <CardHeader><CardTitle>{region}</CardTitle></CardHeader>
              <div className="space-y-2">
                {items.map(t => <TrackerCard key={t.id} tracker={t} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {sorted.map(t => <TimelineItem key={t.id} tracker={t} />)}
        </div>
      )}
    </div>
  )
}
