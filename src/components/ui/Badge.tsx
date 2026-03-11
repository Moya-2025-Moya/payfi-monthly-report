import type { Confidence, VerificationStatus } from '@/lib/types'

const CONFIDENCE_STYLES: Record<string, { border: string; text: string; label: string; dot: string }> = {
  high:   { border: '#00cc88', text: '#00cc88', label: 'High', dot: '#00cc88' },
  medium: { border: '#4488ff', text: '#4488ff', label: 'Medium', dot: '#4488ff' },
  low:    { border: '#ffaa00', text: '#ffaa00', label: 'Low', dot: '#ffaa00' },
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence | null }) {
  if (!confidence) return null
  const s = CONFIDENCE_STYLES[confidence]
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono"
      style={{ border: `1px solid ${s.border}33`, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

const STATUS_STYLES: Record<VerificationStatus, { color: string; label: string }> = {
  verified:             { color: '#00cc88', label: 'Verified' },
  partially_verified:   { color: '#ffaa00', label: 'Partial' },
  pending_verification: { color: '#555', label: 'Pending' },
  rejected:             { color: '#ff4444', label: 'Rejected' },
}

export function StatusBadge({ status }: { status: VerificationStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono"
      style={{ border: `1px solid ${s.color}33`, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

export function FactTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono"
      style={{ color: '#555', border: '1px solid #1a1a1a' }}>
      {type}
    </span>
  )
}
