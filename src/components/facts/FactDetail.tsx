import { ConfidenceBadge, StatusBadge, FactTypeBadge } from '@/components/ui/Badge'
import { VerificationDetail } from './VerificationDetail'
import type { AtomicFact } from '@/lib/types'

export function FactDetail({ fact }: { fact: AtomicFact }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={fact.verification_status} />
        <ConfidenceBadge confidence={fact.confidence} />
        <FactTypeBadge type={fact.fact_type} />
      </div>
      <div>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--fg)' }}>{fact.content_en}</p>
        {fact.content_zh && <p className="text-[13px] mt-2" style={{ color: 'var(--fg-dim)' }}>{fact.content_zh}</p>}
      </div>
      {fact.fact_type === 'metric' && fact.metric_value != null && (
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: 'var(--fg-faint)' }}>Metric</p>
          <div className="grid grid-cols-2 gap-3 text-[13px] font-mono">
            <div><span style={{ color: 'var(--fg-faint)' }}>name </span><span style={{ color: 'var(--fg-body)' }}>{fact.metric_name}</span></div>
            <div><span style={{ color: 'var(--fg-faint)' }}>value </span><span style={{ color: 'var(--fg-title)' }}>{fact.metric_value.toLocaleString()} {fact.metric_unit}</span></div>
            {fact.metric_period && <div><span style={{ color: 'var(--fg-faint)' }}>period </span><span style={{ color: 'var(--fg-body)' }}>{fact.metric_period}</span></div>}
            {fact.metric_change && <div><span style={{ color: 'var(--fg-faint)' }}>change </span><span style={{ color: 'var(--accent)' }}>{fact.metric_change}</span></div>}
          </div>
        </div>
      )}
      <div className="flex gap-1.5 flex-wrap">
        {fact.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded-lg text-[11px] font-mono"
            style={{ color: 'var(--fg-dim)', border: '1px solid var(--border)' }}>
            {tag}
          </span>
        ))}
      </div>
      <div className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>
        {fact.source_type} / {fact.source_credibility}
        {fact.source_url && (
          <> · <a href={fact.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" style={{ color: 'var(--fg-dim)' }}>{fact.source_url}</a></>
        )}
      </div>
      <VerificationDetail v1={fact.v1_result} v2={fact.v2_result} v3={fact.v3_result} v4={fact.v4_result} v5={fact.v5_result} />
      <div className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>
        {fact.week_number} · {new Date(fact.fact_date).toLocaleDateString()} · {fact.confidence_reasons.join(', ') || '—'}
      </div>
    </div>
  )
}
