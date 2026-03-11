import type { Confidence, VerificationStatus } from '@/lib/types'

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  high:   { bg: '#dcfce7', text: '#166534', label: 'High', dot: '🟢' },
  medium: { bg: '#dbeafe', text: '#1e40af', label: 'Medium', dot: '🔵' },
  low:    { bg: '#fef9c3', text: '#854d0e', label: 'Low', dot: '🟡' },
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence | null }) {
  if (!confidence) return null
  const style = CONFIDENCE_STYLES[confidence]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: style.bg, color: style.text }}>
      {style.dot} {style.label}
    </span>
  )
}

const STATUS_STYLES: Record<VerificationStatus, { bg: string; text: string; label: string }> = {
  verified:             { bg: '#dcfce7', text: '#166534', label: 'Verified' },
  partially_verified:   { bg: '#fef9c3', text: '#854d0e', label: 'Partial' },
  pending_verification: { bg: '#f4f4f5', text: '#71717a', label: 'Pending' },
  rejected:             { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
}

export function StatusBadge({ status }: { status: VerificationStatus }) {
  const style = STATUS_STYLES[status]
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: style.bg, color: style.text }}>
      {style.label}
    </span>
  )
}

export function FactTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono"
      style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
      {type}
    </span>
  )
}
