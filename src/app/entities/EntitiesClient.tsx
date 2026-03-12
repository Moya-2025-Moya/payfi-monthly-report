'use client'
import Link from 'next/link'
import type { Entity, EntityCategory } from '@/lib/types'

const CATEGORY_ORDER: { key: EntityCategory; label: string }[] = [
  { key: 'stablecoin_issuer', label: '稳定币发行方' },
  { key: 'b2b_infra', label: 'B2B 基础设施' },
  { key: 'tradfi', label: '传统金融' },
  { key: 'public_company', label: '上市公司' },
  { key: 'defi', label: 'DeFi' },
  { key: 'regulator', label: '监管机构' },
]

export function EntitiesClient({ entities }: { entities: (Entity & { _factCount?: number })[] }) {
  const grouped = new Map<EntityCategory, (Entity & { _factCount?: number })[]>()
  for (const e of entities) {
    const arr = grouped.get(e.category) ?? []
    arr.push(e)
    grouped.set(e.category, arr)
  }

  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map(({ key, label }) => {
        const items = grouped.get(key)
        if (!items || items.length === 0) return null
        return (
          <section key={key}>
            <h3 className="text-[11px] font-mono tracking-widest uppercase mb-3"
              style={{ color: 'var(--fg-muted)' }}>
              {label}
            </h3>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              {items.map((e, i) => (
                <Link
                  key={e.id}
                  href={`/entities/${e.id}`}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--surface-alt)]"
                  style={{
                    background: 'var(--surface)',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[13px] font-medium truncate" style={{ color: 'var(--fg-title)' }}>
                      {e.name}
                    </span>
                    {e.aliases.length > 0 && (
                      <span className="text-[11px] font-mono truncate hidden sm:inline" style={{ color: 'var(--fg-muted)' }}>
                        {e.aliases.join(', ')}
                      </span>
                    )}
                  </div>
                  {(e._factCount ?? 0) > 0 && (
                    <span className="text-[11px] font-mono shrink-0 ml-3" style={{ color: 'var(--fg-muted)' }}>
                      {e._factCount} 条
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
