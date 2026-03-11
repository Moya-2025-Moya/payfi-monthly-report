import type { VerificationStatus } from '@/lib/types'

// ─── 信息源数量标记 ───

export function SourceCountBadge({ count, onClick }: { count: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors hover:opacity-80"
      style={{ border: '1px solid var(--border)', color: count >= 2 ? 'var(--success)' : 'var(--fg-muted)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: count >= 2 ? 'var(--success)' : 'var(--fg-faint)' }} />
      {count} 个信息源
    </button>
  )
}

// ─── 验证状态（内部/详情页用）───

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

// Keep for backward compat in FactDetail etc but not used in main views
export function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null
  const styles: Record<string, { color: string; label: string }> = {
    high:   { color: 'var(--success)', label: '高可信' },
    medium: { color: 'var(--info)', label: '中可信' },
    low:    { color: 'var(--warning)', label: '低可信' },
  }
  const s = styles[confidence] ?? { color: 'var(--fg-faint)', label: confidence }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono"
      style={{ border: `1px solid var(--border)`, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}
