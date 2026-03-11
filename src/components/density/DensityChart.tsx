'use client'
import type { DensityAnomaly } from '@/lib/types'

export function DensityChart({ anomalies }: { anomalies: DensityAnomaly[] }) {
  const sorted = [...anomalies].sort((a, b) => b.multiple - a.multiple)
  const max = Math.max(...anomalies.map(x => x.multiple), 1)

  return (
    <div className="space-y-2">
      {sorted.map((a, i) => {
        const barWidth = Math.min(100, (a.multiple / max) * 100)
        const isSpike = a.trend === 'spike'
        return (
          <div key={i} className="rounded border p-4" style={{ borderColor: '#1a1a1a', background: '#0a0a0a' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium" style={{ color: '#ccc' }}>{a.topic}</span>
                <span className="text-[10px] font-mono" style={{ color: '#333' }}>{a.topic_type}</span>
                {isSpike && <span className="text-[10px] font-mono" style={{ color: '#ff4444' }}>spike</span>}
              </div>
              <span className="text-[11px] font-mono" style={{ color: '#555' }}>{a.multiple.toFixed(1)}x</span>
            </div>
            <div className="flex gap-4 text-[10px] font-mono mb-3" style={{ color: '#333' }}>
              <span>now {a.current_count}</span>
              <span>prev {a.previous_count}</span>
              <span>avg {a.avg_count.toFixed(0)}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#111' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, background: isSpike ? '#ff4444' : '#333' }} />
            </div>
          </div>
        )
      })}
      {anomalies.length === 0 && (
        <p className="text-[13px] font-mono text-center py-16" style={{ color: '#333' }}>No anomalies</p>
      )}
    </div>
  )
}
