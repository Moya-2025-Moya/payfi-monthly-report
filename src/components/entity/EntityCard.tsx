import Link from 'next/link'
import type { Entity } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  stablecoin_issuer: 'Stablecoin Issuer',
  b2c_product: 'B2C Product',
  b2b_infra: 'B2B Infrastructure',
  tradfi: 'TradFi',
  public_company: 'Public Company',
  defi: 'DeFi',
  regulator: 'Regulator',
}

export function EntityCard({ entity, factCount }: { entity: Entity; factCount?: number }) {
  return (
    <Link href={`/entities/${entity.id}`}
      className="block rounded-lg border p-4 hover:shadow-sm transition-shadow"
      style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3">
        {entity.logo_url ? (
          <img src={entity.logo_url} alt="" className="w-8 h-8 rounded" />
        ) : (
          <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
            style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
            {entity.name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{entity.name}</p>
          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{CATEGORY_LABELS[entity.category] ?? entity.category}</p>
        </div>
        {factCount != null && (
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
            {factCount} facts
          </span>
        )}
      </div>
      {entity.description_en && (
        <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--muted-fg)' }}>{entity.description_en}</p>
      )}
    </Link>
  )
}
