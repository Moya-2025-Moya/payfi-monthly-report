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
      {/* Week nav */}
      <div className="max-w-[680px] mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-mono tracking-wide" style={{ color: 'var(--fg-muted)' }}>
              {week}
            </span>
            {range?.display && (
              <>
                <span className="text-[11px]" style={{ color: 'var(--border-hover)' }}>·</span>
                <span className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
                  {range.display}
                </span>
              </>
            )}
            {isCurrentWeek && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                本周
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <a href={`/weekly/${prevWeek}`}
              className="w-7 h-7 flex items-center justify-center rounded-lg border transition-colors hover:border-[var(--border-hover)]"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M7.5 2.5L4 6l3.5 3.5" />
              </svg>
            </a>
            {!isCurrentWeek && !isFutureWeek && (
              <a href={`/weekly/${nextWeek}`}
                className="w-7 h-7 flex items-center justify-center rounded-lg border transition-colors hover:border-[var(--border-hover)]"
                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4.5 2.5L8 6l-3.5 3.5" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {!pageData.summaryDetailed ? (
        <div className="max-w-[680px] mx-auto text-center py-20 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2"
            style={{ background: 'var(--surface-alt)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--fg-muted)" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="10" cy="10" r="7" />
              <path d="M10 7v3.5l2.5 1.5" />
            </svg>
          </div>
          <p className="text-[15px] font-medium" style={{ color: 'var(--fg-secondary)' }}>该周暂无数据</p>
          <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>
            {isCurrentWeek
              ? 'Pipeline 尚未完成本周快照生成'
              : '该周报快照不存在或已过期'}
          </p>
          {isCurrentWeek && (
            <a href="/admin" className="inline-block text-[13px] px-4 py-2 rounded-lg border transition-colors hover:border-[var(--border-hover)]"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
              查看 Pipeline →
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
