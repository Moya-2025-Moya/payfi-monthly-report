import { ConfidenceBadge, FactTypeBadge } from '@/components/ui/Badge'
import type { AtomicFact } from '@/lib/types'

export function FactCard({ fact, compact = false }: { fact: AtomicFact; compact?: boolean }) {
  const date = new Date(fact.fact_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
      style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ConfidenceBadge confidence={fact.confidence} />
          <FactTypeBadge type={fact.fact_type} />
        </div>
        <time className="text-xs whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{date}</time>
      </div>
      <p className="text-sm leading-relaxed">{fact.content_en}</p>
      {fact.content_zh && !compact && (
        <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>{fact.content_zh}</p>
      )}
      {fact.fact_type === 'metric' && fact.metric_value != null && !compact && (
        <div className="mt-2 flex items-center gap-3 text-xs font-mono" style={{ color: 'var(--muted-fg)' }}>
          <span>{fact.metric_name}: {fact.metric_value.toLocaleString()} {fact.metric_unit}</span>
          {fact.metric_change && <span>{fact.metric_change}</span>}
          {fact.metric_period && <span>({fact.metric_period})</span>}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {fact.tags.slice(0, 5).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
              {tag}
            </span>
          ))}
        </div>
        {fact.source_url && (
          <a href={fact.source_url} target="_blank" rel="noopener noreferrer"
            className="text-xs underline" style={{ color: 'var(--accent)' }}>
            Source
          </a>
        )}
      </div>
    </div>
  )
}
