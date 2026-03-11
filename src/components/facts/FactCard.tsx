'use client'
import { useState } from 'react'
import { ConfidenceBadge, FactTypeBadge } from '@/components/ui/Badge'
import type { AtomicFact } from '@/lib/types'

const FACT_TYPE_ZH: Record<string, string> = {
  event: '事件',
  metric: '指标',
  quote: '引述',
  relationship: '关系',
  status_change: '状态变更',
}

export function FactCard({ fact, compact = false }: { fact: AtomicFact; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(fact.fact_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' })
  const displayContent = fact.content_zh || fact.content_en
  return (
    <div
      className="rounded-lg border p-4 transition-colors cursor-pointer"
      style={{ borderColor: expanded ? 'var(--border-hover)' : 'var(--border)', background: 'var(--surface)' }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ConfidenceBadge confidence={fact.confidence} />
          <FactTypeBadge type={FACT_TYPE_ZH[fact.fact_type] ?? fact.fact_type} />
        </div>
        <time className="text-[11px] font-mono whitespace-nowrap" style={{ color: 'var(--fg-faint)' }}>{date}</time>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>{displayContent}</p>
      {fact.content_zh && fact.content_en && !compact && (
        <p className="text-[12px] mt-1 italic" style={{ color: 'var(--fg-dim)' }}>{fact.content_en}</p>
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
            来源 ↗
          </a>
        )}
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-2 text-[12px] font-mono" style={{ borderColor: 'var(--border)' }}>
          {fact.source_type && (
            <div className="flex gap-2">
              <span style={{ color: 'var(--fg-faint)' }}>来源类型:</span>
              <span style={{ color: 'var(--fg-muted)' }}>{fact.source_type}</span>
            </div>
          )}
          {fact.source_credibility && (
            <div className="flex gap-2">
              <span style={{ color: 'var(--fg-faint)' }}>可信度:</span>
              <span style={{ color: 'var(--fg-muted)' }}>{fact.source_credibility}</span>
            </div>
          )}
          {fact.verification_status && (
            <div className="flex gap-2">
              <span style={{ color: 'var(--fg-faint)' }}>验证状态:</span>
              <span style={{ color: 'var(--fg-muted)' }}>{fact.verification_status}</span>
            </div>
          )}
          {fact.week_number && (
            <div className="flex gap-2">
              <span style={{ color: 'var(--fg-faint)' }}>周次:</span>
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
