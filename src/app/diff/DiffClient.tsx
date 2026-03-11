'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { DiffDisplay } from '@/components/diff/DiffDisplay'
import type { DiffResult } from '@/lib/types'

interface Props {
  initialDiff: DiffResult | null
  defaultWeekA: string
  defaultWeekB: string
}

export function DiffClient({ initialDiff, defaultWeekA, defaultWeekB }: Props) {
  const [weekA, setWeekA] = useState(defaultWeekA)
  const [weekB, setWeekB] = useState(defaultWeekB)
  const [diff, setDiff] = useState<DiffResult | null>(initialDiff)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCompare() {
    if (!weekA.trim() || !weekB.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/diff?weekA=${encodeURIComponent(weekA)}&weekB=${encodeURIComponent(weekB)}`)
      if (!res.ok) {
        setError('获取对比数据失败，请确认周次格式正确（如 2026-W09）。')
        setDiff(null)
      } else {
        setDiff(await res.json())
      }
    } catch {
      setError('发生未知错误。')
      setDiff(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>起始周</label>
          <input
            type="text"
            value={weekA}
            onChange={e => setWeekA(e.target.value)}
            placeholder="如 2026-W09"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--fg)' }}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>结束周</label>
          <input
            type="text"
            value={weekB}
            onChange={e => setWeekB(e.target.value)}
            placeholder="如 2026-W10"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--fg)' }}
          />
        </div>
        <button
          onClick={handleCompare}
          disabled={loading}
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
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>周对比在每周快照之间计算。请在流水线运行后查看，或在设置页面手动触发。</p>
        </Card>
      )}
    </div>
  )
}
