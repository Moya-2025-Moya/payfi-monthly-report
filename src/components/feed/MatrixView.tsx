import type { AtomicFact, Sector } from '@/lib/types'

const SECTOR_LABELS: Record<string, string> = {
  issuance: 'Issuance', payments: 'Payments', defi: 'DeFi',
  infrastructure: 'Infra', regulatory: 'Regulatory', capital_markets: 'Capital Markets'
}
const SECTORS: Sector[] = ['issuance', 'payments', 'defi', 'infrastructure', 'regulatory', 'capital_markets']
const FACT_TYPES = ['event', 'metric', 'quote', 'relationship', 'status_change'] as const

export function MatrixView({ facts }: { facts: AtomicFact[] }) {
  // Build matrix: sector x fact_type -> count
  const matrix: Record<string, Record<string, number>> = {}
  for (const s of SECTORS) {
    matrix[s] = {}
    for (const t of FACT_TYPES) matrix[s][t] = 0
  }
  for (const fact of facts) {
    for (const tag of fact.tags) {
      for (const s of SECTORS) {
        if (tag === s || SECTOR_LABELS[s]?.toLowerCase() === tag) {
          matrix[s][fact.fact_type] = (matrix[s][fact.fact_type] ?? 0) + 1
        }
      }
    }
  }

  function cellColor(count: number) {
    if (count === 0) return 'var(--muted)'
    if (count <= 3) return '#dbeafe'
    if (count <= 10) return '#93c5fd'
    return '#3b82f6'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-2 text-xs font-medium" style={{ color: 'var(--muted-fg)' }}>Sector</th>
            {FACT_TYPES.map(t => (
              <th key={t} className="p-2 text-xs font-medium text-center" style={{ color: 'var(--muted-fg)' }}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SECTORS.map(s => (
            <tr key={s}>
              <td className="p-2 font-medium text-xs">{SECTOR_LABELS[s]}</td>
              {FACT_TYPES.map(t => (
                <td key={t} className="p-2 text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded text-xs font-mono"
                    style={{ background: cellColor(matrix[s][t]), color: matrix[s][t] > 3 ? '#fff' : 'var(--foreground)' }}>
                    {matrix[s][t]}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
