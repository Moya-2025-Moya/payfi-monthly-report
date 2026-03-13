import { getCurrentWeekNumber, supabaseAdmin } from '@/db/client'
import { redirect } from 'next/navigation'
import { getWeeklyPageData } from '@/lib/weekly-data'
import { parseWeekDateRange, shiftWeek } from '@/lib/week-utils'
import { WeeklyReader } from './WeeklyReader'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }): Promise<Metadata> {
  const { week } = await params
  const range = parseWeekDateRange(week)
  return {
    title: `稳定币周报 ${week}${range ? ` | ${range.display}` : ''}`,
    description: `StablePulse 稳定币行业周报 — ${week}`,
  }
}

export default async function WeeklyReportPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params

  if (!/^\d{4}-W\d{2}$/.test(week)) {
    redirect(`/weekly/${getCurrentWeekNumber()}`)
  }

  const range = parseWeekDateRange(week)
  const pageData = await getWeeklyPageData(week)
  const currentWeek = getCurrentWeekNumber()

  // Full query including V1-V5 results for TrustSpine + EvidenceDrawer
  const { data: allFactsRaw } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_zh, content_en, fact_type, tags, source_url, metric_name, metric_value, metric_unit, metric_change, verification_status, confidence, fact_date, week_number, v1_result, v2_result, v3_result, v4_result, v5_result')
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
      {/* Week nav (inside 680px container) */}
      <div className="max-w-[680px] mx-auto mb-6">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-mono" style={{ color: 'var(--fg-muted)' }}>
            {week} · {range?.display ?? week}
          </p>
          <div className="flex items-center gap-2 text-[12px]">
            <a href={`/weekly/${prevWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--info-muted)]"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
              ←
            </a>
            {!isCurrentWeek && !isFutureWeek && (
              <a href={`/weekly/${nextWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--info-muted)]"
                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                →
              </a>
            )}
            {!isCurrentWeek && (
              <a href={`/weekly/${currentWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--info-muted)]"
                style={{ borderColor: 'var(--border)', color: 'var(--info)' }}>
                本周
              </a>
            )}
          </div>
        </div>
      </div>

      {!pageData.summaryDetailed ? (
        <div className="max-w-[680px] mx-auto text-center py-16 space-y-3">
          <p className="text-[14px] font-medium" style={{ color: 'var(--fg-muted)' }}>该周暂无数据</p>
          <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
            {isCurrentWeek
              ? 'Pipeline 尚未完成本周快照生成。'
              : '该周报快照不存在或已过期。'}
          </p>
          {isCurrentWeek && (
            <a href="/admin" className="inline-block text-[13px] px-3 py-1.5 rounded border hover:border-[var(--info-muted)]"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
              查看 Pipeline 状态
            </a>
          )}
        </div>
      ) : (
        <WeeklyReader
          week={week}
          summaryDetailed={pageData.summaryDetailed}
          stats={pageData.stats}
          allFacts={allFacts}
        />
      )}
    </div>
  )
}
