'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { FactCard } from '@/components/facts/FactCard'
import type { Entity, AtomicFact, EntityRelationship } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  stablecoin_issuer: '稳定币发行方', b2c_product: 'B2C 产品', b2b_infra: 'B2B 基础设施',
  tradfi: '传统金融', public_company: '上市公司', defi: 'DeFi', regulator: '监管机构',
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  investment: '投资', partnership: '合作', competition: '竞争',
  dependency: '依赖', acquisition: '收购', issuance: '发行',
}

const CHART_COLORS = ['var(--info)', 'var(--success)', '#8b5cf6', '#06b6d4', 'var(--warning)']

/* ── Section heading ── */
function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <p className="text-[11px] font-mono tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>
      {children}{count != null && ` (${count})`}
    </p>
  )
}

/* ── Stat box ── */
function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <span className="text-[15px] font-semibold font-mono" style={{ color: 'var(--fg-title)' }}>{value}</span>
      <span className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</span>
    </div>
  )
}

/* ── Generate AI summary from facts ── */
function generateSummary(entity: Entity, facts: AtomicFact[]): string {
  if (facts.length === 0) return `${entity.name} 暂无近期动态数据。`

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentFacts = facts.filter(f => new Date(f.fact_date) >= weekAgo)
  const metricFacts = facts.filter(f => f.fact_type === 'metric' && f.metric_value != null)
  const eventFacts = facts.filter(f => f.fact_type === 'event')
  const opinionFacts = facts.filter(f => f.objectivity === 'opinion' || f.objectivity === 'analysis')

  const parts: string[] = []

  // Opening line
  if (recentFacts.length > 0) {
    parts.push(`近一周 ${entity.name} 有 ${recentFacts.length} 条新动态`)
  } else {
    parts.push(`${entity.name} 近期共收录 ${facts.length} 条事实`)
  }

  // Key metrics
  if (metricFacts.length > 0) {
    const metricNames = [...new Set(metricFacts.map(f => f.metric_name).filter(Boolean))]
    if (metricNames.length > 0) {
      parts.push(`追踪指标包括 ${metricNames.slice(0, 3).join('、')}${metricNames.length > 3 ? ' 等' : ''}`)
    }
    const withChange = metricFacts.filter(f => f.metric_change)
    if (withChange.length > 0) {
      const latest = withChange[0]
      parts.push(`${latest.metric_name} 最新变动 ${latest.metric_change}`)
    }
  }

  // Key events
  if (eventFacts.length > 0) {
    const latestEvent = eventFacts[0]
    const content = (latestEvent.content_zh || latestEvent.content_en).slice(0, 60)
    parts.push(`最新事件: ${content}${(latestEvent.content_zh || latestEvent.content_en).length > 60 ? '...' : ''}`)
  }

  // Market opinions
  if (opinionFacts.length > 0) {
    parts.push(`市场上有 ${opinionFacts.length} 条相关观点/分析`)
  }

  return parts.join('。') + '。'
}

/* ── Metric chart data preparation ── */
interface MetricGroup {
  name: string
  unit: string
  dataPoints: { date: string; value: number; sortKey: number }[]
  latestValue: number
  latestChange: string | null
}

function buildMetricGroups(facts: AtomicFact[]): MetricGroup[] {
  const groups = new Map<string, MetricGroup>()

  for (const f of facts) {
    if (f.fact_type !== 'metric' || !f.metric_name || f.metric_value == null) continue

    const d = new Date(f.fact_date)
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
    const sortKey = d.getTime()

    if (!groups.has(f.metric_name)) {
      groups.set(f.metric_name, {
        name: f.metric_name,
        unit: f.metric_unit ?? '',
        dataPoints: [],
        latestValue: f.metric_value,
        latestChange: f.metric_change ?? null,
      })
    }

    const g = groups.get(f.metric_name)!
    g.dataPoints.push({ date: dateStr, value: f.metric_value, sortKey })

    // Update latest if this fact is more recent
    if (sortKey > Math.max(...g.dataPoints.map(p => p.sortKey).filter((_, i) => i < g.dataPoints.length - 1), 0)) {
      g.latestValue = f.metric_value
      g.latestChange = f.metric_change ?? null
    }
  }

  // Sort data points chronologically
  for (const g of groups.values()) {
    g.dataPoints.sort((a, b) => a.sortKey - b.sortKey)
  }

  return [...groups.values()].slice(0, 6)
}

