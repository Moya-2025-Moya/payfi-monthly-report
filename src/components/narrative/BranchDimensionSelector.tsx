'use client'

interface Props {
  value: 'auto' | 'entity' | 'stance'
  onChange: (v: 'auto' | 'entity' | 'stance') => void
}

const OPTIONS: { value: 'auto' | 'entity' | 'stance'; label: string }[] = [
  { value: 'auto', label: 'AI自动' },
  { value: 'entity', label: '按公司' },
  { value: 'stance', label: '按阵营' },
]

export function BranchDimensionSelector({ value, onChange }: Props) {
  return (
    <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {OPTIONS.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className="px-3 py-1.5 text-[11px] font-medium transition-colors"
          style={{
            background: value === opt.value ? 'var(--accent)' : 'var(--bg-card)',
            color: value === opt.value ? '#fff' : 'var(--fg-muted)',
            borderRight: opt.value !== 'stance' ? '1px solid var(--border)' : 'none',
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}
