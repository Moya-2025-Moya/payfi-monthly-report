import type { V1Result, V2Result, V3Result, V4Result, V5Result } from '@/lib/types'

interface Props {
  v1: V1Result | null
  v2: V2Result | null
  v3: V3Result | null
  v4: V4Result | null
  v5: V5Result | null
}

function Row({ label, status, detail }: { label: string; status: string; detail?: string | null }) {
  const color = status.includes('match') || status === 'anchored' || status === 'consistent' || status === 'normal'
    ? 'var(--success)'
    : status.includes('unavailable') || status.includes('not_applicable') || status === 'unchecked' || status === 'single_source'
    ? 'var(--muted-fg)'
    : 'var(--warning)'
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-xs font-mono w-6 shrink-0" style={{ color: 'var(--muted-fg)' }}>{label}</span>
      <span className="text-xs font-medium w-32 shrink-0" style={{ color }}>{status}</span>
      {detail && <span className="text-xs flex-1" style={{ color: 'var(--muted-fg)' }}>{detail}</span>}
    </div>
  )
}

export function VerificationDetail({ v1, v2, v3, v4, v5 }: Props) {
  return (
    <div className="rounded-md border p-3" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
      <p className="text-xs font-semibold mb-2">Verification Details</p>
      {v1 && <Row label="V1" status={v1.status} detail={v1.evidence_quote ? `"${v1.evidence_quote.slice(0, 120)}..."` : undefined} />}
      {v2 && <Row label="V2" status={v2.cross_validation} detail={v2.independent_sources ? `${v2.source_count} independent sources` : v2.source_independence_note} />}
      {v3 && <Row label="V3" status={v3.sanity} detail={v3.reason} />}
      {v4 && <Row label="V4" status={v4.anchor_status} detail={v4.deviation_pct != null ? `Deviation: ${v4.deviation_pct.toFixed(1)}%` : undefined} />}
      {v5 && <Row label="V5" status={v5.temporal_status} detail={v5.conflict_detail} />}
    </div>
  )
}
