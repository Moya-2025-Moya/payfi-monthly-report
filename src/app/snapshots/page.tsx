import Link from 'next/link'
import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import type { WeeklySnapshot } from '@/lib/types'

export default async function SnapshotsPage() {
  const { data } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(30)
  const snapshots = (data ?? []) as WeeklySnapshot[]

  return (
    <div>
      <PageHeader title="历史周报" />

      {snapshots.length === 0 ? (
        <div className="text-center py-12 text-[13px]" style={{ color: 'var(--fg-muted)' }}>
          暂无历史周报。周报会在每周一自动生成，也可在设置页手动触发。
        </div>
      ) : (
        <div className="space-y-4">
          {snapshots.map(s => {
            const sd = s.snapshot_data as {
              weekly_summary?: string
              weekly_summary_detailed?: string
              total_facts?: number
            }
            const summary = sd.weekly_summary
              ?.replace(/\*\*/g, '')
              .replace(/^#+\s*/gm, '')
              .replace(/^Weekly Stablecoin News Update:\n?/, '')
            const lines = summary
              ?.split(/\n\n/)
              .filter(l => l.trim())
              .slice(0, 3) ?? []
            const factCount = sd.total_facts ?? 0

            return (
              <Link key={s.id} href={`/?week=${encodeURIComponent(s.week_number)}`}>
                <div className="rounded-lg border p-4 transition-colors hover:border-[var(--border-hover)]"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold font-mono" style={{ color: 'var(--fg-title)' }}>
                      {s.week_number.replace('-W', ' 第')}周
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>
                      <span>{factCount} 条事实</span>
                      <span>{new Date(s.generated_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>

                  {/* Preview of weekly update content */}
                  {lines.length > 0 ? (
                    <div className="space-y-1">
                      {lines.map((line, i) => (
                        <p key={i} className="text-[12px] leading-relaxed truncate" style={{ color: 'var(--fg-secondary)' }}>
                          {line.replace(/^\d+\.\s*/, `${i + 1}. `)}
                        </p>
                      ))}
                      {(summary?.split(/\n\n/).filter(l => l.trim()).length ?? 0) > 3 && (
                        <p className="text-[11px]" style={{ color: 'var(--fg-faint)' }}>
                          ...还有 {(summary?.split(/\n\n/).filter(l => l.trim()).length ?? 0) - 3} 条
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[12px]" style={{ color: 'var(--fg-faint)' }}>
                      无摘要内容
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
