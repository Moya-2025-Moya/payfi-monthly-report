'use client'
import { useState, useRef } from 'react'
import type { AtomicFact } from '@/lib/types'

/* ── Fact type labels ── */
const FACT_TYPE_LABELS: Record<string, string> = {
  event: '事件', metric: '指标', quote: '引述',
  relationship: '关系', status_change: '状态变更',
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function getSourceUrls(fact: AtomicFact): string[] {
  const urls = new Set<string>()
  if (fact.source_url) urls.add(fact.source_url)
  const v2 = fact.v2_result as { source_urls?: string[] } | null
  if (v2?.source_urls) { for (const u of v2.source_urls) urls.add(u) }
  return [...urls]
}

function getVerificationIndicators(fact: AtomicFact): { label: string; detail?: string }[] {
  const indicators: { label: string; detail?: string }[] = []
  const v1 = fact.v1_result as { match_score?: number; status?: string } | null
  if (v1?.match_score != null && v1.match_score > 0) {
    indicators.push({ label: `原文${v1.match_score}%`, detail: `来源原文匹配度 ${v1.match_score}%` })
  } else if (!fact.source_url && (v1?.status === 'source_unavailable' || (v1?.match_score != null && v1.match_score === 0))) {
    // 只在真正没有 source_url 时才显示"原文不可达"
    indicators.push({ label: '原文不可达', detail: '来源原文无法获取或解析' })
  }
  const v2 = fact.v2_result as { source_count?: number; independent_sources?: boolean } | null
  if (v2?.source_count != null && v2.source_count >= 2) {
    const indep = v2.independent_sources ? '独立' : ''
    indicators.push({ label: `${v2.source_count}${indep}源`, detail: `${v2.source_count} 个${indep ? '独立' : ''}信息源交叉验证` })
  }
  const v4 = fact.v4_result as { anchor_status?: string; deviation_pct?: number | null } | null
  if (v4?.anchor_status === 'anchored') {
    indicators.push({ label: '链上锚定', detail: '与链上实际数据匹配' })
  } else if (v4?.anchor_status === 'deviation' && v4.deviation_pct != null) {
    indicators.push({ label: `链上偏差${Math.abs(v4.deviation_pct).toFixed(0)}%`, detail: `与链上数据偏差 ${v4.deviation_pct}%` })
  }
  return indicators
}

function getContradiction(fact: AtomicFact): string | null {
  const v5 = fact.v5_result as { temporal_status?: string; conflict_detail?: string } | null
  if (v5?.temporal_status === 'conflict' && v5.conflict_detail) return v5.conflict_detail
  return null
}

/* ── Metric change arrow ── */
function MetricChangeArrow({ change }: { change: string }) {
  const isUp = change.startsWith('+') || change.startsWith('↑') || parseFloat(change) > 0
  const isDown = change.startsWith('-') || change.startsWith('↓') || parseFloat(change) < 0
  const color = isUp ? 'var(--success)' : isDown ? 'var(--danger)' : 'var(--fg-muted)'
  return (
    <span className="inline-flex items-center gap-0.5 text-[13px] font-mono font-medium" style={{ color }}>
      {isUp && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V3m0 0L3 6m3-3l3 3" /></svg>}
      {isDown && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v6m0 0l3-3m-3 3L3 6" /></svg>}
      {change}
    </span>
  )
}

/* ── Extract speaker from quote content ── */
function extractSpeaker(content: string): { speaker: string | null; quote: string } {
  const match = content.match(/^(.+?)\s*(表示|认为|指出|称|说|透露|强调|提到|预测|警告)[\s：:]+['"「]?(.+?)['"」]?$/)
  if (match) return { speaker: match[1].trim(), quote: match[3].trim() }
  const match2 = content.match(/^(.+?)\s*[:：]\s*['"「](.+?)['"」]$/)
  if (match2) return { speaker: match2[1].trim(), quote: match2[2].trim() }
  return { speaker: null, quote: content }
}

/* ── Quote layout ── */
function QuoteContent({ content }: { content: string }) {
  const { speaker, quote } = extractSpeaker(content)
  return (
    <div className="flex gap-3">
      <div className="w-1 rounded-full shrink-0" style={{ background: '#8b5cf6', opacity: 0.4 }} />
      <div>
        {speaker && <p className="text-[11px] font-medium mb-1" style={{ color: '#8b5cf6' }}>{speaker}</p>}
        <div className="italic">{quote}</div>
      </div>
    </div>
  )
}

export function FactCard({ fact, compact = false }: { fact: AtomicFact; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const date = new Date(fact.fact_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  const displayContent = fact.content_zh || fact.content_en
  const sourceUrls = getSourceUrls(fact)
  const verificationIndicators = getVerificationIndicators(fact)
  const contradiction = getContradiction(fact)
  const typeLabel = FACT_TYPE_LABELS[fact.fact_type] ?? '其他'

  // "原文不可达" shown in default state as trust signal
  const unreachable = verificationIndicators.find(i => i.label === '原文不可达')

  function toggleExpand() {
    setExpanded(e => !e)
  }

  /* ── Compact mode for timeline ── */
  if (compact && !expanded) {
    return (
      <div className="flex items-start gap-2 py-2 px-1 rounded-md cursor-pointer transition-colors hover:bg-[var(--surface-alt)]"
        onClick={toggleExpand}>
        <p className="text-[14px] leading-relaxed flex-1 min-w-0" style={{ color: 'var(--fg-body)' }}>{displayContent}</p>
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {unreachable && (
            <span className="px-1 py-0.5 rounded text-[11px]"
              style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
              {unreachable.label}
            </span>
          )}
          <time className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{date}</time>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--fg-muted)" strokeWidth="1.5"><path d="M5 3l4 4-4 4" /></svg>
        </div>
      </div>
    )
  }

  return (
    <div
      className={compact ? 'rounded-lg border overflow-hidden transition-colors mb-1' : 'rounded-lg border overflow-hidden transition-colors'}
      style={{ borderColor: expanded ? 'var(--border-hover)' : 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="p-4">
        {/* Content area */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {fact.fact_type === 'quote' ? (
              <div className="cursor-pointer" onClick={toggleExpand}>
                <QuoteContent content={displayContent} />
              </div>
            ) : (
              <p className="text-[14px] leading-relaxed cursor-pointer" style={{ color: 'var(--fg-body)' }} onClick={toggleExpand}>
                {displayContent}
              </p>
            )}
          </div>
          <button onClick={toggleExpand} className="shrink-0 mt-1 p-0.5 rounded transition-colors" style={{ color: 'var(--fg-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease' }}>
              <path d="M5 3l4 4-4 4" />
            </svg>
          </button>
        </div>

        {/* Metric values */}
        {fact.fact_type === 'metric' && fact.metric_value != null && !compact && (
          <div className="mt-2 flex items-baseline gap-3 flex-wrap">
            <span className="text-[18px] font-semibold font-mono" style={{ color: 'var(--fg-title)' }}>
              {fact.metric_value.toLocaleString()} {fact.metric_unit}
            </span>
            {fact.metric_change && <MetricChangeArrow change={fact.metric_change} />}
            {fact.metric_period && <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{fact.metric_period}</span>}
          </div>
        )}

        {/* Contradiction warning — always visible */}
        {contradiction && (
          <div className="mt-2 px-2.5 py-1.5 rounded-md text-[12px]"
            style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
            矛盾: {contradiction}
          </div>
        )}

        {/* Default metadata: source + date + type label + "原文不可达" warning */}
        <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: 'var(--fg-muted)' }}>
          {sourceUrls.length > 0 && (
            <a href={sourceUrls[0]} target="_blank" rel="noopener noreferrer"
              className="hover:underline" onClick={e => e.stopPropagation()}>
              {extractDomain(sourceUrls[0])}{sourceUrls.length > 1 && ` +${sourceUrls.length - 1}`}
            </a>
          )}
          <span>·</span>
          <time>{date}</time>
          <span>·</span>
          <span>{typeLabel}</span>
          {unreachable && (
            <>
              <span>·</span>
              <span style={{ color: 'var(--warning)' }}>{unreachable.label}</span>
            </>
          )}
        </div>

        {/* Expanded: verification details + all metadata */}
        <div ref={contentRef} className="overflow-hidden transition-all duration-150"
          style={{ maxHeight: expanded ? '2000px' : '0', opacity: expanded ? 1 : 0 }}>
          {expanded && (
            <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>

              {/* Verification details */}
              {verificationIndicators.length > 0 && (
                <div>
                  <p className="text-[11px] tracking-wider uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>验证详情</p>
                  <div className="flex flex-wrap gap-1.5">
                    {verificationIndicators.map((ind, i) => (
                      <span key={i} className="px-2 py-1 rounded text-[12px]"
                        style={{ background: 'var(--info-soft)', color: 'var(--info)', border: '1px solid var(--info-muted)' }}
                        title={ind.detail}>
                        {ind.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* English content if bilingual */}
              {fact.content_zh && fact.content_en && (
                <p className="text-[13px] italic" style={{ color: 'var(--fg-secondary)' }}>{fact.content_en}</p>
              )}

              {/* Source URLs */}
              {sourceUrls.length > 0 && (
                <div>
                  <p className="text-[11px] tracking-wider uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>信息源</p>
                  <div className="space-y-1">
                    {sourceUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="block text-[12px] truncate hover:underline" style={{ color: 'var(--info)' }}>
                        {extractDomain(url)} — {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {fact.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {fact.tags.map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded text-[11px]"
                      style={{ color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
