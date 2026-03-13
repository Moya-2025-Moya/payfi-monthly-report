'use client'

interface KnowledgeHeartbeatProps {
  data: { week: string; total: number }[]
}

export function KnowledgeHeartbeat({ data }: KnowledgeHeartbeatProps) {
  if (data.length === 0) return null

  const maxVal = Math.max(...data.map(d => d.total), 1)
  const latest = data[data.length - 1]
  const prev = data.length >= 2 ? data[data.length - 2] : null
  const growth = prev ? latest.total - prev.total : 0

  return (
    <div className="px-4 py-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--fg-muted)' }}>
          知识库增长
        </p>
        <span className="text-[11px] font-mono" style={{ color: growth > 0 ? 'var(--success)' : 'var(--fg-muted)' }}>
          {latest.total} 条参考事件{growth > 0 ? ` (+${growth})` : ''}
        </span>
      </div>
      <div className="flex items-end gap-[3px]" style={{ height: '32px' }}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.total / maxVal) * 28)
          const isLatest = i === data.length - 1
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div style={{
                width: '100%',
                maxWidth: '16px',
                height: `${h}px`,
                borderRadius: '2px',
                background: isLatest ? 'var(--accent)' : 'var(--accent-muted)',
                transition: 'height 300ms ease',
              }} />
            </div>
          )
        })}
      </div>
      <div className="flex items-end gap-[3px] mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] font-mono" style={{ color: 'var(--fg-muted)' }}>
            {d.week.replace(/^\d{4}-W/, 'W')}
          </div>
        ))}
      </div>
    </div>
  )
}
