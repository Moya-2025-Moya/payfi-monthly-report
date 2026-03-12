'use client'
import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { DiffDisplay } from '@/components/diff/DiffDisplay'
import type { DiffResult } from '@/lib/types'

interface Props {
  initialDiff: DiffResult | null
  defaultWeekA: string
  defaultWeekB: string
  availableWeeks: string[]
}

function generateWeekOptions(available: string[], currentWeek: string): string[] {
  if (available.length > 0) return available

  // Fallback: generate last 12 weeks from currentWeek
  const weeks: string[] = []
  const [yearStr, wStr] = currentWeek.split('-W')
  let year = Number(yearStr)
  let num = Number(wStr)
  for (let i = 0; i < 12; i++) {
    weeks.push(`${year}-W${String(num).padStart(2, '0')}`)
    num--
    if (num < 1) { year--; num = 52 }
  }
  return weeks
}

export function DiffClient({ initialDiff, defaultWeekA, defaultWeekB, availableWeeks }: Props) {
  const [weekA, setWeekA] = useState(defaultWeekA)
  const [weekB, setWeekB] = useState(defaultWeekB)
  const [diff, setDiff] = useState<DiffResult | null>(initialDiff)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekOptions = useMemo(
    () => generateWeekOptions(availableWeeks, defaultWeekB),
    [availableWeeks, defaultWeekB]
  )

  async function handleCompare() {
    if (!weekA || !weekB) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/diff?weekA=${encodeURIComponent(weekA)}&weekB=${encodeURIComponent(weekB)}`)
      if (!res.ok) {
        setError('获取对比数据失败')
        setDiff(null)
      } else {
        setDiff(await res.json())
      }
    } catch {
      setError('发生未知错误')
      setDiff(null)
    } finally {
      setLoading(false)
    }
  }

  const selectStyle = {
    borderColor: 'var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--fg)',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>起始周</label>
          <select
            value={weekA}
            onChange={e => setWeekA(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none font-mono"
            style={selectStyle}
          >
            {weekOptions.map(w => (
              <option key={w} value={w}>{w.replace('-', ' ')}</option>
            ))}
          </select>
        </div>
        <span className="text-[12px] font-mono pb-2" style={{ color: 'var(--fg-faint)' }}>vs</span>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>结束周</label>
          <select
            value={weekB}
            onChange={e => setWeekB(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none font-mono"
            style={selectStyle}
          >
            {weekOptions.map(w => (
              <option key={w} value={w}>{w.replace('-', ' ')}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCompare}
          disabled={loading || weekA === weekB}
          className="rounded-md px-5 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          {loading ? '加载中...' : '对比'}
        </button>
      </div>

      {error && (
        <p className="text-sm px-3 py-2 rounded" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>
      )}

      {!loading && diff ? (
        <DiffDisplay diff={diff} />
      ) : !loading && !error && (
        <Card className="text-center py-8">
          <p className="text-lg mb-1">暂无对比数据</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>周对比在每周快照之间计算。请先运行流水线生成快照。</p>
        </Card>
      )}
    </div>
  )
}
