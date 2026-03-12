'use client'

import { FactList } from '@/components/facts/FactList'
import type { Entity, AtomicFact } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  stablecoin_issuer: '稳定币发行方', b2c_product: 'B2C 产品', b2b_infra: 'B2B 基础设施',
  tradfi: '传统金融', public_company: '上市公司', defi: 'DeFi', regulator: '监管机构',
}

function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <span className="text-[15px] font-semibold font-mono" style={{ color: 'var(--fg-title)' }}>{value}</span>
      <span className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--fg-faint)' }}>{label}</span>
    </div>
  )
}

/* Mini sparkline for grouped metrics */
function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const h = 24
  const w = 60
  const step = w / (values.length - 1)
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function EntityProfile({ entity, facts }: { entity: Entity; facts: AtomicFact[] }) {
  const desc = entity.description_zh || entity.description_en

  // Compute stats
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const newThisWeek = facts.filter(f => new Date(f.fact_date) >= weekAgo).length
  const highConfCount = facts.filter(f => f.confidence === 'high').length
  const highPct = facts.length > 0 ? Math.round((highConfCount / facts.length) * 100) : 0
  const latestFact = facts.length > 0 ? facts[0] : null // already sorted desc by fact_date
  const latestTitle = latestFact
    ? (latestFact.content_zh || latestFact.content_en).slice(0, 20) + ((latestFact.content_zh || latestFact.content_en).length > 20 ? '...' : '')
    : '--'

  // Group metrics by metric_name for sparklines
  const metricGroups = new Map<string, { values: number[]; unit: string; latest: AtomicFact }>()
  for (const f of facts) {
    if (f.fact_type === 'metric' && f.metric_name && f.metric_value != null) {
      const existing = metricGroups.get(f.metric_name)
      if (existing) {
        existing.values.push(f.metric_value)
        if (new Date(f.fact_date) > new Date(existing.latest.fact_date)) existing.latest = f
      } else {
        metricGroups.set(f.metric_name, { values: [f.metric_value], unit: f.metric_unit ?? '', latest: f })
      }
    }
  }

  const SPARKLINE_COLORS = ['var(--info)', 'var(--success)', '#8b5cf6', '#06b6d4', 'var(--warning)']

  return (
    <div className="space-y-6">
      {/* Overview card */}
      <div className="rounded-lg border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-[24px] font-semibold" style={{ color: 'var(--fg-title)' }}>{entity.name}</h1>
            <p className="text-[13px] font-mono mt-1" style={{ color: 'var(--fg-faint)' }}>
              {CATEGORY_LABELS[entity.category] ?? entity.category}
              {entity.aliases.length > 0 && ` · ${entity.aliases.join(', ')}`}
            </p>
          </div>
          {entity.website && (
            <a href={entity.website} target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-mono shrink-0 px-2 py-1 rounded border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
              官网 ↗
            </a>
          )}
        </div>
        {desc && <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--fg-body)' }}>{desc}</p>}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatBox label="总事实" value={facts.length} />
          <StatBox label="本周新增" value={newThisWeek} />
          <StatBox label="高可信占比" value={`${highPct}%`} />
          <StatBox label="最新动态" value={
            <span className="text-[13px] font-normal truncate max-w-[120px] block text-center" style={{ color: 'var(--fg-body)' }}>
              {latestTitle}
            </span>
          } />
        </div>
      </div>

      {/* Key metrics with sparklines */}
      {metricGroups.size > 0 && (
        <div>
          <p className="text-[11px] font-mono tracking-wider mb-3" style={{ color: 'var(--fg-faint)' }}>
            关键指标
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[...metricGroups.entries()].slice(0, 8).map(([name, group], idx) => (
              <div key={name} className="rounded-lg border p-3 flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="min-w-0">
                  <p className="text-[11px] font-mono mb-1 truncate" style={{ color: 'var(--fg-dim)' }}>{name}</p>
                  <p className="text-[15px] font-semibold font-mono" style={{ color: 'var(--fg-title)' }}>
                    {group.latest.metric_value?.toLocaleString()} {group.unit}
                  </p>
                  {group.latest.metric_change && (
                    <span className="text-[11px] font-mono" style={{ color: 'var(--info)' }}>{group.latest.metric_change}</span>
                  )}
                </div>
                <MiniSparkline values={[...group.values].reverse()} color={SPARKLINE_COLORS[idx % SPARKLINE_COLORS.length]} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related facts */}
      <div>
        <p className="text-[11px] font-mono tracking-wider mb-3" style={{ color: 'var(--fg-faint)' }}>
          相关事实 ({facts.length})
        </p>
        <FactList facts={facts} />
      </div>
    </div>
  )
}
