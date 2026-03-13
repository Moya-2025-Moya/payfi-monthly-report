import { getCurrentWeekNumber, supabaseAdmin } from '@/db/client'
import { redirect } from 'next/navigation'
import { getWeeklyPageData, getKnowledgeGrowthStats } from '@/lib/weekly-data'
import { WeeklyMirror } from './WeeklyMirror'
import type { Metadata } from 'next'

function parseWeekDateRange(week: string): { display: string } | null {
  const m = week.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const wNum = parseInt(m[2], 10)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (wNum - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmt = (d: Date) => `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
  return { display: `${fmt(monday)} - ${fmt(sunday)}` }
}

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }): Promise<Metadata> {
  const { week } = await params
  const range = parseWeekDateRange(week)
  return {
    title: `稳定币周报 ${week}${range ? ` | ${range.display}` : ''}`,
    description: `StablePulse 稳定币行业周报 — ${week}`,
  }
}

function shiftWeek(week: string, delta: number): string {
  // Convert week string to a date, shift by 7*delta days, then back to ISO week
  const m = week.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return week
  const year = parseInt(m[1], 10)
  const wNum = parseInt(m[2], 10)
  // Find Monday of the given ISO week
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (wNum - 1) * 7)
  // Shift by delta weeks
  monday.setUTCDate(monday.getUTCDate() + delta * 7)
  // Convert back to ISO week
  const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export default async function WeeklyReportPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params

  if (!/^\d{4}-W\d{2}$/.test(week)) {
    redirect(`/weekly/${getCurrentWeekNumber()}`)
  }

  const range = parseWeekDateRange(week)
  const [pageData, knowledgeGrowth] = await Promise.all([
    getWeeklyPageData(week),
    getKnowledgeGrowthStats(12),
  ])
  const currentWeek = getCurrentWeekNumber()

  // Fetch all facts with full AtomicFact fields (V1-V5 results for Trust Spine)
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
      {/* Header with nav */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-bold" style={{ color: 'var(--fg-title)' }}>
            稳定币周报
          </h1>
          <div className="flex items-center gap-2 text-[12px]">
            <a href={`/weekly/${prevWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
              ← 上周
            </a>
            {!isCurrentWeek && !isFutureWeek && (
              <a href={`/weekly/${nextWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                下周 →
              </a>
            )}
            {!isCurrentWeek && (
              <a href={`/weekly/${currentWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
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
          <div className="text-[32px] opacity-20">
            <svg width="48" height="48" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto opacity-40">
              <path d="M8 32L20 8L32 32H8Z" fill="var(--fg-muted)" opacity="0.35" />
              <path d="M14 32L26 12L38 32H14Z" fill="var(--fg-muted)" />
            </svg>
          </div>
          <p className="text-[14px] font-medium" style={{ color: 'var(--fg-muted)' }}>该周暂无数据</p>
          <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
            {isCurrentWeek
              ? 'Pipeline 尚未完成本周快照生成。请前往管理后台查看 pipeline 状态。'
              : '该周报快照不存在或已过期。'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {isCurrentWeek && (
              <a href="/admin" className="text-[13px] px-3 py-1.5 rounded border hover:border-[var(--accent-muted)]"
                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                查看 Pipeline 状态
              </a>
            )}
            {!isCurrentWeek && (
              <a href={`/weekly/${currentWeek}`} className="text-[13px] px-3 py-1.5 rounded hover:underline" style={{ color: 'var(--accent)' }}>
                查看本周周报 →
              </a>
            )}
          </div>
        </div>
      ) : (
        <WeeklyMirror
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
