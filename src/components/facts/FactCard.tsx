'use client'
import { useState, useRef } from 'react'
import type { AtomicFact } from '@/lib/types'

/* ── Fact type labels ── */
const FACT_TYPE_LABELS: Record<string, string> = {
  event: '事件', metric: '指标', quote: '引述',
  relationship: '关系', status_change: '状态变更',
}

/* ── Objectivity labels ── */
const OBJECTIVITY_LABELS: Record<string, string> = {
  fact: '事实',
  opinion: '观点',
  analysis: '分析',
}

/* ── Confidence dot colors ── */
const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'var(--success)',
  medium: 'var(--warning)',
  low: 'var(--danger)',
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: '高可信',
  medium: '中可信',
  low: '低可信',
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

/* ── Evidence badges (V7: replace numerical scores with intuitive badges) ── */
type EvidenceBadge = { icon: string; label: string; detail: string; type: 'pass' | 'warn' | 'fail' }

function getEvidenceBadges(fact: AtomicFact): EvidenceBadge[] {
  const badges: EvidenceBadge[] = []
  const v1 = fact.v1_result as { match_score?: number; status?: string } | null
  if (v1?.status === 'matched' || (v1?.match_score != null && v1.match_score >= 60)) {
    badges.push({ icon: '✓', label: '来源可达', detail: '原文内容匹配验证通过', type: 'pass' })
  } else if (v1?.status === 'partial') {
    badges.push({ icon: '~', label: '来源部分匹配', detail: '原文内容部分匹配', type: 'warn' })
  } else if (v1?.status === 'mismatch') {
    badges.push({ icon: '!', label: '原文不符', detail: '来源原文内容与事实不匹配', type: 'fail' })
  }
  // source_unavailable / score=0: 抓取失败不代表事实有问题，不展示 badge

  const v2 = fact.v2_result as { source_count?: number; independent_sources?: boolean } | null
  if (v2?.source_count != null && v2.source_count >= 2) {
    const indep = v2.independent_sources ? '独立' : ''
    badges.push({ icon: '✓', label: `${v2.source_count}${indep}源验证`, detail: `${v2.source_count} 个${indep ? '独立' : ''}来源交叉一致`, type: 'pass' })
  }

  const v4 = fact.v4_result as { anchor_status?: string; deviation_pct?: number | null } | null
  if (v4?.anchor_status === 'anchored') {
    badges.push({ icon: '✓', label: '链上锚定', detail: '与链上实际数据匹配', type: 'pass' })
  } else if (v4?.anchor_status === 'deviation' && v4.deviation_pct != null) {
    badges.push({ icon: '~', label: `链上偏差${Math.abs(v4.deviation_pct).toFixed(0)}%`, detail: `与链上数据偏差 ${v4.deviation_pct.toFixed(1)}%`, type: 'warn' })
  } else if (v4?.anchor_status === 'mismatch') {
    badges.push({ icon: '!', label: '链上不符', detail: '与链上数据不匹配', type: 'fail' })
  }

  const v3 = fact.v3_result as { sanity?: string } | null
  if (v3?.sanity === 'anomaly') {
    badges.push({ icon: '?', label: '数值异常', detail: '数值超出历史合理范围', type: 'warn' })
  } else if (v3?.sanity === 'likely_error') {
    badges.push({ icon: '!', label: '数值可疑', detail: '数值很可能有误', type: 'fail' })
  }

  return badges
}

