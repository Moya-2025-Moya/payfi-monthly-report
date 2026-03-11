import { ConfidenceBadge, FactTypeBadge } from '@/components/ui/Badge'
import type { AtomicFact } from '@/lib/types'

export function FactCard({ fact, compact = false }: { fact: AtomicFact; compact?: boolean }) {
  const date = new Date(fact.fact_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div className="rounded border p-4 transition-colors hover:border-[#333]"
      style={{ borderColor: '#1a1a1a', background: '#0a0a0a' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ConfidenceBadge confidence={fact.confidence} />
          <FactTypeBadge type={fact.fact_type} />
        </div>
        <time className="text-[11px] font-mono whitespace-nowrap" style={{ color: '#444' }}>{date}</time>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: '#ccc' }}>{fact.content_en}</p>
      {fact.content_zh && !compact && (
        <p className="text-[13px] mt-1" style={{ color: '#555' }}>{fact.content_zh}</p>
      )}
      {fact.fact_type === 'metric' && fact.metric_value != null && !compact && (
        <div className="mt-3 flex items-center gap-4 text-[11px] font-mono" style={{ color: '#555' }}>
          <span>{fact.metric_name}: {fact.metric_value.toLocaleString()} {fact.metric_unit}</span>
          {fact.metric_change && <span style={{ color: '#ffaa00' }}>{fact.metric_change}</span>}
          {fact.metric_period && <span>{fact.metric_period}</span>}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {fact.tags.slice(0, 5).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{ color: '#444', border: '1px solid #1a1a1a' }}>
              {tag}
            </span>
          ))}
        </div>
        {fact.source_url && (
          <a href={fact.source_url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-mono transition-colors hover:text-white" style={{ color: '#555' }}>
            source ↗
          </a>
        )}
      </div>
    </div>
  )
}
