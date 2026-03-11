import { FactList } from '@/components/facts/FactList'
import type { Entity, AtomicFact } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  stablecoin_issuer: '稳定币发行方', b2c_product: 'B2C 产品', b2b_infra: 'B2B 基础设施',
  tradfi: '传统金融', public_company: '上市公司', defi: 'DeFi', regulator: '监管机构',
}

export function EntityProfile({ entity, facts }: { entity: Entity; facts: AtomicFact[] }) {
  const desc = entity.description_zh || entity.description_en
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg-title)' }}>{entity.name}</h1>
        <p className="text-[12px] font-mono mt-1" style={{ color: 'var(--fg-faint)' }}>
          {CATEGORY_LABELS[entity.category] ?? entity.category}
          {entity.aliases.length > 0 && ` · ${entity.aliases.join(', ')}`}
        </p>
      </div>
      {desc && <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{desc}</p>}
      {entity.website && (
        <a href={entity.website} target="_blank" rel="noopener noreferrer"
          className="text-[12px] font-mono transition-colors hover:text-white" style={{ color: 'var(--fg-dim)' }}>
          {entity.website} ↗
        </a>
      )}
      <div>
        <p className="text-[10px] font-mono tracking-wider mb-4" style={{ color: 'var(--fg-faint)' }}>
          相关事实 ({facts.length})
        </p>
        <FactList facts={facts} />
      </div>
    </div>
  )
}
