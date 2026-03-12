'use client'

import { useState } from 'react'
import type { DensityAnomaly } from '@/lib/types'

const TREND_ZH: Record<string, string> = {
  spike: '急增', sustained_high: '持续高位', declining: '下降', normal: '正常',
}

const TREND_COLOR: Record<string, string> = {
  spike: 'var(--danger)',
  sustained_high: 'var(--warning)',
  declining: 'var(--info)',
  normal: 'var(--fg-muted)',
}

export function DensityChart({ anomalies }: { anomalies: DensityAnomaly[] }) {
  const sorted = [...anomalies].sort((a, b) => b.multiple - a.multiple)
  const max = Math.max(...anomalies.map(x => x.multiple), 1)
  const [hovered, setHovered] = useState<number | null>(null)

  if (anomalies.length === 0) {
    return <p className="text-[13px] text-center py-16" style={{ color: 'var(--fg-muted)' }}>暂无异常</p>
  }

  return (
    <div className="space-y-1.5">
      {sorted.map((a, i) => {
        const barWidth = Math.min(100, (a.multiple / max) * 100)
        const color = TREND_COLOR[a.trend] ?? TREND_COLOR.normal
        const isHovered = hovered === i

        return (
          <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors"
            style={{ background: isHovered ? 'var(--surface-alt)' : 'transparent' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}>

            {/* Topic name — fixed width left column */}
            <div className="w-[140px] shrink-0 flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-medium truncate" style={{ color: 'var(--fg-body)' }}>{a.topic}</span>
              {a.trend !== 'normal' && (
                <span className="text-[11px] font-mono shrink-0 px-1 py-0.5 rounded"
                  style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                  {TREND_ZH[a.trend]}
                </span>
              )}
            </div>

            {/* Bar */}
            <div className="flex-1 h-5 rounded overflow-hidden relative" style={{ background: 'var(--surface-alt)' }}>
              <div className="h-full rounded transition-all duration-300 flex items-center justify-end pr-2"
                style={{ width: `${barWidth}%`, background: color, minWidth: barWidth > 5 ? undefined : '24px' }}>
                <span className="text-[11px] font-mono font-medium" style={{ color: '#fff' }}>
                  {a.multiple.toFixed(1)}x
                </span>
              </div>
            </div>

            {/* Hover detail */}
            {isHovered && (
              <div className="shrink-0 flex gap-3 text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                <span>当前 {a.current_count}</span>
                <span>上期 {a.previous_count}</span>
                <span>均值 {a.avg_count.toFixed(0)}</span>
              </div>
            )}
            {!isHovered && (
              <span className="shrink-0 w-[48px] text-right text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                {a.current_count} 条
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
