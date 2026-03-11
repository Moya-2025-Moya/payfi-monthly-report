import { PageHeader } from '@/components/ui/PageHeader'
import { DiffDisplay } from '@/components/diff/DiffDisplay'
import { getCurrentWeekNumber } from '@/db/client'
import type { DiffResult } from '@/lib/types'

async function fetchDiff(weekA: string, weekB: string): Promise<DiffResult | null> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/diff?weekA=${weekA}&weekB=${weekB}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

function prevWeek(w: string): string {
  const [year, wNum] = w.replace('W', '').split('-').map(Number)
  if (wNum <= 1) return `${year - 1}-W52`
  return `${year}-W${String(wNum - 1).padStart(2, '0')}`
}

export default async function DiffPage() {
  const weekB = getCurrentWeekNumber()
  const weekA = prevWeek(weekB)
  const diff = await fetchDiff(weekA, weekB)

  return (
    <div>
      <PageHeader title="Weekly Diff" description={`Changes from ${weekA} to ${weekB}`} />
      {diff ? <DiffDisplay diff={diff} /> : (
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>No diff data available yet. Run the weekly pipeline first.</p>
      )}
    </div>
  )
}
