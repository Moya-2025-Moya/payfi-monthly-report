'use client'

import { FactPulse } from './FactPulse'
import type { AtomicFact } from '@/lib/types'

interface BriefingStripProps {
  facts: AtomicFact[]
  oneLiner: string
  marketLine?: string
  rejectedCount?: number
  contradictionCount?: number
}

export function BriefingStrip({ facts, oneLiner, marketLine, rejectedCount = 0, contradictionCount = 0 }: BriefingStripProps) {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Fact Pulse bar */}
      {facts.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          <FactPulse facts={facts} />
          <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>
            {facts.length} verified{rejectedCount > 0 ? ` / ${rejectedCount} rejected` : ''}
            {contradictionCount > 0 ? ` / ${contradictionCount} contradictions` : ''}
          </p>
        </div>
      )}

      {/* Market line + One-liner */}
      <div className="px-4 py-3">
        {marketLine && (
          <p className="text-[13px] font-mono mb-2" style={{ color: 'var(--fg-muted)' }}>
            {marketLine}
          </p>
        )}
        {oneLiner && (
          <p className="text-[20px] font-bold leading-snug" style={{ color: 'var(--fg-title)' }}>
            {oneLiner}
          </p>
        )}
      </div>
    </div>
  )
}
