import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { DiffResult } from '@/lib/types'

function ChangeRow({ type, text }: { type: '+' | '-' | '~'; text: string }) {
  const styles = { '+': { bg: '#dcfce7', color: '#166534' }, '-': { bg: '#fee2e2', color: '#991b1b' }, '~': { bg: '#fef9c3', color: '#854d0e' } }
  const s = styles[type]
  return (
    <div className="flex items-start gap-2 py-1 px-2 rounded text-sm" style={{ background: s.bg, color: s.color }}>
      <span className="font-mono font-bold">{type}</span>
      <span>{text}</span>
    </div>
  )
}

export function DiffDisplay({ diff }: { diff: DiffResult }) {
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>Comparing {diff.week_a} vs {diff.week_b}</p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Card><p className="text-2xl font-bold">{diff.fact_count.week_b}</p><p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Total Facts</p></Card>
        <Card><p className="text-2xl font-bold">{diff.new_entities.length}</p><p className="text-xs" style={{ color: 'var(--muted-fg)' }}>New Entities</p></Card>
        <Card><p className="text-2xl font-bold">{diff.new_contradictions}</p><p className="text-xs" style={{ color: 'var(--muted-fg)' }}>New Contradictions</p></Card>
      </div>
      {diff.new_entities.length > 0 && (
        <Card>
          <CardHeader><CardTitle>New Entities</CardTitle></CardHeader>
          <div className="space-y-1">{diff.new_entities.map(e => <ChangeRow key={e.id} type="+" text={e.name} />)}</div>
        </Card>
      )}
      {diff.status_changes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Status Changes</CardTitle></CardHeader>
          <div className="space-y-1">{diff.status_changes.map((c, i) => <ChangeRow key={i} type="~" text={`${c.entity_name}: ${c.from} → ${c.to}`} />)}</div>
        </Card>
      )}
      {diff.metric_changes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Metric Changes</CardTitle></CardHeader>
          <div className="space-y-1">{diff.metric_changes.map((m, i) => (
            <ChangeRow key={i} type={m.change_pct >= 0 ? '+' : '-'} text={`${m.entity_name} ${m.metric}: ${m.old_value.toLocaleString()} → ${m.new_value.toLocaleString()} (${m.change_pct > 0 ? '+' : ''}${m.change_pct.toFixed(1)}%)`} />
          ))}</div>
        </Card>
      )}
      {diff.timeline_updates.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Timeline Updates</CardTitle></CardHeader>
          <div className="space-y-1">{diff.timeline_updates.map((t, i) => <ChangeRow key={i} type="+" text={`${t.timeline_name}: ${t.new_nodes} new node(s)`} />)}</div>
        </Card>
      )}
    </div>
  )
}
