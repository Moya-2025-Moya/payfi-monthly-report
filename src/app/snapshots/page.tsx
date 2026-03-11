import Link from 'next/link'
import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import type { WeeklySnapshot } from '@/lib/types'

export default async function SnapshotsPage() {
  const { data } = await supabaseAdmin.from('weekly_snapshots').select('*').order('generated_at', { ascending: false }).limit(20)
  const snapshots = (data ?? []) as WeeklySnapshot[]
  return (
    <div>
      <PageHeader title="周报快照" description="历史周报知识存档" />
      {snapshots.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-lg mb-1">暂无快照</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>周报快照会记录每周的知识状态。可在设置页面手动生成，或等待流水线自动运行。</p>
        </Card>
      ) : (
      <div className="space-y-2">
        {snapshots.map(s => (
          <Link key={s.id} href={`/snapshots/${s.id}`}>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{s.week_number}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{new Date(s.generated_at).toLocaleDateString('zh-CN')}</p>
                </div>
                <div className="flex gap-4 text-xs" style={{ color: 'var(--fg-muted)' }}>
                  <span>{s.snapshot_data.total_facts} 条事实</span>
                  <span>{s.snapshot_data.new_facts} 条新增</span>
                  <span>{s.snapshot_data.high_confidence} 高可信</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      )}
    </div>
  )
}
