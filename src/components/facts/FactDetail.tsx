import { ConfidenceBadge, StatusBadge, FactTypeBadge } from '@/components/ui/Badge'
import { VerificationDetail } from './VerificationDetail'
import type { AtomicFact } from '@/lib/types'

export function FactDetail({ fact }: { fact: AtomicFact }) {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={fact.verification_status} />
        <ConfidenceBadge confidence={fact.confidence} />
        <FactTypeBadge type={fact.fact_type} />
      </div>
      <div>
        <p className="text-base leading-relaxed">{fact.content_en}</p>
        {fact.content_zh && (
          <p className="text-sm mt-2" style={{ color: 'var(--muted-fg)' }}>{fact.content_zh}</p>
        )}
      </div>
      {fact.fact_type === 'metric' && fact.metric_value != null && (
        <div className="rounded-md border p-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold mb-1">Metric Data</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span style={{ color: 'var(--muted-fg)' }}>Name:</span> {fact.metric_name}</div>
            <div><span style={{ color: 'var(--muted-fg)' }}>Value:</span> {fact.metric_value.toLocaleString()} {fact.metric_unit}</div>
            {fact.metric_period && <div><span style={{ color: 'var(--muted-fg)' }}>Period:</span> {fact.metric_period}</div>}
            {fact.metric_change && <div><span style={{ color: 'var(--muted-fg)' }}>Change:</span> {fact.metric_change}</div>}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold mb-1">Tags</p>
        <div className="flex gap-1 flex-wrap">
          {fact.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded text-xs"
              style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold mb-1">Source</p>
        <div className="text-sm space-y-1">
          <div><span style={{ color: 'var(--muted-fg)' }}>Type:</span> {fact.source_type} ({fact.source_credibility})</div>
          {fact.source_url && (
            <a href={fact.source_url} target="_blank" rel="noopener noreferrer"
              className="text-sm underline" style={{ color: 'var(--accent)' }}>
              {fact.source_url}
            </a>
          )}
        </div>
      </div>
      <VerificationDetail v1={fact.v1_result} v2={fact.v2_result} v3={fact.v3_result} v4={fact.v4_result} v5={fact.v5_result} />
      <div className="text-xs" style={{ color: 'var(--muted-fg)' }}>
        Week: {fact.week_number} | Date: {new Date(fact.fact_date).toLocaleDateString()} | Confidence reasons: {fact.confidence_reasons.join(', ') || 'N/A'}
      </div>
    </div>
  )
}
