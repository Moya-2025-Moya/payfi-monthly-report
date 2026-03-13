'use client'

interface ResultItem {
  type: 'fact' | 'ai' | 'timeline' | 'error' | 'system'
  content: string
  facts?: { content: string; date?: string; source_url?: string }[]
  timelineEvents?: { date: string; event: string; isPrediction?: boolean }[]
}

interface ConsoleResultCardProps {
  result: ResultItem
}

export function ConsoleResultCard({ result }: ConsoleResultCardProps) {
  if (result.type === 'system') {
    return (
      <div className="px-4 py-2 text-[13px]" style={{ color: 'var(--success)' }}>
        {result.content}
      </div>
    )
  }

  if (result.type === 'error') {
    return (
      <div className="px-4 py-2 text-[13px]" style={{ color: 'var(--danger)' }}>
        {result.content}
      </div>
    )
  }

  if (result.type === 'timeline' && result.timelineEvents) {
    return (
      <div className="px-4 py-3">
        <div className="space-y-2">
          {result.timelineEvents.map((evt, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                  style={{ background: evt.isPrediction ? 'var(--fg-muted)' : 'var(--accent)' }} />
                {i < result.timelineEvents!.length - 1 && (
                  <div className="w-px flex-1 mt-1"
                    style={{ background: 'var(--border)', borderStyle: evt.isPrediction ? 'dashed' : 'solid' }} />
                )}
              </div>
              <div className="pb-3">
                <span className="text-[12px] font-mono" style={{ color: 'var(--fg-muted)' }}>{evt.date}</span>
                <p className="text-[13px] mt-0.5" style={{ color: evt.isPrediction ? 'var(--fg-muted)' : 'var(--fg-body)' }}>
                  {evt.event}{evt.isPrediction ? ' (预测)' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (result.type === 'ai') {
    return (
      <div className="px-4 py-3">
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--fg-body)' }}>
          {result.content}
        </p>
        {result.facts && result.facts.length > 0 && (
          <div className="mt-3 pt-2 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--fg-muted)' }}>引用事实</p>
            {result.facts.map((f, i) => (
              <div key={i} className="text-[12px] flex gap-2" style={{ color: 'var(--fg-secondary)' }}>
                <span className="font-mono shrink-0" style={{ color: 'var(--fg-muted)' }}>[{i + 1}]</span>
                <span>{f.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Default: fact list
  return (
    <div className="px-4 py-3">
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
        {result.content}
      </p>
    </div>
  )
}
