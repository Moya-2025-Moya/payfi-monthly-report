'use client'

import type { AtomicFact } from '@/lib/types'

interface FactPulseProps {
  facts: AtomicFact[]
  compact?: boolean
}

function getSectorColor(tags: string[]): string {
  const tagStr = tags.join(' ').toLowerCase()
  if (tagStr.includes('发行') || tagStr.includes('usdc') || tagStr.includes('usdt') || tagStr.includes('stablecoin')) return '#2563eb'
  if (tagStr.includes('支付') || tagStr.includes('payment')) return '#16a34a'
  if (tagStr.includes('监管') || tagStr.includes('regul') || tagStr.includes('法案') || tagStr.includes('sec')) return '#d97706'
  if (tagStr.includes('defi') || tagStr.includes('tvl')) return '#8b5cf6'
  return '#6b7280'
}

export function FactPulse({ facts, compact }: FactPulseProps) {
  const maxBars = compact ? 40 : 80
  const barHeight = compact ? { high: 10, medium: 7, low: 5 } : { high: 16, medium: 12, low: 8 }

  return (
    <div className="flex items-end gap-[2px]" role="img" aria-label={`事实脉搏: ${facts.length} 条事实`} style={{ height: compact ? '14px' : '20px' }}>
      {facts.slice(0, maxBars).map((f) => {
        const color = getSectorColor(f.tags)
        const h = f.confidence === 'high' ? barHeight.high : f.confidence === 'medium' ? barHeight.medium : barHeight.low
        return (
          <div key={f.id} style={{
            width: compact ? '2px' : '3px',
            height: `${h}px`,
            borderRadius: '1px',
            background: color,
            opacity: 0.8,
          }} />
        )
      })}
    </div>
  )
}
