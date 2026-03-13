'use client'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import type { EntityCategory } from '@/lib/types'
import type { EnrichedEntity } from './page'

const CATEGORY_ORDER: { key: EntityCategory; label: string; color: string; bgLight: string }[] = [
  { key: 'stablecoin_issuer', label: '稳定币发行方', color: '#3b82f6', bgLight: 'rgba(59,130,246,0.08)' },
  { key: 'b2b_infra', label: 'B2B 基础设施', color: '#22c55e', bgLight: 'rgba(34,197,94,0.08)' },
  { key: 'tradfi', label: '传统金融', color: '#8b5cf6', bgLight: 'rgba(139,92,246,0.08)' },
  { key: 'public_company', label: '上市公司', color: '#f59e0b', bgLight: 'rgba(245,158,11,0.08)' },
  { key: 'defi', label: 'DeFi', color: '#06b6d4', bgLight: 'rgba(6,182,212,0.08)' },
  { key: 'regulator', label: '监管机构', color: '#ef4444', bgLight: 'rgba(239,68,68,0.08)' },
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function EntitiesClient({
  entities,
  totalFacts,
  categoryCounts,
}: {
  entities: EnrichedEntity[]
  totalFacts: number
  categoryCounts: Record<string, number>
}) {
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    const lower = search.toLowerCase()
    const filtered = search
      ? entities.filter(e =>
          e.name.toLowerCase().includes(lower) ||
          e.aliases.some(a => a.toLowerCase().includes(lower))
        )
      : entities

    const map = new Map<EntityCategory, EnrichedEntity[]>()
    for (const e of filtered) {
      const arr = map.get(e.category) ?? []
      arr.push(e)
      map.set(e.category, arr)
    }
    // Sort within each category: by fact count descending
    for (const arr of map.values()) {
      arr.sort((a, b) => b._factCount - a._factCount)
    }
    return map
  }, [entities, search])

  const activeEntities = entities.filter(e => e._factCount > 0).length

  return (
    <div className="space-y-6">
      {/* ═══ Summary Stats ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="总实体" value={entities.length} />
        <StatCard label="活跃实体" value={activeEntities} subtitle="有事实记录" />
        <StatCard label="总事实" value={totalFacts} />
        <StatCard label="分类" value={Object.keys(categoryCounts).length} />
      </div>

      {/* ═══ Category pills ═══ */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_ORDER.map(({ key, label, color }) => {
          const count = categoryCounts[key] ?? 0
          if (count === 0) return null
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border"
              style={{ borderColor: color, color, background: `${color}10` }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              {label} ({count})
            </span>
          )
        })}
      </div>

      {/* ═══ Search ═══ */}
      <div>
        <input
          type="text"
          placeholder="搜索实体名称或别名..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-80 text-[13px] font-mono px-3 py-2 rounded-lg border outline-none transition-colors"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            color: 'var(--fg-body)',
          }}
        />
      </div>

      {/* ═══ Market Map ═══ */}
      {CATEGORY_ORDER.map(({ key, label, color, bgLight }) => {
        const items = grouped.get(key)
        if (!items || items.length === 0) return null
        return (
          <section key={key}>
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg border border-b-0"
              style={{ borderColor: color, background: bgLight }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <h3 className="text-[12px] font-mono font-semibold tracking-wide uppercase" style={{ color }}>
                {label}
              </h3>
              <span className="text-[11px] font-mono ml-auto" style={{ color }}>
                {items.length} 家
              </span>
            </div>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-b-lg border overflow-hidden"
              style={{ borderColor: color, background: 'var(--border)' }}
            >
              {items.map(e => (
                <Link
                  key={e.id}
                  href={`/entities/${e.id}`}
                  className="flex flex-col gap-1.5 p-4 transition-colors hover:brightness-95"
                  style={{ background: 'var(--surface)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: 'var(--fg-title)' }}
                    >
                      {e.name}
                    </span>
                    {e.website && (
                      <span
                        className="text-[10px] font-mono shrink-0 px-1 py-0.5 rounded"
                        style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
                        onClick={ev => {
                          ev.preventDefault()
                          ev.stopPropagation()
                          window.open(e.website!, '_blank')
                        }}
                      >
                        官网
                      </span>
                    )}
                  </div>

                  {e.aliases.length > 0 && (
                    <p className="text-[11px] font-mono truncate" style={{ color: 'var(--fg-muted)' }}>
                      {e.aliases.join(' / ')}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className="text-[11px] font-mono"
                      style={{ color: e._factCount > 0 ? color : 'var(--fg-muted)' }}
                    >
                      {e._factCount} 条事实
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                      最新 {formatDate(e._latestFactDate)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/* ── Small stat card ── */
function StatCard({ label, value, subtitle }: { label: string; value: number; subtitle?: string }) {
  return (
    <div
      className="flex flex-col p-3 rounded-lg border"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <span className="text-[20px] font-semibold font-mono" style={{ color: 'var(--fg-title)' }}>
        {value.toLocaleString()}
      </span>
      <span className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--fg-muted)' }}>
        {label}
      </span>
      {subtitle && (
        <span className="text-[10px] font-mono" style={{ color: 'var(--fg-muted)' }}>
          {subtitle}
        </span>
      )}
    </div>
  )
}