const BADGE_STYLES: Record<EvidenceBadge['type'], { bg: string; color: string; border: string }> = {
  pass: { bg: 'rgba(16,185,129,0.08)', color: '#10b981', border: 'rgba(16,185,129,0.2)' },
  warn: { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  fail: { bg: 'rgba(239,68,68,0.08)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
}

/* ── Contradiction detection (V7: inline alerts) ── */
function getContradictions(fact: AtomicFact): string[] {
  const alerts: string[] = []
  // V5: temporal conflicts
  const v5 = fact.v5_result as { temporal_status?: string; conflict_detail?: string } | null
  if (v5?.temporal_status === 'conflict' && v5.conflict_detail) alerts.push(v5.conflict_detail)
  // V2: cross-source inconsistency
  const v2 = fact.v2_result as { cross_validation?: string; is_minority?: boolean; majority_value?: string } | null
  if (v2?.is_minority && v2.majority_value) alerts.push(`此数据与多数来源不一致，多数来源显示: ${v2.majority_value}`)
  else if (v2?.cross_validation === 'inconsistent') alerts.push('多个来源报道不一致')
  // V3: numerical issues
  const v3 = fact.v3_result as { sanity?: string; reason?: string } | null
  if (v3?.sanity === 'likely_error' && v3.reason) alerts.push(v3.reason)
  // V4: chain mismatch
  const v4 = fact.v4_result as { anchor_status?: string; claimed_value?: number; actual_value?: number } | null
  if (v4?.anchor_status === 'mismatch' && v4.claimed_value != null && v4.actual_value != null) {
    alerts.push(`声称 ${v4.claimed_value.toLocaleString()} vs 链上实际 ${v4.actual_value.toLocaleString()}`)
  }
  return alerts
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

/* ── Pill label — objectivity-aware (Q33) ── */
function TypePill({ type, objectivity }: { type: string; objectivity?: string }) {
  // When objectivity is opinion/analysis, show that instead of fact_type
  const isSubjective = objectivity === 'opinion' || objectivity === 'analysis'
  // Legacy: quote type without objectivity → treat as opinion
  const isLegacyQuote = type === 'quote' && (!objectivity || objectivity === 'fact')

  if (isSubjective) {
    const label = OBJECTIVITY_LABELS[objectivity] ?? objectivity
    const color = objectivity === 'opinion' ? '#8b5cf6' : '#3b82f6'
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none"
        style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
        {label}
      </span>
    )
  }

  if (isLegacyQuote) {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none"
        style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}>
        观点
      </span>
    )
  }

  const label = FACT_TYPE_LABELS[type] ?? '其他'
  return (
    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none"
      style={{ background: 'var(--surface-alt)', color: 'var(--fg-secondary)', border: '1px solid var(--border)' }}>
      {label}
    </span>
  )
}

/* ── Confidence dot (Q21) ── */
function ConfidenceDot({ confidence }: { confidence: string | null }) {
  if (!confidence || !CONFIDENCE_COLORS[confidence]) return null
  return (
    <span className="inline-flex items-center gap-1" title={CONFIDENCE_LABELS[confidence] ?? ''}>
      <span className="w-[6px] h-[6px] rounded-full inline-block" style={{ background: CONFIDENCE_COLORS[confidence] }} />
      <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{CONFIDENCE_LABELS[confidence]}</span>
    </span>
  )
}

/* ── Determine if a fact is subjective (opinion/analysis/legacy quote) ── */
function isSubjectiveFact(fact: AtomicFact): boolean {
  if (fact.objectivity === 'opinion' || fact.objectivity === 'analysis') return true
  // Legacy: quote type without objectivity set
  if (fact.fact_type === 'quote' && (!fact.objectivity || fact.objectivity === 'fact')) return true
  return false
}

/* ── Get effective objectivity (handles legacy data) ── */
function getEffectiveObjectivity(fact: AtomicFact): 'fact' | 'opinion' | 'analysis' {
  if (fact.objectivity === 'opinion' || fact.objectivity === 'analysis') return fact.objectivity
  if (fact.fact_type === 'quote') return 'opinion' // legacy quote → opinion
  return 'fact'
}

/* ── Attribution bar for opinion/analysis (Q5) ── */
function AttributionBar({ fact }: { fact: AtomicFact }) {
  const effectiveObj = getEffectiveObjectivity(fact)
  if (effectiveObj === 'fact') return null

  const speaker = fact.speaker || extractSpeaker(fact.content_zh || fact.content_en).speaker
  const label = OBJECTIVITY_LABELS[effectiveObj] ?? effectiveObj
  const isOpinion = effectiveObj === 'opinion'

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-[12px]"
      style={{ background: isOpinion ? 'rgba(139, 92, 246, 0.08)' : 'rgba(59, 130, 246, 0.08)' }}>
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{
          background: isOpinion ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
          color: isOpinion ? '#8b5cf6' : '#3b82f6',
        }}>
        {label}
      </span>
      {speaker && (
        <span className="font-medium" style={{ color: isOpinion ? '#8b5cf6' : '#3b82f6' }}>
          {speaker}
        </span>
      )}
    </div>
  )
}

