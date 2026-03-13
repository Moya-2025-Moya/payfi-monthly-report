'use client'

interface ContradictionData {
  fact_a_content: string
  fact_b_content: string
  difference: string
  type: 'numerical' | 'textual' | 'temporal'
}

interface ContradictionCalloutProps {
  contradictions: ContradictionData[]
}

export function ContradictionCallout({ contradictions }: ContradictionCalloutProps) {
  if (contradictions.length === 0) return null

  return (
    <div>
      <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--danger)' }}>
        矛盾提醒
      </h2>
      <div className="space-y-2">
        {contradictions.map((c, i) => (
          <div key={i} className="rounded-lg border-l-4 p-3"
            style={{ borderLeftColor: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid rgba(220,38,38,0.15)', borderLeftWidth: '4px' }}>
            <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--danger)' }}>
              {c.difference}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 rounded text-[12px]" style={{ background: 'var(--surface)', color: 'var(--fg-secondary)' }}>
                <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--fg-muted)' }}>事实 A</p>
                {c.fact_a_content}
              </div>
              <div className="p-2 rounded text-[12px]" style={{ background: 'var(--surface)', color: 'var(--fg-secondary)' }}>
                <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--fg-muted)' }}>事实 B</p>
                {c.fact_b_content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
