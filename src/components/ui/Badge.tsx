import type { Confidence, VerificationStatus } from '@/lib/types'

const CONFIDENCE_STYLES: Record<string, { color: string; label: string }> = {
  high:   { color: 'var(--success)', label: '高可信' },
  medium: { color: 'var(--info)', label: '中可信' },
  low:    { color: 'var(--warning)', label: '低可信' },
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence | null }) {
  if (!confidence) return null
  const s = CONFIDENCE_STYLES[confidence]
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono"
      style={{ border: `1px solid var(--border)`, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

const STATUS_STYLES: Record<VerificationStatus, { color: string; label: string }> = {
  verified:             { color: 'var(--success)', label: '已验证' },
  partially_verified:   { color: 'var(--warning)', label: '部分验证' },
  pending_verification: { color: 'var(--fg-dim)', label: '待验证' },
  rejected:             { color: 'var(--danger)', label: '已拒绝' },
}

export function StatusBadge({ status }: { status: VerificationStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono"
      style={{ border: `1px solid var(--border)`, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

export function FactTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono"
      style={{ color: 'var(--fg-dim)', border: '1px solid var(--border)' }}>
      {type}
    </span>
  )
}
