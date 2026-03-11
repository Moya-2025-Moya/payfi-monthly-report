import type { BlindSpotData } from '@/lib/types'

const STATUS_DISPLAY: Record<string, { symbol: string; color: string }> = {
  covered: { symbol: '+', color: 'var(--success)' },
  sparse:  { symbol: '~', color: 'var(--accent)' },
  missing: { symbol: '-', color: 'var(--danger)' },
}

export function CoverageMatrix({ data }: { data: BlindSpotData }) {
  const dims = data.template_dimensions
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left p-3 text-[10px] font-mono tracking-wider uppercase sticky left-0"
              style={{ background: 'var(--bg)', color: 'var(--fg-faint)' }}>Entity</th>
            {dims.map(d => (
              <th key={d} className="p-3 text-[10px] font-mono tracking-wider uppercase text-center"
                style={{ color: 'var(--fg-faint)' }}>
                {d.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.entities.map(e => (
            <tr key={e.entity_id} className="border-t" style={{ borderColor: 'var(--surface-alt)' }}>
              <td className="p-3 text-[12px] font-mono sticky left-0" style={{ background: 'var(--bg)', color: 'var(--fg-muted)' }}>{e.entity_name}</td>
              {dims.map(d => {
                const s = STATUS_DISPLAY[e.coverage[d]] ?? { symbol: '—', color: 'var(--fg-faint)' }
                return (
                  <td key={d} className="p-3 text-center text-[13px] font-mono font-bold" style={{ color: s.color }}>
                    {s.symbol}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
