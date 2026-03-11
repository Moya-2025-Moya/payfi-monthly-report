import type { BlindSpotData } from '@/lib/types'

const STATUS_DISPLAY: Record<string, { symbol: string; color: string }> = {
  covered: { symbol: '+', color: '#00cc88' },
  sparse:  { symbol: '~', color: '#ffaa00' },
  missing: { symbol: '-', color: '#ff4444' },
}

export function CoverageMatrix({ data }: { data: BlindSpotData }) {
  const dims = data.template_dimensions
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left p-3 text-[10px] font-mono tracking-wider uppercase sticky left-0"
              style={{ background: '#000', color: '#444' }}>Entity</th>
            {dims.map(d => (
              <th key={d} className="p-3 text-[10px] font-mono tracking-wider uppercase text-center"
                style={{ color: '#333' }}>
                {d.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.entities.map(e => (
            <tr key={e.entity_id} className="border-t" style={{ borderColor: '#111' }}>
              <td className="p-3 text-[12px] font-mono sticky left-0" style={{ background: '#000', color: '#888' }}>{e.entity_name}</td>
              {dims.map(d => {
                const s = STATUS_DISPLAY[e.coverage[d]] ?? { symbol: '—', color: '#222' }
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
