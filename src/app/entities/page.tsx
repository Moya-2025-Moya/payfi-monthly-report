import { WATCHLIST } from '@/config/watchlist'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import Link from 'next/link'
import type { EntityCategory } from '@/lib/types'

export const metadata = {
  title: '实体目录 — StablePulse',
  description: '稳定币行业核心实体跟踪',
}

const CATEGORY_LABELS: Record<EntityCategory, string> = {
  stablecoin_issuer: '稳定币发行方',
  b2c_product: 'B2C 产品',
  b2b_infra: 'B2B 基础设施',
  tradfi: '传统金融',
  public_company: '上市公司',
  defi: 'DeFi',
  regulator: '监管机构',
}

const CATEGORY_ORDER: EntityCategory[] = [
  'stablecoin_issuer', 'b2b_infra', 'tradfi', 'defi', 'b2c_product', 'public_company', 'regulator',
]

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default async function EntitiesPage() {
  const currentWeek = getCurrentWeekNumber()

  // Get fact counts per entity tag for current week
  const { data: factsRaw } = await supabaseAdmin
    .from('atomic_facts')
    .select('tags')
    .eq('week_number', currentWeek)
    .in('verification_status', ['verified', 'partially_verified'])
    .limit(500)

  // Count tags matching entity names
  const tagCounts = new Map<string, number>()
  for (const f of factsRaw ?? []) {
    for (const tag of (f.tags as string[]) ?? []) {
      const lower = tag.toLowerCase()
      tagCounts.set(lower, (tagCounts.get(lower) ?? 0) + 1)
    }
  }

  // Group entities by category
  const grouped = new Map<EntityCategory, typeof WATCHLIST>()
  for (const entity of WATCHLIST) {
    const cat = entity.category
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(entity)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--fg-title)' }}>实体目录</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--fg-muted)' }}>
          {WATCHLIST.length} 个跟踪实体 · {currentWeek}
        </p>
      </div>

      <div className="space-y-6">
        {CATEGORY_ORDER.filter(cat => grouped.has(cat)).map(cat => (
          <div key={cat}>
            <h2 className="text-[11px] font-medium tracking-wider uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>
              {CATEGORY_LABELS[cat]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {grouped.get(cat)!.map(entity => {
                const slug = slugify(entity.name)
                const nameLower = entity.name.toLowerCase()
                const factCount = tagCounts.get(nameLower) ?? 0
                // Also check aliases
                const aliasCount = entity.aliases.reduce((sum, a) => sum + (tagCounts.get(a.toLowerCase()) ?? 0), 0)
                const totalFacts = factCount + aliasCount

                return (
                  <Link key={entity.name} href={`/entities/${slug}`}
                    className="px-3 py-2.5 rounded-lg border transition-colors hover:border-[var(--accent-muted)]"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium" style={{ color: 'var(--fg-title)' }}>
                        {entity.name}
                      </span>
                      {totalFacts > 0 && (
                        <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                          {totalFacts} 条
                        </span>
                      )}
                    </div>
                    {entity.aliases.length > 0 && (
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        {entity.aliases.join(', ')}
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
