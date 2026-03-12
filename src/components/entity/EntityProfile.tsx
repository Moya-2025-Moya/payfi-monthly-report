import { FactList } from '@/components/facts/FactList'
import type { Entity, AtomicFact } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  stablecoin_issuer: '稳定币发行方', b2c_product: 'B2C 产品', b2b_infra: 'B2B 基础设施',
  tradfi: '传统金融', public_company: '上市公司', defi: 'DeFi', regulator: '监管机构',
}

const FACT_TYPE_ZH: Record<string, string> = {
  event: '事件', metric: '指标', quote: '引述', relationship: '关系', status_change: '状态变更',
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <span className="text-lg font-semibold font-mono" style={{ color: 'var(--fg-title)' }}>{value}</span>
      <span className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--fg-faint)' }}>{label}</span>
    </div>
  )
}

export function EntityProfile({ entity, facts }: { entity: Entity; facts: AtomicFact[] }) {
  const desc = entity.description_zh || entity.description_en

  // Compute stats
  const factTypeCounts = new Map<string, number>()
  let latestDate = ''
  for (const f of facts) {
    factTypeCounts.set(f.fact_type, (factTypeCounts.get(f.fact_type) ?? 0) + 1)
    const fd = String(f.fact_date)
    if (fd > latestDate) latestDate = fd
  }

  const metricFacts = facts.filter(f => f.fact_type === 'metric' && f.metric_value != null)

  return (
    <div className="space-y-6">
      {/* Overview card */}
      <div className="rounded-lg border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--fg-title)' }}>{entity.name}</h1>
            <p className="text-[12px] font-mono mt-1" style={{ color: 'var(--fg-faint)' }}>
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
          <StatBox label="指标数据" value={metricFacts.length} />
          <StatBox label="事实类型" value={factTypeCounts.size} />
          <StatBox
            label="最新动态"
            value={latestDate ? new Date(latestDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '--'}
          />
        </div>

        {/* Fact type breakdown */}
        {factTypeCounts.size > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {[...factTypeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <span key={type} className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
                {FACT_TYPE_ZH[type] ?? type} ({count})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Key metrics */}
      {metricFacts.length > 0 && (
        <div>
          <p className="text-[10px] font-mono tracking-wider mb-3" style={{ color: 'var(--fg-faint)' }}>
            关键指标
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {metricFacts.slice(0, 6).map(f => (
              <div key={f.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-[11px] font-mono mb-1" style={{ color: 'var(--fg-dim)' }}>{f.metric_name}</p>
                <p className="text-[15px] font-semibold font-mono" style={{ color: 'var(--fg-title)' }}>
                  {f.metric_value?.toLocaleString()} {f.metric_unit}
                </p>
                {f.metric_change && (
                  <span className="text-[11px] font-mono" style={{ color: 'var(--accent)' }}>{f.metric_change}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related facts */}
      <div>
        <p className="text-[10px] font-mono tracking-wider mb-3" style={{ color: 'var(--fg-faint)' }}>
          相关事实 ({facts.length})
        </p>
        <FactList facts={facts} />
      </div>
    </div>
  )
}
