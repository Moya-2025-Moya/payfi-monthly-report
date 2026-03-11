'use client'
import { useState } from 'react'
import { ConfidenceBadge, FactTypeBadge } from '@/components/ui/Badge'
import type { AtomicFact } from '@/lib/types'

export function FactCard({ fact, compact = false }: { fact: AtomicFact; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(fact.fact_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div
      className="rounded-lg border p-4 transition-colors cursor-pointer"
      style={{ borderColor: expanded ? 'var(--border-hover)' : 'var(--border)', background: 'var(--surface)' }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ConfidenceBadge confidence={fact.confidence} />
          <FactTypeBadge type={fact.fact_type} />
        </div>
        <time className="text-[11px] font-mono whitespace-nowrap" style={{ color: 'var(--fg-faint)' }}>{date}</time>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>{fact.content_en}</p>
      {fact.content_zh && !compact && (
        <p className="text-[13px] mt-1" style={{ color: 'var(--fg-dim)' }}>{fact.content_zh}</p>
      )}
      {fact.fact_type === 'metric' && fact.metric_value != null && !compact && (
        <div className="mt-3 flex items-center gap-4 text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>
          <span>{fact.metric_name}: {fact.metric_value.toLocaleString()} {fact.metric_unit}</span>
          {fact.metric_change && <span style={{ color: 'var(--accent)' }}>{fact.metric_change}</span>}
          {fact.metric_period && <span>{fact.metric_period}</span>}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {fact.tags.slice(0, 5).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{ color: 'var(--fg-faint)', border: '1px solid var(--border)' }}>
              {tag}
            </span>
          ))}
        </div>
        {fact.source_url && (
          <a href={fact.source_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[11px] font-mono transition-colors" style={{ color: 'var(--fg-dim)' }}>
            source ↗
          </a>
        )}
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-2 text-[12px] font-mono" style={{ borderColor: 'var(--border)' }}>
          {fact.source_type && (
            <div className="flex gap-2">
              <span style={{ color: 'var(--fg-faint)' }}>Source:</span>
              <span style={{ color: 'var(--fg-muted)' }}>{fact.source_type}</span>
            </div>
          )}
          {fact.source_credibility && (
            <div className="flex gap-2">
              <span style={{ color: 'var(--fg-faint)' }}>Credibility:</span>
              <span style={{ color: 'var(--fg-muted)' }}>{fact.source_credibility}</span>
            </div>
          )}
          {fact.verification_status && (
            <div className="flex gap-2">
              <span style={{ color: 'var(--fg-faint)' }}>Verification:</span>
              <span style={{ color: 'var(--fg-muted)' }}>{fact.verification_status}</span>
            </div>
          )}
          {fact.week_number && (
            <div className="flex gap-2">
              <span style={{ color: 'var(--fg-faint)' }}>Week:</span>
              <span style={{ color: 'var(--fg-muted)' }}>{fact.week_number}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span style={{ color: 'var(--fg-faint)' }}>ID:</span>
            <span style={{ color: 'var(--fg-dim)' }}>{fact.id}</span>
          </div>
        </div>
      )}
    </div>
  )
}