export function EntityProfile({
  entity,
  facts,
  relationships = [],
}: {
  entity: Entity
  facts: AtomicFact[]
  relationships?: EntityRelationship[]
}) {
  const desc = entity.description_zh || entity.description_en

  // Compute stats
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const newThisWeek = facts.filter(f => new Date(f.fact_date) >= weekAgo).length
  const highConfCount = facts.filter(f => f.confidence === 'high').length
  const highPct = facts.length > 0 ? Math.round((highConfCount / facts.length) * 100) : 0

  // Metric groups for charts
  const metricGroups = useMemo(() => buildMetricGroups(facts), [facts])

  // AI summary
  const aiSummary = useMemo(() => generateSummary(entity, facts), [entity, facts])

  // Separate objective vs opinion/analysis facts for the event stream
  const objectiveFacts = facts.filter(f => f.objectivity !== 'opinion' && f.objectivity !== 'analysis' && f.fact_type !== 'quote')
  const opinionFacts = facts.filter(f => f.objectivity === 'opinion' || f.objectivity === 'analysis' || f.fact_type === 'quote')

  return (
    <div className="space-y-8">
      {/* ═══ Section 1: 档案卡头部 ═══ */}
      <div className="rounded-lg border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-[24px] font-semibold" style={{ color: 'var(--fg-title)' }}>{entity.name}</h1>
            <p className="text-[12px] font-mono mt-1" style={{ color: 'var(--fg-muted)' }}>
              <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                {CATEGORY_LABELS[entity.category] ?? entity.category}
              </span>
              {entity.aliases.length > 0 && (
                <span className="ml-2">{entity.aliases.join(' / ')}</span>
              )}
            </p>
          </div>
          {entity.website && (
            <a href={entity.website} target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-mono shrink-0 px-2 py-1 rounded border transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
              官网 ↗
            </a>
          )}
        </div>

        {desc && (
          <p className="text-[14px] leading-relaxed mb-4" style={{ color: 'var(--fg-body)' }}>{desc}</p>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="总事实" value={facts.length} />
          <StatBox label="本周新增" value={newThisWeek} />
          <StatBox label="高可信占比" value={`${highPct}%`} />
        </div>
      </div>

      {/* ═══ Section 2: 指标图表 (recharts) ═══ */}
      {metricGroups.length > 0 && (
        <div>
          <SectionLabel>关键指标</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metricGroups.map((group, idx) => (
              <div key={group.name} className="rounded-lg border p-4"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[11px] font-mono truncate" style={{ color: 'var(--fg-muted)' }}>{group.name}</p>
                    <p className="text-[18px] font-semibold font-mono mt-0.5" style={{ color: 'var(--fg-title)' }}>
                      {group.latestValue.toLocaleString()} <span className="text-[11px] font-normal" style={{ color: 'var(--fg-muted)' }}>{group.unit}</span>
                    </p>
                  </div>
                  {group.latestChange && (
                    <span className="text-[12px] font-mono mt-1" style={{
                      color: group.latestChange.startsWith('+') || group.latestChange.startsWith('↑')
                        ? 'var(--success)'
                        : group.latestChange.startsWith('-') || group.latestChange.startsWith('↓')
                          ? 'var(--danger)'
                          : 'var(--fg-muted)',
                    }}>
                      {group.latestChange}
                    </span>
                  )}
                </div>

                {group.dataPoints.length >= 2 ? (
                  <div style={{ width: '100%', height: 80 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={group.dataPoints} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: 'var(--fg-muted)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis hide domain={['dataMin', 'dataMax']} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                          }}
                          formatter={(val) => [Number(val).toLocaleString() + ' ' + group.unit, group.name]}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-[11px] font-mono py-4 text-center" style={{ color: 'var(--fg-muted)' }}>
                    数据点不足，无法绘制趋势图
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Section 3: AI 摘要 ═══ */}
      <div className="rounded-lg border p-4" style={{
        borderColor: 'var(--border)',
        background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-alt) 100%)',
      }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}>
            AI
          </span>
          <span className="text-[11px] font-mono tracking-wider" style={{ color: 'var(--fg-muted)' }}>
            实体摘要
          </span>
        </div>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
          {aiSummary}
        </p>
      </div>

      {/* ═══ Section 4: 事件流 (objective facts) ═══ */}
      <div>
        <SectionLabel count={objectiveFacts.length}>事实与事件</SectionLabel>
        {objectiveFacts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[12px] font-mono" style={{ color: 'var(--fg-muted)' }}>暂无事实数据</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {objectiveFacts.map(fact => (
              <FactCard key={fact.id} fact={fact} />
            ))}
          </div>
        )}
      </div>

      {/* ═══ Section 5: 观点与分析 (opinion/analysis facts) ═══ */}
      {opinionFacts.length > 0 && (
        <div>
          <SectionLabel count={opinionFacts.length}>观点与分析</SectionLabel>
          <div className="flex flex-col gap-2">
            {opinionFacts.map(fact => (
              <FactCard key={fact.id} fact={fact} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Section 6: 关联实体 ═══ */}
      {relationships.length > 0 && (
        <div>
          <SectionLabel count={relationships.length}>关联实体</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {relationships.map(rel => {
              const typeLabel = RELATIONSHIP_LABELS[rel.relationship_type] ?? rel.relationship_type
              return (
                <div key={rel.id} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                    {typeLabel}
                  </span>
                  {rel.description && (
                    <span className="text-[12px]" style={{ color: 'var(--fg-body)' }}>{rel.description}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
