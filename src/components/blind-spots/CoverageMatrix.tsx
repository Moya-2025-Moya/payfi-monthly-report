import type { BlindSpotData } from '@/lib/types'

export function CoverageMatrix({ data }: { data: BlindSpotData }) {
  const dims = data.template_dimensions
  const icons: Record<string, string> = { covered: '✅', sparse: '⚠️', missing: '❌' }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-2 text-xs font-medium sticky left-0" style={{ background: 'var(--background)', color: 'var(--muted-fg)' }}>Entity</th>
            {dims.map(d => (
              <th key={d} className="p-2 text-xs font-medium text-center" style={{ color: 'var(--muted-fg)' }}>
                {d.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.entities.map(e => (
            <tr key={e.entity_id} className="border-t" style={{ borderColor: 'var(--border)' }}>
              <td className="p-2 font-medium text-xs sticky left-0" style={{ background: 'var(--background)' }}>{e.entity_name}</td>
              {dims.map(d => (
                <td key={d} className="p-2 text-center text-sm">{icons[e.coverage[d]] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
