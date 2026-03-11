import Link from 'next/link'
import type { Entity } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  stablecoin_issuer: 'Issuer', b2c_product: 'B2C', b2b_infra: 'Infra',
  tradfi: 'TradFi', public_company: 'Public Co', defi: 'DeFi', regulator: 'Regulator',
}

export function EntityCard({ entity, factCount }: { entity: Entity; factCount?: number }) {
  return (
    <Link href={`/entities/${entity.id}`}
      className="block rounded border p-4 transition-colors hover:border-[#333]"
      style={{ borderColor: '#1a1a1a', background: '#0a0a0a' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium" style={{ color: '#fff' }}>{entity.name}</span>
        <span className="text-[10px] font-mono" style={{ color: '#333' }}>
          {CATEGORY_LABELS[entity.category] ?? entity.category}
        </span>
      </div>
      {entity.description_en && (
        <p className="text-[12px] line-clamp-2 mb-2" style={{ color: '#555' }}>{entity.description_en}</p>
      )}
      {factCount != null && (
        <span className="text-[11px] font-mono" style={{ color: '#333' }}>{factCount} facts</span>
      )}
    </Link>
  )
}
