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
        <p className="text-[15px] leading-relaxed" style={{ color: '#e5e5e5' }}>{fact.content_en}</p>
        {fact.content_zh && <p className="text-[13px] mt-2" style={{ color: '#555' }}>{fact.content_zh}</p>}
      </div>
      {fact.fact_type === 'metric' && fact.metric_value != null && (
        <div className="rounded border p-4" style={{ borderColor: '#1a1a1a', background: '#0a0a0a' }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: '#444' }}>Metric</p>
          <div className="grid grid-cols-2 gap-3 text-[13px] font-mono">
            <div><span style={{ color: '#444' }}>name </span><span style={{ color: '#ccc' }}>{fact.metric_name}</span></div>
            <div><span style={{ color: '#444' }}>value </span><span style={{ color: '#fff' }}>{fact.metric_value.toLocaleString()} {fact.metric_unit}</span></div>
            {fact.metric_period && <div><span style={{ color: '#444' }}>period </span><span style={{ color: '#ccc' }}>{fact.metric_period}</span></div>}
            {fact.metric_change && <div><span style={{ color: '#444' }}>change </span><span style={{ color: '#ffaa00' }}>{fact.metric_change}</span></div>}
          </div>
        </div>
      )}
      <div className="flex gap-1.5 flex-wrap">
        {fact.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded text-[11px] font-mono"
            style={{ color: '#555', border: '1px solid #1a1a1a' }}>
            {tag}
          </span>
        ))}
      </div>
      <div className="text-[11px] font-mono" style={{ color: '#333' }}>
        {fact.source_type} / {fact.source_credibility}
        {fact.source_url && (
          <> · <a href={fact.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" style={{ color: '#555' }}>{fact.source_url}</a></>
        )}
      </div>
      <VerificationDetail v1={fact.v1_result} v2={fact.v2_result} v3={fact.v3_result} v4={fact.v4_result} v5={fact.v5_result} />
      <div className="text-[11px] font-mono" style={{ color: '#333' }}>
        {fact.week_number} · {new Date(fact.fact_date).toLocaleDateString()} · {fact.confidence_reasons.join(', ') || '—'}
      </div>
    </div>
  )
}
