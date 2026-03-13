'use client'

import { useState } from 'react'
import type { V1Result, V2Result, V3Result, V4Result, V5Result } from '@/lib/types'

interface TrustSpineProps {
  v1: V1Result | null
  v2: V2Result | null
  v3: V3Result | null
  v4: V4Result | null
  v5: V5Result | null
  onOpenEvidence?: () => void
}

type DotStatus = 'pass' | 'warn' | 'fail' | 'na'

interface DotInfo {
  label: string
  status: DotStatus
  detail: string
}

function getDotColor(status: DotStatus): string {
  switch (status) {
    case 'pass': return 'var(--success)'
    case 'warn': return 'var(--warning)'
    case 'fail': return 'var(--danger)'
    case 'na': return 'var(--fg-muted)'
  }
}

function getV1Dot(v1: V1Result | null): DotInfo {
  if (!v1) return { label: 'V1 来源回溯', status: 'na', detail: '不适用' }
  if (v1.status === 'matched') return { label: 'V1 来源回溯', status: 'pass', detail: `已匹配原文 (${v1.match_score}%)` }
  if (v1.status === 'partial') return { label: 'V1 来源回溯', status: 'warn', detail: `部分匹配 (${v1.match_score}%)` }
  if (v1.status === 'no_match' || v1.status === 'source_unavailable') return { label: 'V1 来源回溯', status: 'fail', detail: v1.status === 'no_match' ? '未匹配' : '来源不可达' }
  return { label: 'V1 来源回溯', status: 'na', detail: '不适用' }
}

function getV2Dot(v2: V2Result | null): DotInfo {
  if (!v2) return { label: 'V2 多源交叉', status: 'na', detail: '不适用' }
  if (v2.cross_validation === 'consistent') return { label: 'V2 多源交叉', status: 'pass', detail: `${v2.source_count} 个独立来源一致` }
  if (v2.cross_validation === 'partially_consistent') return { label: 'V2 多源交叉', status: 'warn', detail: '部分来源一致' }
  if (v2.cross_validation === 'inconsistent') return { label: 'V2 多源交叉', status: 'fail', detail: '来源不一致' }
  if (v2.cross_validation === 'single_source') return { label: 'V2 多源交叉', status: 'na', detail: '单一来源' }
  return { label: 'V2 多源交叉', status: 'na', detail: '不适用' }
}

function getV3Dot(v3: V3Result | null): DotInfo {
  if (!v3 || v3.sanity === 'not_applicable') return { label: 'V3 数值合理性', status: 'na', detail: '不适用' }
  if (v3.sanity === 'normal') return { label: 'V3 数值合理性', status: 'pass', detail: '数值正常' }
  if (v3.sanity === 'anomaly') return { label: 'V3 数值合理性', status: 'warn', detail: v3.reason || '数值异常' }
  if (v3.sanity === 'likely_error') return { label: 'V3 数值合理性', status: 'fail', detail: v3.reason || '数值可能有误' }
  return { label: 'V3 数值合理性', status: 'na', detail: '不适用' }
}

function getV4Dot(v4: V4Result | null): DotInfo {
  if (!v4 || v4.anchor_status === 'not_applicable' || v4.anchor_status === 'no_anchor_data') return { label: 'V4 链上锚定', status: 'na', detail: '不适用' }
  if (v4.anchor_status === 'anchored') return { label: 'V4 链上锚定', status: 'pass', detail: '链上数据匹配' }
  if (v4.anchor_status === 'deviation') return { label: 'V4 链上锚定', status: 'warn', detail: `偏差 ${v4.deviation_pct?.toFixed(1)}%` }
  if (v4.anchor_status === 'mismatch') return { label: 'V4 链上锚定', status: 'fail', detail: '链上数据不匹配' }
  return { label: 'V4 链上锚定', status: 'na', detail: '不适用' }
}

function getV5Dot(v5: V5Result | null): DotInfo {
  if (!v5 || v5.temporal_status === 'unchecked') return { label: 'V5 时序一致性', status: 'na', detail: '不适用' }
  if (v5.temporal_status === 'consistent') return { label: 'V5 时序一致性', status: 'pass', detail: '无矛盾' }
  if (v5.temporal_status === 'conflict') return { label: 'V5 时序一致性', status: 'fail', detail: v5.conflict_detail || '存在时序矛盾' }
  return { label: 'V5 时序一致性', status: 'na', detail: '不适用' }
}

export function TrustSpine({ v1, v2, v3, v4, v5, onOpenEvidence }: TrustSpineProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const dots: DotInfo[] = [
    getV1Dot(v1),
    getV2Dot(v2),
    getV3Dot(v3),
    getV4Dot(v4),
    getV5Dot(v5),
  ]

  return (
    <button
      type="button"
      className="flex flex-col items-center gap-[3px] shrink-0 cursor-pointer relative bg-transparent border-0 p-0"
      style={{ width: '14px', paddingTop: '2px' }}
      onClick={onOpenEvidence}
      aria-label="查看验证证据链"
    >
      {dots.map((dot, i) => (
        <div
          key={dot.label}
          className="relative"
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden="true">
            {dot.status === 'na' ? (
              <circle cx="3" cy="3" r="2.5" fill="none" stroke={getDotColor(dot.status)} strokeWidth="1" />
            ) : (
              <circle cx="3" cy="3" r="3" fill={getDotColor(dot.status)} />
            )}
          </svg>
          {/* Hover tooltip */}
          {hoveredIdx === i && (
            <div
              role="tooltip"
              className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap z-50 px-2 py-1 rounded text-[11px] shadow-md"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-secondary)' }}
            >
              {dot.label}: {dot.detail}
            </div>
          )}
        </div>
      ))}
    </button>
  )
}
