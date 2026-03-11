import type { FactContradiction, AtomicFact } from '@/lib/types'

interface Props {
  contradiction: FactContradiction
  factA?: AtomicFact
  factB?: AtomicFact
}

const TYPE_LABELS: Record<string, string> = { numerical: 'Numerical', textual: 'Textual', temporal: 'Temporal' }
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  unresolved: { bg: '#fee2e2', color: '#991b1b' },
  resolved: { bg: '#dcfce7', color: '#166534' },
  dismissed: { bg: 'var(--muted)', color: 'var(--muted-fg)' },
}

export function ContradictionCard({ contradiction, factA, factB }: Props) {
  const s = STATUS_STYLES[contradiction.status] ?? STATUS_STYLES.unresolved
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>{contradiction.status}</span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>{TYPE_LABELS[contradiction.contradiction_type]}</span>
      </div>
      <p className="text-sm mb-3">{contradiction.difference_description}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded border p-3 text-xs" style={{ borderColor: 'var(--border)' }}>
          <p className="font-semibold mb-1">Fact A</p>
          <p>{factA?.content_en ?? contradiction.fact_id_a}</p>
          {factA?.source_url && <a href={factA.source_url} target="_blank" rel="noopener noreferrer" className="underline mt-1 block" style={{ color: 'var(--accent)' }}>Source</a>}
        </div>
        <div className="rounded border p-3 text-xs" style={{ borderColor: 'var(--border)' }}>
          <p className="font-semibold mb-1">Fact B</p>
          <p>{factB?.content_en ?? contradiction.fact_id_b}</p>
          {factB?.source_url && <a href={factB.source_url} target="_blank" rel="noopener noreferrer" className="underline mt-1 block" style={{ color: 'var(--accent)' }}>Source</a>}
        </div>
      </div>
      {contradiction.resolved_note && (
        <p className="text-xs mt-3 p-2 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>Resolution: {contradiction.resolved_note}</p>
      )}
    </div>
  )
}
