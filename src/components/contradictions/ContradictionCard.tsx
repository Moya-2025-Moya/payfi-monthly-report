import type { FactContradiction, AtomicFact } from '@/lib/types'

interface Props {
  contradiction: FactContradiction
  factA?: AtomicFact
  factB?: AtomicFact
}

const STATUS_COLORS: Record<string, string> = { unresolved: '#ff4444', resolved: '#00cc88', dismissed: '#444' }
const TYPE_LABELS: Record<string, string> = { numerical: 'num', textual: 'text', temporal: 'time' }

export function ContradictionCard({ contradiction, factA, factB }: Props) {
  return (
    <div className="rounded border p-5" style={{ borderColor: '#1a1a1a', background: '#0a0a0a' }}>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[contradiction.status] }} />
        <span className="text-[11px] font-mono" style={{ color: STATUS_COLORS[contradiction.status] }}>{contradiction.status}</span>
        <span className="text-[10px] font-mono" style={{ color: '#333' }}>{TYPE_LABELS[contradiction.contradiction_type] ?? contradiction.contradiction_type}</span>
      </div>
      <p className="text-[13px] mb-4" style={{ color: '#999' }}>{contradiction.difference_description}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded border p-3" style={{ borderColor: '#1a1a1a' }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: '#333' }}>Fact A</p>
          <p className="text-[12px]" style={{ color: '#888' }}>{factA?.content_en ?? contradiction.fact_id_a}</p>
          {factA?.source_url && <a href={factA.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono mt-2 block hover:text-white transition-colors" style={{ color: '#444' }}>source ↗</a>}
        </div>
        <div className="rounded border p-3" style={{ borderColor: '#1a1a1a' }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: '#333' }}>Fact B</p>
          <p className="text-[12px]" style={{ color: '#888' }}>{factB?.content_en ?? contradiction.fact_id_b}</p>
          {factB?.source_url && <a href={factB.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono mt-2 block hover:text-white transition-colors" style={{ color: '#444' }}>source ↗</a>}
        </div>
      </div>
      {contradiction.resolved_note && (
        <p className="text-[11px] font-mono mt-4 pt-3 border-t" style={{ borderColor: '#1a1a1a', color: '#555' }}>
          {contradiction.resolved_note}
        </p>
      )}
    </div>
  )
}
