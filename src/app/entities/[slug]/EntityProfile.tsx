'use client'

import type { WatchlistEntity } from '@/config/watchlist'
import type { AtomicFact } from '@/lib/types'
import { ContextCard } from '@/components/facts/ContextCard'
import { DepthControl } from '@/components/depth/DepthControl'
import Link from 'next/link'

const CATEGORY_LABELS: Record<string, string> = {
  stablecoin_issuer: '稳定币发行方',
  b2c_product: 'B2C 产品',
  b2b_infra: 'B2B 基础设施',
  tradfi: '传统金融',
  public_company: '上市公司',
  defi: 'DeFi',
  regulator: '监管机构',
}

interface EntityProfileProps {
  entity: WatchlistEntity
  facts: AtomicFact[]
  factsByWeek: Record<string, AtomicFact[]>
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

export function EntityProfile({ entity, facts, factsByWeek }: EntityProfileProps) {
  const weeks = Object.keys(factsByWeek).sort().reverse()

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/entities" className="text-[12px] hover:underline" style={{ color: 'var(--accent)' }}>
        ← 实体目录
      </Link>

      {/* Entity header */}
      <div className="rounded-lg border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--fg-title)' }}>{entity.name}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
            {CATEGORY_LABELS[entity.category] ?? entity.category}
          </span>
          {entity.aliases.length > 0 && (
            <span className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
              别名: {entity.aliases.join(', ')}
            </span>
          )}
          {entity.website && (
            <a href={entity.website} target="_blank" rel="noopener noreferrer"
              className="text-[12px] hover:underline" style={{ color: 'var(--info)' }}>
              {safeHostname(entity.website)}
            </a>
          )}
        </div>
        <p className="text-[13px] mt-2" style={{ color: 'var(--fg-secondary)' }}>
          {facts.length} 条相关事实 · {weeks.length} 周数据
        </p>
      </div>

      {/* Depth Control */}
      <div className="sticky z-20 py-2" style={{ top: 'var(--topbar-h)', background: 'var(--bg)' }}>
        <DepthControl />
      </div>

      {/* Facts by week */}
      {weeks.length === 0 ? (
        <p className="text-[13px] py-8 text-center" style={{ color: 'var(--fg-muted)' }}>暂无相关事实</p>
      ) : (
        <div className="space-y-6">
          {weeks.map(week => (
            <div key={week}>
              <h2 className="text-[12px] font-mono font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>
                {week} ({factsByWeek[week].length} 条)
              </h2>
              <div className="space-y-2">
                {factsByWeek[week].map(f => (
                  <ContextCard key={f.id} fact={f} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