export function FactCard({ fact, compact = false }: { fact: AtomicFact; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const date = new Date(fact.fact_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  const displayContent = fact.content_zh || fact.content_en
  const sourceUrls = getSourceUrls(fact)
  const badges = getEvidenceBadges(fact)
  const contradictions = getContradictions(fact)
  const isSubjective = isSubjectiveFact(fact)

  // Separate pass/warn/fail badges
  const passBadges = badges.filter(b => b.type === 'pass')
  const warnBadges = badges.filter(b => b.type === 'warn' || b.type === 'fail')

  function toggleExpand() {
    setExpanded(e => !e)
  }

  /* ── Compact mode for timeline ── */
  if (compact && !expanded) {
    return (
      <div className="flex items-start gap-2 py-2 px-1 rounded-md cursor-pointer transition-colors hover:bg-[var(--surface-alt)]"
        onClick={toggleExpand}>
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <TypePill type={fact.fact_type} objectivity={fact.objectivity} />
        </div>
        <p className="text-[14px] leading-relaxed flex-1 min-w-0" style={{ color: 'var(--fg-body)' }}>{displayContent}</p>
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {warnBadges.length > 0 && (
            <span className="px-1 py-0.5 rounded text-[11px]"
              style={{ background: BADGE_STYLES[warnBadges[0].type].bg, color: BADGE_STYLES[warnBadges[0].type].color }}>
              {warnBadges[0].label}
            </span>
          )}
          {contradictions.length > 0 && (
            <span className="px-1 py-0.5 rounded text-[11px]" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
              矛盾
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
      style={{
        borderColor: expanded ? 'var(--border-hover)' : isSubjective ? (getEffectiveObjectivity(fact) === 'opinion' ? 'rgba(139,92,246,0.25)' : 'rgba(59,130,246,0.25)') : 'var(--border)',
        borderLeft: isSubjective ? `3px solid ${getEffectiveObjectivity(fact) === 'opinion' ? '#8b5cf6' : '#3b82f6'}` : undefined,
        background: isSubjective
          ? (getEffectiveObjectivity(fact) === 'opinion' ? 'rgba(139,92,246,0.04)' : 'rgba(59,130,246,0.04)')
          : 'var(--surface)',
      }}
    >
      {/* Q5: Attribution bar for opinion/analysis */}
      <AttributionBar fact={fact} />

      <div className="p-4">
        {/* Content area */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isSubjective ? (
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

        {/* V7: Evidence badges — shown in default state */}
        {badges.length > 0 && !isSubjective && (
          <div className="mt-2 flex flex-wrap gap-1">
            {badges.map((badge, i) => {
              const s = BADGE_STYLES[badge.type]
              return (
                <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px]"
                  style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                  title={badge.detail}>
                  {badge.icon} {badge.label}
                </span>
              )
            })}
          </div>
        )}

        {/* V7: Contradiction alerts — inline, always visible */}
        {contradictions.length > 0 && (
          <div className="mt-2 space-y-1">
            {contradictions.map((c, i) => (
              <div key={i} className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-md text-[12px]"
                style={{ background: 'rgba(239,68,68,0.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}>
                <span className="shrink-0 mt-px">⚠</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        )}

        {/* Default metadata: pill + source + date + confidence dot */}
        <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: 'var(--fg-muted)' }}>
          <TypePill type={fact.fact_type} objectivity={fact.objectivity} />
          {sourceUrls.length > 0 && (
            <a href={sourceUrls[0]} target="_blank" rel="noopener noreferrer"
              className="hover:underline" onClick={e => e.stopPropagation()}>
              {extractDomain(sourceUrls[0])}{sourceUrls.length > 1 && ` +${sourceUrls.length - 1}`}
            </a>
          )}
          <span>·</span>
          <time>{date}</time>
          <ConfidenceDot confidence={fact.confidence} />
        </div>

        {/* Expanded: verification details + all metadata */}
        <div ref={contentRef} className="overflow-hidden transition-all duration-150"
          style={{ maxHeight: expanded ? '2000px' : '0', opacity: expanded ? 1 : 0 }}>
          {expanded && (
            <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>

              {/* Source URLs (Q22: sources first) */}
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

              {/* Verification evidence details */}
              {badges.length > 0 && (
                <div>
                  <p className="text-[11px] tracking-wider uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>验证证据</p>
                  <div className="space-y-1.5">
                    {badges.map((badge, i) => {
                      const s = BADGE_STYLES[badge.type]
                      return (
                        <div key={i} className="flex items-center gap-2 text-[12px]">
                          <span className="w-4 text-center" style={{ color: s.color }}>{badge.icon}</span>
                          <span className="font-medium" style={{ color: s.color }}>{badge.label}</span>
                          <span style={{ color: 'var(--fg-muted)' }}>— {badge.detail}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tags */}
              {fact.tags.length > 0 && (
                <div>
                  <p className="text-[11px] tracking-wider uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>标签</p>
                  <div className="flex gap-1 flex-wrap">
                    {fact.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[11px]"
                        style={{ color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* English content if bilingual */}
              {fact.content_zh && fact.content_en && (
                <div>
                  <p className="text-[11px] tracking-wider uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>English</p>
                  <p className="text-[13px] italic" style={{ color: 'var(--fg-secondary)' }}>{fact.content_en}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
