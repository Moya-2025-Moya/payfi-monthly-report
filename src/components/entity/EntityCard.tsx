import Link from 'next/link'
import type { Entity } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  stablecoin_issuer: '发行方', b2c_product: 'B2C', b2b_infra: '基础设施',
  tradfi: '传统金融', public_company: '上市公司', defi: 'DeFi', regulator: '监管',
}

export function EntityCard({ entity, factCount }: { entity: Entity; factCount?: number }) {
  const desc = entity.description_zh || entity.description_en
  return (
    <Link href={`/entities/${entity.id}`}
      className="block rounded-lg border p-4 transition-colors hover:border-[var(--border-hover)]"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium" style={{ color: 'var(--fg-title)' }}>{entity.name}</span>
        <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
          {CATEGORY_LABELS[entity.category] ?? entity.category}
        </span>
      </div>
      {desc && (
        <p className="text-[13px] line-clamp-2 mb-2" style={{ color: 'var(--fg-muted)' }}>{desc}</p>
      )}
      {factCount != null && (
        <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>{factCount} 条事实</span>
      )}
    </Link>
  )
}
