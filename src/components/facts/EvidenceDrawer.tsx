'use client'

import { useEffect, useRef } from 'react'
import type { V1Result, V2Result, V3Result, V4Result, V5Result } from '@/lib/types'

interface EvidenceDrawerProps {
  isOpen: boolean
  onClose: () => void
  factContent: string
  v1: V1Result | null
  v2: V2Result | null
  v3: V3Result | null
  v4: V4Result | null
  v5: V5Result | null
}

function StatusBadge({ status, label }: { status: 'pass' | 'warn' | 'fail' | 'na'; label: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    pass: { bg: 'var(--success-soft)', color: 'var(--success)' },
    warn: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
    fail: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
    na: { bg: 'var(--surface-alt)', color: 'var(--fg-muted)' },
  }
  const s = styles[status]
  return (
    <span className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: s.bg, color: s.color }}>
      {label}
    </span>
  )
}

function Section({ title, status, statusLabel, children }: {
  title: string
  status: 'pass' | 'warn' | 'fail' | 'na'
  statusLabel: string
  children?: React.ReactNode
}) {
  return (
    <div className="py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium" style={{ color: 'var(--fg-body)' }}>{title}</span>
        <StatusBadge status={status} label={statusLabel} />
      </div>
      {children && <div className="text-[12px] space-y-1" style={{ color: 'var(--fg-secondary)' }}>{children}</div>}
    </div>
  )
}

export function EvidenceDrawer({ isOpen, onClose, factContent, v1, v2, v3, v4, v5 }: EvidenceDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Click outside
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          background: 'rgba(0,0,0,0.3)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 bottom-0 z-50 overflow-y-auto transition-transform duration-200"
        style={{
          width: 'min(420px, 100vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--fg-title)' }}>验证证据链</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--surface-hover)]" style={{ color: 'var(--fg-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Fact summary */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>{factContent}</p>
        </div>

        {/* V1: Source Traceback */}
        <div className="px-4">
          <Section
            title="来源回溯 (V1)"
            status={!v1 ? 'na' : v1.status === 'matched' ? 'pass' : v1.status === 'partial' ? 'warn' : v1.status === 'no_match' ? 'fail' : 'na'}
            statusLabel={!v1 ? '不适用' : v1.status === 'matched' ? '已匹配' : v1.status === 'partial' ? '部分匹配' : v1.status === 'no_match' ? '未匹配' : '来源不可达'}
          >
            {v1?.evidence_quote && (
              <p className="italic pl-2 border-l-2" style={{ borderColor: 'var(--border)' }}>
                &ldquo;{v1.evidence_quote}&rdquo;
              </p>
            )}
            {v1 && <p>匹配度: {v1.match_score}%</p>}
          </Section>

          {/* V2: Cross-source */}
          <Section
            title="多源交叉 (V2)"
            status={!v2 ? 'na' : v2.cross_validation === 'consistent' ? 'pass' : v2.cross_validation === 'partially_consistent' ? 'warn' : v2.cross_validation === 'inconsistent' ? 'fail' : 'na'}
            statusLabel={!v2 ? '不适用' : v2.cross_validation === 'consistent' ? '一致' : v2.cross_validation === 'partially_consistent' ? '部分一致' : v2.cross_validation === 'inconsistent' ? '不一致' : '单一来源'}
          >
            {v2 && v2.source_urls?.length > 0 && (
              <div className="space-y-1">
                {v2.source_urls.map((url, i) => (
                  <p key={i}>来源 {i + 1}: <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--info)' }}>{extractDomain(url)}</a></p>
                ))}
              </div>
            )}
            {v2?.is_minority && v2.majority_value && (
              <p className="mt-1" style={{ color: 'var(--danger)' }}>此数据属于少数观点，多数来源: {v2.majority_value}</p>
            )}
            {v2?.source_independence_note && <p>{v2.source_independence_note}</p>}
          </Section>

          {/* V3: Numerical Sanity */}
          <Section
            title="数值合理性 (V3)"
            status={!v3 || v3.sanity === 'not_applicable' ? 'na' : v3.sanity === 'normal' ? 'pass' : v3.sanity === 'anomaly' ? 'warn' : 'fail'}
            statusLabel={!v3 || v3.sanity === 'not_applicable' ? '不适用' : v3.sanity === 'normal' ? '正常' : v3.sanity === 'anomaly' ? '异常' : '可能有误'}
          >
            {v3?.reason && <p>{v3.reason}</p>}
            {v3?.historical_reference != null && <p>历史参考值: {v3.historical_reference.toLocaleString()}</p>}
          </Section>

          {/* V4: On-chain Anchor */}
          <Section
            title="链上锚定 (V4)"
            status={!v4 || v4.anchor_status === 'not_applicable' || v4.anchor_status === 'no_anchor_data' ? 'na' : v4.anchor_status === 'anchored' ? 'pass' : v4.anchor_status === 'deviation' ? 'warn' : 'fail'}
            statusLabel={!v4 || v4.anchor_status === 'not_applicable' || v4.anchor_status === 'no_anchor_data' ? '不适用' : v4.anchor_status === 'anchored' ? '已锚定' : v4.anchor_status === 'deviation' ? '有偏差' : '不匹配'}
          >
            {v4?.claimed_value != null && v4?.actual_value != null && (
              <div>
                <p>声称值: {v4.claimed_value.toLocaleString()}</p>
                <p>链上实际: {v4.actual_value.toLocaleString()}</p>
                {v4.deviation_pct != null && <p>偏差: {v4.deviation_pct.toFixed(1)}%</p>}
              </div>
            )}
          </Section>

          {/* V5: Temporal Consistency */}
          <Section
            title="时序一致性 (V5)"
            status={!v5 || v5.temporal_status === 'unchecked' ? 'na' : v5.temporal_status === 'consistent' ? 'pass' : 'fail'}
            statusLabel={!v5 || v5.temporal_status === 'unchecked' ? '不适用' : v5.temporal_status === 'consistent' ? '无矛盾' : '存在矛盾'}
          >
            {v5?.conflict_detail && <p style={{ color: 'var(--danger)' }}>{v5.conflict_detail}</p>}
          </Section>
        </div>
      </div>
    </>
  )
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
