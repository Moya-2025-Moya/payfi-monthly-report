// A1 On-Chain Data Collector — DeFiLlama stablecoin metrics
// Fetches market cap, total supply, and per-chain distribution for watched coins.

import { SOURCES } from '@/config/sources'
import { getCoinsForOnchain } from '@/config/watchlist'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'

// ─── DeFiLlama response shapes ───────────────────────────────────────────────

interface DefiLlamaChainAmount {
  [chain: string]: number
}

interface DefiLlamaPeggedAsset {
  id: string
  symbol: string
  name: string
  circulating: { peggedUSD?: number }
  circulatingPrevDay?: { peggedUSD?: number }
  chainCirculating?: Record<string, { current: { peggedUSD?: number } }>
  price?: number
}

interface DefiLlamaStablecoinsResponse {
  peggedAssets: DefiLlamaPeggedAsset[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`DeFiLlama fetch failed: ${res.status} ${res.statusText} — ${url}`)
  }
  return res.json() as Promise<T>
}

// ─── Main collector ───────────────────────────────────────────────────────────

import type { CollectorResult } from '@/modules/collectors'

export async function collectOnChainData(): Promise<CollectorResult> {
  const fetchedAt = new Date().toISOString()
  const weekNumber = getCurrentWeekNumber()
  const date = fetchedAt.slice(0, 10) // YYYY-MM-DD
  const sourceUrl = 'https://defillama.com/stablecoins'
  const apiBase = SOURCES.defillama.stablecoinBaseUrl
  let totalUpserted = 0
  const breakdown: { source: string; count: number }[] = []

  console.log(`[A1] collectOnChainData start — week ${weekNumber}`)

  // 1. Fetch all stablecoin data from DeFiLlama
  let peggedAssets: DefiLlamaPeggedAsset[]
  try {
    const data = await fetchJson<DefiLlamaStablecoinsResponse>(
      `${apiBase}${SOURCES.defillama.endpoints.stablecoins}`
    )
    peggedAssets = data.peggedAssets ?? []
    console.log(`[A1] Fetched ${peggedAssets.length} stablecoins from DeFiLlama`)
  } catch (err) {
    console.error('[A1] Fatal: could not fetch stablecoin list', err)
    return { total: 0, breakdown: [] }
  }

  // Build a lookup map: defillama coin id → asset
  const assetById = new Map<string, DefiLlamaPeggedAsset>(
    peggedAssets.map(a => [a.id, a])
  )

  // 2. Iterate over watched coins that have a DeFiLlama coin_id
  const watchedCoins = getCoinsForOnchain().filter(e => e.coin_ids?.defillama)

  console.log(`[A1] Processing ${watchedCoins.length} watched coins`)

  for (const entity of watchedCoins) {
    const coinId = entity.coin_ids!.defillama!

    try {
      const asset = assetById.get(coinId)
      if (!asset) {
        console.warn(`[A1] coin not found in DeFiLlama response: ${coinId}`)
        continue
      }

      const symbol = asset.symbol
      const rows: Record<string, unknown>[] = []

      // ── market_cap (total circulating, pegged in USD) ──
      const marketCap = asset.circulating?.peggedUSD ?? null
      if (marketCap !== null) {
        rows.push({
          source: 'defillama',
          source_url: sourceUrl,
          coin_id: coinId,
          coin_symbol: symbol,
          metric_name: 'market_cap',
          metric_value: marketCap,
          metric_unit: 'USD',
          chain: null,
          fetched_at: fetchedAt,
          date,
          week_number: weekNumber,
        })
      }

      // ── total_supply (same as market_cap for pegged USD assets) ──
      // DeFiLlama reports circulating peggedUSD as the canonical supply figure.
      if (marketCap !== null) {
        rows.push({
          source: 'defillama',
          source_url: sourceUrl,
          coin_id: coinId,
          coin_symbol: symbol,
          metric_name: 'total_supply',
          metric_value: marketCap,
          metric_unit: 'USD',
          chain: null,
          fetched_at: fetchedAt,
          date,
          week_number: weekNumber,
        })
      }

      // ── per-chain distribution ──
      const chainCirculating = asset.chainCirculating ?? {}
      for (const [chain, chainData] of Object.entries(chainCirculating)) {
        const chainAmount = chainData?.current?.peggedUSD ?? null
        if (chainAmount === null || chainAmount === 0) continue

        rows.push({
          source: 'defillama',
          source_url: sourceUrl,
          coin_id: coinId,
          coin_symbol: symbol,
          metric_name: 'chain_circulating',
          metric_value: chainAmount,
          metric_unit: 'USD',
          chain,
          fetched_at: fetchedAt,
          date,
          week_number: weekNumber,
        })
      }

      if (rows.length === 0) {
        console.warn(`[A1] No metrics extracted for ${coinId}`)
        continue
      }

      // 3. Upsert into raw_onchain_metrics
      // Conflict key: (source, coin_id, metric_name, chain, date)
      const { error } = await supabaseAdmin
        .from('raw_onchain_metrics')
        .upsert(rows, {
          onConflict: 'source,coin_id,metric_name,chain,date',
          ignoreDuplicates: false,
        })

      if (error) {
        console.error(`[A1] Upsert failed for ${coinId}:`, error.message)
      } else {
        totalUpserted += rows.length
        breakdown.push({ source: `${symbol} (${coinId})`, count: rows.length })
        console.log(`[A1] Upserted ${rows.length} rows for ${symbol} (${coinId})`)
      }
    } catch (err) {
      // Log and continue — one coin failure must not abort the rest
      console.error(`[A1] Error processing coin ${coinId}:`, err)
    }
  }

  console.log('[A1] collectOnChainData complete')
  return { total: totalUpserted, breakdown }
}
