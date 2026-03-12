'use client'

import { useState } from 'react'
import { SourceCountBadge, FactTypeBadge } from '@/components/ui/Badge'
import { VerificationDetail } from './VerificationDetail'
import type { AtomicFact } from '@/lib/types'

const FACT_TYPE_ZH: Record<string, string> = {
  event: '事件', metric: '指标', quote: '引述', relationship: '关系', status_change: '状态变更',
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getSourceUrls(fact: AtomicFact): string[] {
  const urls = new Set<string>()
  if (fact.source_url) urls.add(fact.source_url)
  const v2 = fact.v2_result as { source_urls?: string[] } | null
  if (v2?.source_urls) {
    for (const u of v2.source_urls) urls.add(u)
  }
  return [...urls]
}

export function FactDetail({ fact }: { fact: AtomicFact }) {
  const [showSources, setShowSources] = useState(false)
  const displayContent = fact.content_zh || fact.content_en
  const secondaryContent = fact.content_zh ? fact.content_en : null
  const sourceUrls = getSourceUrls(fact)

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <SourceCountBadge count={sourceUrls.length} onClick={() => setShowSources(s => !s)} />
        <FactTypeBadge type={FACT_TYPE_ZH[fact.fact_type] ?? fact.fact_type} />
      </div>

      {showSources && sourceUrls.length > 0 && (
        <div className="p-3 rounded-md space-y-2" style={{ background: 'var(--surface-alt)' }}>
          <p className="text-[11px] font-mono mb-1.5" style={{ color: 'var(--fg-faint)' }}>信息源</p>
          {sourceUrls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] font-mono truncate flex-1" style={{ color: 'var(--fg-muted)' }}>
                {extractDomain(url)}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
                title={url}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 1H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7" />
                  <path d="M7 1h4v4M11 1L5.5 6.5" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--fg)' }}>{displayContent}</p>
        {secondaryContent && <p className="text-[13px] mt-2 italic" style={{ color: 'var(--fg-dim)' }}>{secondaryContent}</p>}
      </div>
      {fact.fact_type === 'metric' && fact.metric_value != null && (
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[11px] font-mono tracking-wider mb-3" style={{ color: 'var(--fg-faint)' }}>指标详情</p>
          <div className="grid grid-cols-2 gap-3 text-[13px] font-mono">
            <div><span style={{ color: 'var(--fg-faint)' }}>名称 </span><span style={{ color: 'var(--fg-body)' }}>{fact.metric_name}</span></div>
            <div><span style={{ color: 'var(--fg-faint)' }}>数值 </span><span style={{ color: 'var(--fg-title)' }}>{fact.metric_value.toLocaleString()} {fact.metric_unit}</span></div>
            {fact.metric_period && <div><span style={{ color: 'var(--fg-faint)' }}>周期 </span><span style={{ color: 'var(--fg-body)' }}>{fact.metric_period}</span></div>}
            {fact.metric_change && <div><span style={{ color: 'var(--fg-faint)' }}>变化 </span><span style={{ color: 'var(--accent)' }}>{fact.metric_change}</span></div>}
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
      </div>
      <VerificationDetail v1={fact.v1_result} v2={fact.v2_result} v3={fact.v3_result} v4={fact.v4_result} v5={fact.v5_result} />
      <div className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>
        {fact.week_number} · {new Date(fact.fact_date).toLocaleDateString('zh-CN')}
      </div>
    </div>
  )
}
