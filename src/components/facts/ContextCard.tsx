'use client'

import { useState, useCallback } from 'react'
import type { AtomicFact } from '@/lib/types'
import { TrustSpine } from './TrustSpine'
import { EvidenceDrawer } from './EvidenceDrawer'
import { useDepth } from '@/components/depth/DepthProvider'
import { useFocusLens } from '@/components/focus/FocusLensProvider'
import { EntityTag } from '@/components/focus/EntityTag'

/* ── Constants ── */
const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'var(--success)', medium: 'var(--warning)', low: 'var(--danger)',
}
const CONFIDENCE_LABELS: Record<string, string> = {
  high: '高', medium: '中', low: '低',
}

/* ── Sector colors for FactPulse integration ── */
export const SECTOR_COLORS: Record<string, string> = {
  issuance: '#2563eb',
  payments: '#16a34a',
  regulatory: '#d97706',
  defi: '#8b5cf6',
  infrastructure: '#6b7280',
  capital_markets: '#ec4899',
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

/* ── V1-V5 inline summary for depth 2 ── */
function VerificationSummary({ fact }: { fact: AtomicFact }) {
  const items: { label: string; value: string; color: string }[] = []
  const v1 = fact.v1_result as { status?: string; match_score?: number } | null
  if (v1?.status === 'matched') items.push({ label: 'V1', value: '匹配', color: 'var(--success)' })
  else if (v1?.status === 'partial') items.push({ label: 'V1', value: '部分', color: 'var(--warning)' })

  const v2 = fact.v2_result as { source_count?: number; cross_validation?: string } | null
  if (v2?.cross_validation === 'consistent') items.push({ label: 'V2', value: `${v2.source_count}源一致`, color: 'var(--success)' })
  else if (v2?.cross_validation === 'inconsistent') items.push({ label: 'V2', value: '不一致', color: 'var(--danger)' })

  const v3 = fact.v3_result as { sanity?: string } | null
  if (v3?.sanity === 'anomaly') items.push({ label: 'V3', value: '异常', color: 'var(--warning)' })
  else if (v3?.sanity === 'likely_error') items.push({ label: 'V3', value: '可疑', color: 'var(--danger)' })

  const v4 = fact.v4_result as { anchor_status?: string } | null
  if (v4?.anchor_status === 'anchored') items.push({ label: 'V4', value: '锚定', color: 'var(--success)' })
  else if (v4?.anchor_status === 'mismatch') items.push({ label: 'V4', value: '不符', color: 'var(--danger)' })

  const v5 = fact.v5_result as { temporal_status?: string } | null
  if (v5?.temporal_status === 'consistent') items.push({ label: 'V5', value: '无矛盾', color: 'var(--success)' })
  else if (v5?.temporal_status === 'conflict') items.push({ label: 'V5', value: '矛盾', color: 'var(--danger)' })

  if (items.length === 0) return null

  // Derive reason for non-high confidence
  const confidence = fact.confidence ?? 'high'
  const reasons: string[] = []
  if (confidence !== 'high') {
    if (v1?.status === 'partial') reasons.push('原文仅部分匹配')
    if (v1?.status !== 'matched' && v1?.status !== 'partial') reasons.push('无原文匹配')
    if (v2?.cross_validation === 'inconsistent') reasons.push('多源不一致')
    if (!v2?.source_count || v2.source_count < 2) reasons.push('仅单一来源')
    if (v3?.sanity === 'anomaly') reasons.push('数据异常')
    if (v3?.sanity === 'likely_error') reasons.push('疑似错误')
    if (v4?.anchor_status === 'mismatch') reasons.push('锚定数据不符')
    if (v5?.temporal_status === 'conflict') reasons.push('时序矛盾')
    if (reasons.length === 0) reasons.push('综合评分未达高置信阈值')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded"
          style={{ background: `color-mix(in srgb, ${item.color} 10%, transparent)`, color: item.color }}>
          [{item.label}:{item.value}]
        </span>
      ))}
      {/* 高置信度不显示标签；中/低显示原因 */}
      {confidence !== 'high' && (
        <span className="text-[11px]" style={{ color: CONFIDENCE_COLORS[confidence] }}>
          置信度:{CONFIDENCE_LABELS[confidence]}
          <span className="ml-1" style={{ color: 'var(--fg-muted)' }}>
            ({reasons.join('、')})
          </span>
        </span>
      )}
    </div>
  )
}

