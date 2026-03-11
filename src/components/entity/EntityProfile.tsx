import { FactList } from '@/components/facts/FactList'
import type { Entity, AtomicFact } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  stablecoin_issuer: 'Stablecoin Issuer', b2c_product: 'B2C Product', b2b_infra: 'B2B Infrastructure',
  tradfi: 'TradFi', public_company: 'Public Company', defi: 'DeFi', regulator: 'Regulator',
}

export function EntityProfile({ entity, facts }: { entity: Entity; facts: AtomicFact[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {entity.logo_url ? (
          <img src={entity.logo_url} alt="" className="w-12 h-12 rounded-lg" />
        ) : (
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold"
            style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
            {entity.name[0]}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">{entity.name}</h1>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            {CATEGORY_LABELS[entity.category] ?? entity.category}
            {entity.aliases.length > 0 && ` · Also: ${entity.aliases.join(', ')}`}
          </p>
        </div>
      </div>
      {entity.description_en && <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>{entity.description_en}</p>}
      {entity.website && (
        <a href={entity.website} target="_blank" rel="noopener noreferrer" className="text-sm underline" style={{ color: 'var(--accent)' }}>{entity.website}</a>
      )}
      <div>
        <h2 className="text-sm font-semibold mb-3">Verified Facts ({facts.length})</h2>
        <FactList facts={facts} />
      </div>
    </div>
  )
}
