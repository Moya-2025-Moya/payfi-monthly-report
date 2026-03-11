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
      <PageHeader title="Weekly Snapshots" description="Archived weekly knowledge reports" />
      {snapshots.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-lg mb-1">No snapshots yet</p>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>Weekly snapshots archive the state of knowledge each week. Generate one in Settings or wait for the next pipeline run.</p>
        </Card>
      ) : (
      <div className="space-y-2">
        {snapshots.map(s => (
          <Link key={s.id} href={`/snapshots/${s.id}`}>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{s.week_number}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{new Date(s.generated_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-4 text-xs" style={{ color: 'var(--muted-fg)' }}>
                  <span>{s.snapshot_data.total_facts} facts</span>
                  <span>{s.snapshot_data.new_facts} new</span>
                  <span>{s.snapshot_data.high_confidence} high</span>
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
