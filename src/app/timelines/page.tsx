import Link from 'next/link'
import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import type { Timeline } from '@/lib/types'

export default async function TimelinesPage() {
  const { data } = await supabaseAdmin.from('timelines').select('*').order('updated_at', { ascending: false })
  const timelines = (data ?? []) as Timeline[]
  return (
    <div>
      <PageHeader title="Timelines" description={`${timelines.length} event timelines`} />
      {timelines.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-lg mb-1">No timelines yet</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Event timelines are built as the pipeline processes data. Check back after the next run, or trigger it manually in Settings.</p>
        </Card>
      ) : (
      <div className="space-y-2">
        {timelines.map(t => (
          <Link key={t.id} href={`/timelines/${t.id}`}
            className="block rounded-lg border p-4 hover:shadow-sm transition-shadow"
            style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded"
                style={{ background: t.status === 'active' ? 'var(--success-soft)' : 'var(--surface-alt)', color: t.status === 'active' ? 'var(--success)' : 'var(--fg-muted)' }}>
                {t.status}
              </span>
            </div>
            {t.description && <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{t.description}</p>}
          </Link>
        ))}
      </div>
      )}
    </div>
  )
}
