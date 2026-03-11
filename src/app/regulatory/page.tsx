import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { RegulatoryTracker } from '@/lib/types'

export default async function RegulatoryPage() {
  const { data } = await supabaseAdmin.from('regulatory_trackers').select('*').order('current_stage_date', { ascending: false })
  const trackers = (data ?? []) as RegulatoryTracker[]
  const byRegion = new Map<string, RegulatoryTracker[]>()
  for (const t of trackers) {
    const arr = byRegion.get(t.region) ?? []
    arr.push(t)
    byRegion.set(t.region, arr)
  }

  return (
    <div>
      <PageHeader title="Regulatory Tracker" description="Legislation, enforcement, and guidance tracking by region" />
      {byRegion.size === 0 ? (
        <Card className="text-center py-8">
          <p className="text-lg mb-1">No regulatory items tracked yet</p>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>Regulatory developments are tracked as they are collected. Check back after the next pipeline run.</p>
        </Card>
      ) : (
      <div className="space-y-4">
        {[...byRegion.entries()].map(([region, items]) => (
          <Card key={region}>
            <CardHeader><CardTitle>{region}</CardTitle></CardHeader>
            <div className="space-y-2">
              {items.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-sm">{t.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>{t.status}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      )}
    </div>
  )
}
