import type { AtomicFact, Sector } from '@/lib/types'

const SECTOR_LABELS: Record<string, string> = {
  issuance: 'Issuance', payments: 'Payments', defi: 'DeFi',
  infrastructure: 'Infra', regulatory: 'Regulatory', capital_markets: 'Capital Mkts'
}
const SECTORS: Sector[] = ['issuance', 'payments', 'defi', 'infrastructure', 'regulatory', 'capital_markets']
const FACT_TYPES = ['event', 'metric', 'quote', 'relationship', 'status_change'] as const

export function MatrixView({ facts }: { facts: AtomicFact[] }) {
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

  function cellBg(count: number) {
    if (count === 0) return '#0a0a0a'
    if (count <= 2) return '#111'
    if (count <= 5) return '#1a1a1a'
    if (count <= 10) return '#222'
    return '#333'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left p-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: '#444' }}>Sector</th>
            {FACT_TYPES.map(t => (
              <th key={t} className="p-3 text-[10px] font-mono tracking-wider uppercase text-center" style={{ color: '#444' }}>{t.replace('_', ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SECTORS.map(s => (
            <tr key={s} className="border-t" style={{ borderColor: '#111' }}>
              <td className="p-3 text-[12px] font-mono" style={{ color: '#888' }}>{SECTOR_LABELS[s]}</td>
              {FACT_TYPES.map(t => (
                <td key={t} className="p-3 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded text-[12px] font-mono"
                    style={{ background: cellBg(matrix[s][t]), color: matrix[s][t] > 0 ? '#888' : '#222' }}>
                    {matrix[s][t]}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