/* ── Evidence detail for depth 3 ── */
function EvidenceDetail({ fact }: { fact: AtomicFact }) {
  const v1 = fact.v1_result as { evidence_quote?: string; match_score?: number; status?: string } | null
  const v2 = fact.v2_result as { source_urls?: string[]; source_count?: number; independent_sources?: boolean } | null

  return (
    <div className="text-[12px] space-y-1.5" style={{ color: 'var(--fg-secondary)' }}>
      {v1?.evidence_quote && (
        <p>V1 原始引述: <span className="italic">&ldquo;{v1.evidence_quote}&rdquo;</span></p>
      )}
      {v2?.source_urls && v2.source_urls.length > 0 && (
        <p>V2 来源: {v2.source_urls.map(u => extractDomain(u)).join(', ')}
          {v2.independent_sources ? ' (独立确认)' : ''}
        </p>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   ContextCard — 事实-上下文对 + Trust Spine + depth layers
   ════════════════════════════════════════════════════════════ */

interface ContextCardProps {
  fact: AtomicFact
  context?: string[]
  focusClassName?: string
}

export function ContextCard({ fact, context, focusClassName }: ContextCardProps) {
  const { depth } = useDepth()
  const { focusedEntity, focusedEntityFacts } = useFocusLens()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const displayContent = fact.content_zh || fact.content_en
  const date = new Date(fact.fact_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  const sourceUrls = getSourceUrls(fact)

  // Focus lens: determine if this card is highlighted, receded, or neutral
  const focusCls = focusedEntity
    ? (focusedEntityFacts.has(fact.id) || fact.tags?.some(t => t.toLowerCase() === focusedEntity.toLowerCase())
        ? 'focus-highlighted'
        : 'focus-receded')
    : ''

  return (
    <>
      <div
        className={`card-elevated transition-all duration-300 ${focusClassName || ''} ${focusCls}`}
        data-depth={depth}
      >
        {/* ── Upper half: Fact ── */}
        <div className="flex gap-2 px-3 py-2.5">
          {/* Trust Spine (depth >= 2) */}
          {depth >= 2 && (
            <div className="depth-layer-2">
              <TrustSpine
                v1={fact.v1_result}
                v2={fact.v2_result}
                v3={fact.v3_result}
                v4={fact.v4_result}
                v5={fact.v5_result}
                onOpenEvidence={openDrawer}
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Fact text + date + source */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-[14px] leading-relaxed flex-1" style={{ color: 'var(--fg-body)' }}>
                {displayContent}
              </p>
              <div className="flex items-center gap-2 shrink-0 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                {sourceUrls.length > 0 && (
                  <a href={sourceUrls[0]} target="_blank" rel="noopener noreferrer" className="hover:underline hidden sm:inline">
                    {extractDomain(sourceUrls[0])}
                  </a>
                )}
                <time>{date}</time>
              </div>
            </div>

            {/* Tags */}
            {fact.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {fact.tags.map(tag => (
                  <EntityTag key={tag} name={tag} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Lower half: Context (depth >= 1) ── */}
        {context && context.length > 0 && (
          <div className="depth-layer-1">
            <div className="px-3 pb-2.5 pt-0">
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="pl-2 py-1.5 rounded" style={{ background: 'rgba(5,150,105,0.04)' }}>
                  <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: '#059669' }}>历史可比</p>
                  {context.map((c, i) => (
                    <p key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                      · {c}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Verification summary (depth >= 2) ── */}
        <div className="depth-layer-2">
          <div className="px-3 pb-2">
            <VerificationSummary fact={fact} />
          </div>
        </div>

        {/* ── Evidence detail (depth >= 3) ── */}
        <div className="depth-layer-3">
          <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
            <EvidenceDetail fact={fact} />
          </div>
        </div>
      </div>

      {/* Evidence Drawer */}
      <EvidenceDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        factContent={displayContent}
        v1={fact.v1_result}
        v2={fact.v2_result}
        v3={fact.v3_result}
        v4={fact.v4_result}
        v5={fact.v5_result}
      />
    </>
  )
}
