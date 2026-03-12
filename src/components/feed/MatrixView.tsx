import type { AtomicFact, Sector } from '@/lib/types'

const SECTOR_LABELS: Record<string, string> = {
  issuance: '发行', payments: '支付', defi: 'DeFi',
  infrastructure: '基础设施', regulatory: '监管', capital_markets: '资本市场'
}
const SECTORS: Sector[] = ['issuance', 'payments', 'defi', 'infrastructure', 'regulatory', 'capital_markets']
const FACT_TYPES = ['event', 'metric', 'quote', 'relationship', 'status_change'] as const
const FACT_TYPE_ZH: Record<string, string> = {
  event: '事件', metric: '指标', quote: '引述', relationship: '关系', status_change: '状态变更'
}

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

  function cellStyle(count: number): React.CSSProperties {
    if (count === 0) return { background: 'var(--surface)', color: 'var(--fg-muted)' }
    if (count <= 2) return { background: 'var(--accent-soft)', color: 'var(--accent)' }
    if (count <= 5) return { background: 'var(--accent-muted)', color: 'var(--accent)' }
    return { background: 'var(--accent)', color: 'var(--accent-fg)' }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left p-3 text-[11px] font-mono tracking-wider" style={{ color: 'var(--fg-muted)' }}>板块</th>
            {FACT_TYPES.map(t => (
              <th key={t} className="p-3 text-[11px] font-mono tracking-wider text-center" style={{ color: 'var(--fg-muted)' }}>{FACT_TYPE_ZH[t]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SECTORS.map(s => (
            <tr key={s} className="border-t" style={{ borderColor: 'var(--border)' }}>
              <td className="p-3 text-[13px] font-mono" style={{ color: 'var(--fg-muted)' }}>{SECTOR_LABELS[s]}</td>
              {FACT_TYPES.map(t => (
                <td key={t} className="p-3 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded text-[13px] font-mono"
                    style={cellStyle(matrix[s][t])}>
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
