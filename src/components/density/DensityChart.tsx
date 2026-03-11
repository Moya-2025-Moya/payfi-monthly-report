'use client'
import type { DensityAnomaly } from '@/lib/types'

export function DensityChart({ anomalies }: { anomalies: DensityAnomaly[] }) {
  const sorted = [...anomalies].sort((a, b) => b.multiple - a.multiple)

  return (
    <div className="space-y-2">
      {sorted.map((a, i) => {
        const barWidth = Math.min(100, (a.multiple / Math.max(...anomalies.map(x => x.multiple))) * 100)
        const isSpike = a.trend === 'spike'
        return (
          <div key={i} className="rounded-md border p-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{a.topic}</span>
                <span className="text-xs px-1 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>{a.topic_type}</span>
                {isSpike && <span className="text-xs px-1 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>SPIKE</span>}
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--muted-fg)' }}>{a.multiple.toFixed(1)}x avg</span>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
              <span>Current: {a.current_count}</span>
              <span>Prev: {a.previous_count}</span>
              <span>Avg: {a.avg_count.toFixed(0)}</span>
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
              <div className="h-full rounded-full" style={{ width: `${barWidth}%`, background: isSpike ? 'var(--danger)' : 'var(--accent)' }} />
            </div>
          </div>
        )
      })}
      {anomalies.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--muted-fg)' }}>No density anomalies this week</p>
      )}
    </div>
  )
}
