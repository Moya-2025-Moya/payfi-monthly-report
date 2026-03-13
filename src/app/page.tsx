import { getCurrentWeekNumber, supabaseAdmin } from '@/db/client'
import { getWeeklyPageData, getKnowledgeGrowthStats } from '@/lib/weekly-data'
import Link from 'next/link'

export const metadata = {
  title: 'StablePulse — 稳定币行业情报引擎',
  description: 'Stablecoin industry atomic knowledge engine',
}

export default async function HomePage() {
  const currentWeek = getCurrentWeekNumber()
  const pageData = await getWeeklyPageData(currentWeek)
  const knowledgeGrowth = await getKnowledgeGrowthStats(12)

  // Parse summary for dashboard
  let oneLiner = ''
  let narrativeTopics: string[] = []
  try {
    if (pageData.summaryDetailed) {
      const parsed = JSON.parse(pageData.summaryDetailed)
      oneLiner = parsed.oneLiner || parsed.one_liner || ''
      const narratives = parsed.narratives || []
      narrativeTopics = narratives.slice(0, 3).map((n: { topic: string; weekCount?: number }) =>
        `${n.topic}${n.weekCount && n.weekCount > 1 ? ` 第${n.weekCount}周` : ''}`
      )
    }
  } catch { /* ignore */ }

  const stats = pageData.stats
  const verificationRate = stats && stats.total_facts > 0
    ? Math.round(((stats.total_facts - stats.rejected) / stats.total_facts) * 100)
    : null

  const latestKnowledge = knowledgeGrowth.length > 0 ? knowledgeGrowth[knowledgeGrowth.length - 1] : null
  const prevKnowledge = knowledgeGrowth.length >= 2 ? knowledgeGrowth[knowledgeGrowth.length - 2] : null
  const knowledgeGrowthDelta = latestKnowledge && prevKnowledge ? latestKnowledge.total - prevKnowledge.total : 0

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--fg-title)' }}>StablePulse</h1>
        <p className="text-[12px] font-mono mt-1" style={{ color: 'var(--fg-muted)' }}>{currentWeek}</p>
      </div>

      {/* Market Snapshot */}
      {stats && (
        <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[10px] font-semibold tracking-wider uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>
            本周概览
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]" style={{ color: 'var(--fg-secondary)' }}>
            <span>{stats.total_facts} 条事实</span>
            <span>{narrativeTopics.length} 条叙事</span>
            <span>0 条矛盾</span>
          </div>
        </div>
      )}

      {/* One-liner */}
      {oneLiner && (
        <p className="text-[20px] font-bold leading-snug px-1" style={{ color: 'var(--fg-title)' }}>
          {oneLiner}
        </p>
      )}

      {/* Two-column: Narratives + Engine Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Narrative preview */}
        <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[10px] font-semibold tracking-wider uppercase mb-2" style={{ color: '#2563eb' }}>
            叙事追踪
          </p>
          {narrativeTopics.length > 0 ? (
            <div className="space-y-1.5">
              {narrativeTopics.map((topic, i) => (
                <p key={i} className="text-[13px]" style={{ color: 'var(--fg-secondary)' }}>
                  {topic} →
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>暂无叙事</p>
          )}
        </div>

        {/* Engine status */}
        <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[10px] font-semibold tracking-wider uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>
            引擎状态
          </p>
          <div className="space-y-1 text-[13px]" style={{ color: 'var(--fg-secondary)' }}>
            {latestKnowledge && (
              <p>知识库: {latestKnowledge.total} 条{knowledgeGrowthDelta > 0 ? ` (+${knowledgeGrowthDelta})` : ''}</p>
            )}
            {verificationRate != null && (
              <p>本周验证: {stats!.total_facts - stats!.rejected}/{stats!.total_facts} ({verificationRate}%)</p>
            )}
            <p style={{ color: 'var(--success)' }}>意见拦截: 0 conditions</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-2">
        <Link href={`/weekly/${currentWeek}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-medium transition-colors"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          查看完整周报 →
        </Link>
      </div>
    </div>
  )
}
