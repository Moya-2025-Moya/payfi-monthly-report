import type { V1Result, V2Result, V3Result, V4Result, V5Result } from '@/lib/types'

interface Props {
  v1: V1Result | null
  v2: V2Result | null
  v3: V3Result | null
  v4: V4Result | null
  v5: V5Result | null
}

type BadgeType = 'pass' | 'warn' | 'fail' | 'neutral'

const BADGE_COLORS: Record<BadgeType, { bg: string; color: string; border: string }> = {
  pass: { bg: 'rgba(16,185,129,0.08)', color: '#10b981', border: 'rgba(16,185,129,0.2)' },
  warn: { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  fail: { bg: 'rgba(239,68,68,0.08)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
  neutral: { bg: 'var(--surface-alt)', color: 'var(--fg-muted)', border: 'var(--border)' },
}

function getBadgeType(status: string): BadgeType {
  if (['matched', 'anchored', 'consistent', 'normal'].includes(status)) return 'pass'
  if (['source_unavailable', 'not_applicable', 'unchecked', 'single_source', 'no_anchor_data'].includes(status)) return 'neutral'
  if (['partial', 'deviation', 'partially_consistent', 'anomaly'].includes(status)) return 'warn'
  return 'fail'
}

const ICONS: Record<BadgeType, string> = { pass: '✓', warn: '~', fail: '!', neutral: '·' }

function Row({ label, status, detail }: { label: string; status: string; detail?: string | null }) {
  const type = getBadgeType(status)
  const colors = BADGE_COLORS[type]
  const icon = ICONS[type]

  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-[11px] font-mono w-6 shrink-0" style={{ color: 'var(--fg-muted)' }}>{label}</span>
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium shrink-0"
        style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}>
        {icon} {status}
      </span>
      {detail && <span className="text-[11px] flex-1" style={{ color: 'var(--fg-muted)' }}>{detail}</span>}
    </div>
  )
}

export function VerificationDetail({ v1, v2, v3, v4, v5 }: Props) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <p className="text-[11px] font-mono tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>验证证据</p>
      {v1 && <Row label="V1" status={v1.status} detail={v1.evidence_quote ? `"${v1.evidence_quote.slice(0, 120)}..."` : undefined} />}
      {v2 && <Row label="V2" status={v2.cross_validation} detail={v2.independent_sources ? `${v2.source_count} 个独立来源` : v2.source_independence_note} />}
      {v3 && <Row label="V3" status={v3.sanity} detail={v3.reason} />}
      {v4 && <Row label="V4" status={v4.anchor_status} detail={v4.deviation_pct != null ? `偏差 ${v4.deviation_pct.toFixed(1)}%` : undefined} />}
      {v5 && <Row label="V5" status={v5.temporal_status} detail={v5.conflict_detail} />}
    </div>
  )
}
