import { SOURCES } from '@/config/sources'
import { WATCHLIST } from '@/config/watchlist'
import { supabaseAdmin } from '@/db/client'

interface RawFunding {
  collector: 'defillama_raises' | 'news_extraction' | 'cryptorank'
  project_name: string
  source_url: string
  round: string | null
  amount: number | null
  amount_unit: string
  valuation: number | null
  investors: string[]
  sector: string | null
  announced_at: string
  processed: boolean
}

interface DefiLlamaRaise {
  name: string
  round: string | null
  amount: number | null
  sector: string | null
  source: string[] | null
  date: number
  leadInvestors: string[] | null
  otherInvestors: string[] | null
}

interface DefiLlamaRaisesResponse {
  raises: DefiLlamaRaise[]
}

const RELEVANT_SECTORS = ['stablecoin', 'payments', 'defi', 'infrastructure', 'fintech', 'rwa']
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function isRelevantRaise(raise: DefiLlamaRaise, watchlistNames: Set<string>): boolean {
  const sector = (raise.sector ?? '').toLowerCase()
  const name = (raise.name ?? '').toLowerCase()

  const sectorMatch = RELEVANT_SECTORS.some((s) => sector.includes(s))
  const nameMatch = watchlistNames.has(name)

  return sectorMatch || nameMatch
}

function buildSourceUrl(raise: DefiLlamaRaise): string {
  if (raise.source && raise.source.length > 0) {
    return raise.source[0]
  }
  return 'https://defillama.com/raises'
}

import type { CollectorResult } from '@/modules/collectors'

export async function collectFunding(): Promise<CollectorResult> {
  console.log('[funding] Starting funding collection...')

  const watchlistNames = new Set(
    WATCHLIST.flatMap((e) => {
      const names = [e.name.toLowerCase()]
      if ('aliases' in e && Array.isArray(e.aliases)) {
        names.push(...(e.aliases as string[]).map((a) => a.toLowerCase()))
      }
      return names
    })
  )

  let raises: DefiLlamaRaise[] = []

  try {
    const url = `${SOURCES.defillama.baseUrl}/raises`
    const res = await fetch(url)

    if (!res.ok) {
      console.error(`[funding] DeFiLlama raises fetch failed: ${res.status}`)
      return { total: 0, breakdown: [{ source: 'DeFiLlama Raises', count: 0 }] }
    }

    const data: DefiLlamaRaisesResponse = await res.json()
    raises = data.raises ?? []
    console.log(`[funding] DeFiLlama API 返回 ${raises.length} 条融资记录`)
  } catch (err) {
    console.error('[funding] Failed to fetch DeFiLlama raises:', err)
    return { total: 0, breakdown: [{ source: 'DeFiLlama Raises', count: 0 }] }
  }

  const cutoff = Date.now() - THIRTY_DAYS_MS

  const filtered = raises.filter((raise) => {
    const raiseDateMs = raise.date * 1000
    const isRecent = raiseDateMs >= cutoff
    const isRelevant = isRelevantRaise(raise, watchlistNames)
    return isRecent && isRelevant
  })

  const mapped: RawFunding[] = filtered.map((raise) => ({
    collector: 'defillama_raises',
    project_name: raise.name,
    source_url: buildSourceUrl(raise),
    round: raise.round ?? null,
    amount: raise.amount ?? null,
    amount_unit: 'USD',
    valuation: null,
    investors: [
      ...(raise.leadInvestors ?? []),
      ...(raise.otherInvestors ?? []),
    ],
    sector: raise.sector ?? null,
    announced_at: new Date(raise.date * 1000).toISOString(),
    processed: false,
  }))

  if (mapped.length === 0) {
    console.log('[funding] No relevant funding rounds found.')
    return { total: 0, breakdown: [{ source: 'DeFiLlama Raises', count: 0 }] }
  }

  // Deduplicate by (project_name, round, announced_at)
  const seen = new Set<string>()
  const deduped = mapped.filter((f) => {
    const key = `${f.project_name}|${f.round}|${f.announced_at}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  console.log(`[funding] Inserting ${deduped.length} funding rounds...`)

  // Filter out records that already exist in DB (round can be NULL so upsert with onConflict is unreliable)
  const existingKeys = new Set<string>()
  const { data: existing } = await supabaseAdmin
    .from('raw_funding')
    .select('project_name, round, announced_at')

  for (const row of existing ?? []) {
    const r = row as { project_name: string; round: string | null; announced_at: string }
    existingKeys.add(`${r.project_name}|${r.round ?? ''}|${r.announced_at}`)
  }

  const newItems = deduped.filter((f) => {
    const dateOnly = f.announced_at.slice(0, 10)
    const key = `${f.project_name}|${f.round ?? ''}|${dateOnly}`
    return !existingKeys.has(key)
  })

  const breakdown = [{ source: 'DeFiLlama Raises (找到)', count: deduped.length }]

  if (newItems.length === 0) {
    console.log('[funding] All funding rounds already exist in DB.')
    return { total: 0, breakdown }
  }

  const { error } = await supabaseAdmin
    .from('raw_funding')
    .insert(newItems)

  if (error) {
    console.error('[funding] Insert failed:', error)
    return { total: 0, breakdown }
  } else {
    breakdown.push({ source: 'DeFiLlama Raises (新增)', count: newItems.length })
    console.log(`[funding] Successfully inserted ${newItems.length} new funding rounds.`)
    return { total: newItems.length, breakdown }
  }
}
