// A1 On-Chain Data Collector — DeFiLlama stablecoin metrics
// Fetches market cap, total supply, and per-chain distribution for watched coins.

import { SOURCES } from '@/config/sources'
import { getCoinsForOnchain } from '@/config/watchlist'
import { supabaseAdmin } from '@/db/client'

// ─── DeFiLlama response shapes ───────────────────────────────────────────────

interface DefiLlamaPeggedAsset {
  id: number
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

/** Slugify a name for matching: "USD Coin" → "usd-coin", "Ethena USDe" → "ethena-usde" */
function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ─── Main collector ───────────────────────────────────────────────────────────

import type { CollectorResult } from '@/modules/collectors'

export async function collectOnChainData(): Promise<CollectorResult> {
  const fetchedAt = new Date().toISOString()
  const apiBase = SOURCES.defillama.stablecoinBaseUrl
  let totalUpserted = 0
  const breakdown: { source: string; count: number }[] = []

  console.log('[A1] collectOnChainData start')

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

  // Build lookup maps by slug and symbol for matching watchlist coin_ids
  // DeFiLlama uses numeric IDs, but our watchlist uses slug-style IDs (e.g. "usd-coin", "tether")
  const assetBySlug = new Map<string, DefiLlamaPeggedAsset>()
  const assetBySymbol = new Map<string, DefiLlamaPeggedAsset>()
  for (const a of peggedAssets) {
    assetBySlug.set(slugify(a.name), a)
    assetBySymbol.set(a.symbol.toLowerCase(), a)
  }

  // 2. Iterate over watched coins that have a DeFiLlama coin_id
  const watchedCoins = getCoinsForOnchain().filter(e => e.coin_ids?.defillama)

  console.log(`[A1] Processing ${watchedCoins.length} watched coins`)

  for (const entity of watchedCoins) {
    const coinSlug = entity.coin_ids!.defillama!

    try {
      // Try matching by slug first, then by symbol from aliases
      let asset = assetBySlug.get(coinSlug)
      if (!asset) {
        // Try matching by symbol (e.g. "dai" matches symbol "DAI")
        asset = assetBySymbol.get(coinSlug.toLowerCase())
      }
      if (!asset) {
        // Try aliases as symbols
        for (const alias of entity.aliases) {
          asset = assetBySymbol.get(alias.toLowerCase())
          if (asset) break
        }
      }
      if (!asset) {
        console.warn(`[A1] coin not found in DeFiLlama response: ${coinSlug} (${entity.name})`)
        continue
      }

      const symbol = asset.symbol
      const rows: Record<string, unknown>[] = []

      // ── market_cap (total circulating, pegged in USD) ──
      const marketCap = asset.circulating?.peggedUSD ?? null
      if (marketCap !== null) {
        rows.push({
          source: 'defillama',
          coin_id: coinSlug,
          coin_symbol: symbol,
          metric_name: 'market_cap',
          metric_value: marketCap,
          metric_unit: 'USD',
          chain: null,
          fetched_at: fetchedAt,
        })
      }

      // ── total_supply (same as market_cap for pegged USD assets) ──
      if (marketCap !== null) {
        rows.push({
          source: 'defillama',
          coin_id: coinSlug,
          coin_symbol: symbol,
          metric_name: 'total_supply',
          metric_value: marketCap,
          metric_unit: 'USD',
          chain: null,
          fetched_at: fetchedAt,
        })
      }

      // ── per-chain distribution ──
      const chainCirculating = asset.chainCirculating ?? {}
      for (const [chain, chainData] of Object.entries(chainCirculating)) {
        const chainAmount = chainData?.current?.peggedUSD ?? null
        if (chainAmount === null || chainAmount === 0) continue

        rows.push({
          source: 'defillama',
          coin_id: coinSlug,
          coin_symbol: symbol,
          metric_name: 'chain_circulating',
          metric_value: chainAmount,
          metric_unit: 'USD',
          chain,
          fetched_at: fetchedAt,
        })
      }

      if (rows.length === 0) {
        console.warn(`[A1] No metrics extracted for ${coinSlug}`)
        continue
      }

      // 3. Insert into raw_onchain_metrics (no upsert — fetched_at makes each run unique)
      const { error } = await supabaseAdmin
        .from('raw_onchain_metrics')
        .insert(rows)

      if (error) {
        console.error(`[A1] Insert failed for ${coinSlug}:`, error.message)
      } else {
        totalUpserted += rows.length
        breakdown.push({ source: `${symbol} (${coinSlug})`, count: rows.length })
        console.log(`[A1] Inserted ${rows.length} rows for ${symbol} (${coinSlug})`)
      }
    } catch (err) {
      console.error(`[A1] Error processing coin ${coinSlug}:`, err)
    }
  }

  console.log('[A1] collectOnChainData complete')
  return { total: totalUpserted, breakdown }
}
