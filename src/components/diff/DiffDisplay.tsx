import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { DiffResult } from '@/lib/types'

function ChangeRow({ type, text }: { type: '+' | '-' | '~'; text: string }) {
  const colors = { '+': 'var(--success)', '-': 'var(--danger)', '~': 'var(--accent)' }
  return (
    <div className="flex items-start gap-3 py-1.5 text-[12px] font-mono">
      <span style={{ color: colors[type] }}>{type}</span>
      <span style={{ color: 'var(--fg-secondary)' }}>{text}</span>
    </div>
  )
}

export function DiffDisplay({ diff }: { diff: DiffResult }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>
        <span>{diff.week_a}</span>
        <span style={{ color: 'var(--fg-faint)' }}>/</span>
        <span>{diff.week_b}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          [diff.fact_count.week_b, 'Facts'],
          [diff.new_entities.length, 'New Entities'],
          [diff.new_contradictions, 'Contradictions'],
        ].map(([val, label]) => (
          <Card key={label as string}>
            <p className="text-2xl font-semibold" style={{ color: 'var(--fg-title)' }}>{val as number}</p>
            <p className="text-[10px] font-mono tracking-wider uppercase mt-1" style={{ color: 'var(--fg-faint)' }}>{label as string}</p>
          </Card>
        ))}
      </div>
      {diff.new_entities.length > 0 && (
        <Card>
          <CardHeader><CardTitle>New Entities</CardTitle></CardHeader>
          {diff.new_entities.map(e => <ChangeRow key={e.id} type="+" text={e.name} />)}
        </Card>
      )}
      {diff.status_changes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Status Changes</CardTitle></CardHeader>
          {diff.status_changes.map((c, i) => <ChangeRow key={i} type="~" text={`${c.entity_name}: ${c.from} → ${c.to}`} />)}
        </Card>
      )}
      {diff.metric_changes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Metric Changes</CardTitle></CardHeader>
          {diff.metric_changes.map((m, i) => (
            <ChangeRow key={i} type={m.change_pct >= 0 ? '+' : '-'}
              text={`${m.entity_name} ${m.metric}: ${m.old_value.toLocaleString()} → ${m.new_value.toLocaleString()} (${m.change_pct > 0 ? '+' : ''}${m.change_pct.toFixed(1)}%)`} />
          ))}
        </Card>
      )}
      {diff.timeline_updates.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Timeline Updates</CardTitle></CardHeader>
          {diff.timeline_updates.map((t, i) => <ChangeRow key={i} type="+" text={`${t.timeline_name}: ${t.new_nodes} new`} />)}
        </Card>
      )}
    </div>
  )
}
