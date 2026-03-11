import { FactList } from '@/components/facts/FactList'
import type { Entity, AtomicFact } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  stablecoin_issuer: 'Stablecoin Issuer', b2c_product: 'B2C Product', b2b_infra: 'B2B Infrastructure',
  tradfi: 'TradFi', public_company: 'Public Company', defi: 'DeFi', regulator: 'Regulator',
}

export function EntityProfile({ entity, facts }: { entity: Entity; facts: AtomicFact[] }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg-title)' }}>{entity.name}</h1>
        <p className="text-[12px] font-mono mt-1" style={{ color: 'var(--fg-faint)' }}>
          {CATEGORY_LABELS[entity.category] ?? entity.category}
          {entity.aliases.length > 0 && ` · ${entity.aliases.join(', ')}`}
        </p>
      </div>
      {entity.description_en && <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{entity.description_en}</p>}
      {entity.website && (
        <a href={entity.website} target="_blank" rel="noopener noreferrer"
          className="text-[12px] font-mono transition-colors hover:text-white" style={{ color: 'var(--fg-dim)' }}>
          {entity.website} ↗
        </a>
      )}
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-4" style={{ color: 'var(--fg-faint)' }}>
          Facts ({facts.length})
        </p>
        <FactList facts={facts} />
      </div>
    </div>
  )
}
