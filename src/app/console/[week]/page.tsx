import { getCurrentWeekNumber, supabaseAdmin } from '@/db/client'
import { redirect } from 'next/navigation'
import { getWeeklyPageData, getKnowledgeGrowthStats } from '@/lib/weekly-data'
import { parseWeekDateRange, shiftWeek } from '@/lib/week-utils'
import { ConsoleView } from './ConsoleView'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }): Promise<Metadata> {
  const { week } = await params
  const range = parseWeekDateRange(week)
  return {
    title: `Console ${week}${range ? ` | ${range.display}` : ''}`,
    description: `StablePulse Console — ${week}`,
  }
}

export default async function ConsoleWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params

  if (!/^\d{4}-W\d{2}$/.test(week)) {
    redirect(`/console/${getCurrentWeekNumber()}`)
  }

  const range = parseWeekDateRange(week)
  const [pageData, knowledgeGrowth] = await Promise.all([
    getWeeklyPageData(week),
    getKnowledgeGrowthStats(12),
  ])
  const currentWeek = getCurrentWeekNumber()

  const { data: allFactsRaw } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_zh, content_en, fact_type, objectivity, speaker, tags, source_url, source_type, source_credibility, metric_name, metric_value, metric_unit, metric_period, metric_change, verification_status, confidence, confidence_reasons, v1_result, v2_result, v3_result, v4_result, v5_result, fact_date, week_number, created_at, updated_at, source_id, source_table, collected_at')
    .eq('week_number', week)
    .in('verification_status', ['verified', 'partially_verified'])
    .order('fact_date', { ascending: false })
    .limit(200)

  const allFacts = (allFactsRaw ?? []) as unknown as import('@/lib/types').AtomicFact[]
  const isCurrentWeek = week === currentWeek
  const isFutureWeek = week > currentWeek
  const prevWeek = shiftWeek(week, -1)
  const nextWeek = shiftWeek(week, 1)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-bold" style={{ color: 'var(--fg-title)' }}>
            Console
          </h1>
          <div className="flex items-center gap-2 text-[12px]">
            <a href={`/console/${prevWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
              ← 上周
            </a>
            {!isCurrentWeek && !isFutureWeek && (
              <a href={`/console/${nextWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                下周 →
              </a>
            )}
            {!isCurrentWeek && (
              <a href={`/console/${currentWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
                style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}>
                本周
              </a>
            )}
          </div>
        </div>
        <p className="text-[13px] font-mono mt-1" style={{ color: 'var(--fg-muted)' }}>
          {week} · {range?.display ?? week}
        </p>
      </div>

      {!pageData.summaryDetailed ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-[14px] font-medium" style={{ color: 'var(--fg-muted)' }}>该周暂无数据</p>
          <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
            {isCurrentWeek
              ? 'Pipeline 尚未完成本周快照生成。'
              : '该周报快照不存在或已过期。'}
          </p>
        </div>
      ) : (
        <ConsoleView
          summaryDetailed={pageData.summaryDetailed}
          stats={pageData.stats}
          allFacts={allFacts}
          knowledgeGrowth={knowledgeGrowth}
          snapshotData={{
            newContradictions: (pageData as unknown as { stats: { new_contradictions?: number } | null }).stats?.new_contradictions ?? undefined,
          }}
        />
      )}
    </div>
  )
}
