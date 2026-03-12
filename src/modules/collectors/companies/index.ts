// ============================================================
// Companies Collector — SEC Filings + Stock Data
// Fetches recent SEC filings and current stock quotes for
// all watchlisted companies that have a CIK or ticker.
// ============================================================

import { SOURCES } from '@/config/sources'
import { getCompaniesWithCIK } from '@/config/watchlist'
import { supabaseAdmin } from '@/db/client'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()

// ─── Helpers ───────────────────────────────────────────────

/** Sleep for `ms` milliseconds (respects SEC rate-limit of 10 req/sec) */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Return an ISO date string (YYYY-MM-DD) for `daysAgo` days in the past */
function dateStr(daysAgo = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

/** Zero-pad a CIK to 10 digits as required by SEC EDGAR */
function padCIK(cik: string): string {
  return cik.replace(/^0+/, '').padStart(10, '0')
}

/**
 * Build the canonical filing URL from a CIK and accession number.
 * Accession numbers look like "0001633917-24-000123"; the URL uses them
 * without hyphens inside a folder path.
 */
function buildFilingUrl(cik: string, accessionNumber: string): string {
  const acc = accessionNumber.replace(/-/g, '')
  const paddedCik = padCIK(cik)
  return `https://www.sec.gov/Archives/edgar/data/${parseInt(paddedCik, 10)}/${acc}/${accessionNumber}-index.htm`
}

// ─── Types for SEC EDGAR submissions API response ──────────

interface SecSubmissionsResponse {
  name: string
  cik: string
  filings: {
    recent: {
      accessionNumber: string[]
      filingDate: string[]
      form: string[]
      primaryDocument: string[]
      primaryDocDescription: string[]
    }
  }
}

// ─── Part 1: SEC Filings ────────────────────────────────────

async function collectSecFilings(): Promise<number> {
  const companies = getCompaniesWithCIK()
  const sevenDaysAgo = dateStr(7)
  const today = dateStr(0)

  let totalInserted = 0

  console.log(
    `[companies/sec] Fetching filings for ${companies.length} companies ` +
      `(${sevenDaysAgo} → ${today})`
  )

  for (const company of companies) {
    // getCompaniesWithCIK() guarantees sec_cik is defined
    const cik = company.sec_cik!
    const paddedCik = padCIK(cik)
    const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': SOURCES.secEdgar.userAgent },
      })

      if (!res.ok) {
        console.warn(`[companies/sec] HTTP ${res.status} for ${company.name} (CIK ${cik})`)
        continue
      }

      const data = (await res.json()) as SecSubmissionsResponse
      const recent = data.filings.recent

      // Pair each index with its filing metadata
      const filingCount = recent.accessionNumber.length
      const targetForms = new Set(['10-K', '10-Q', '8-K', 'S-1'])

      // Collect rows to upsert, deduplicating by filing_url
      const seen = new Set<string>()
      const rows: {
        company_cik: string
        company_name: string
        filing_type: string
        filing_url: string
        filing_date: string
        description: string | null
        full_text: null
        processed: boolean
      }[] = []

      for (let i = 0; i < filingCount; i++) {
        const filingDate = recent.filingDate[i]
        // Only keep filings within the last 7 days
        if (filingDate < sevenDaysAgo || filingDate > today) continue

        const form = recent.form[i]
        if (!targetForms.has(form)) continue

        const accessionNumber = recent.accessionNumber[i]
        const filingUrl = buildFilingUrl(cik, accessionNumber)

        if (seen.has(filingUrl)) continue
        seen.add(filingUrl)

        const description = recent.primaryDocDescription[i] ?? null

        rows.push({
          company_cik: cik,
          company_name: company.name,
          filing_type: form,
          filing_url: filingUrl,
          filing_date: filingDate,
          description,
          full_text: null,
          processed: false,
        })
      }

      if (rows.length === 0) {
        console.log(`[companies/sec] No recent filings for ${company.name}`)
      } else {
        const { error } = await supabaseAdmin
          .from('raw_filings')
          .upsert(rows, { onConflict: 'filing_url', ignoreDuplicates: true })

        if (error) {
          console.error(`[companies/sec] DB error for ${company.name}:`, error.message)
        } else {
          totalInserted += rows.length
          console.log(`[companies/sec] Inserted ${rows.length} filing(s) for ${company.name}`)
        }
      }
    } catch (err) {
      console.error(`[companies/sec] Error fetching filings for ${company.name}:`, err)
    }

    // Respect SEC rate limit: max 10 requests/second → wait ~120 ms between calls
    await sleep(120)
  }

  return totalInserted
}

// ─── Part 2: Stock Data ─────────────────────────────────────

async function collectStockData(): Promise<number> {
  const companies = getCompaniesWithCIK()
  // Only companies that have a ticker symbol
  const withTicker = companies.filter(c => c.ticker)

  let savedCount = 0

  console.log(`[companies/stock] Fetching quotes for ${withTicker.length} tickers`)

  for (const company of withTicker) {
    const ticker = company.ticker!

    try {
      const quote = await yahooFinance.quote(ticker)

      const price = quote.regularMarketPrice ?? null
      const change_pct = quote.regularMarketChangePercent ?? null
      const volume = quote.regularMarketVolume ?? null
      const market_cap = quote.marketCap ?? null

      if (price === null) {
        console.warn(`[companies/stock] No price data for ${ticker}`)
        continue
      }

      const row = {
        ticker,
        company_name: company.name,
        price,
        change_pct: change_pct ?? 0,
        volume: volume ?? 0,
        market_cap,
        date: new Date().toISOString().split('T')[0],
      }

      const { error } = await supabaseAdmin.from('raw_stock_data').insert(row)

      if (error) {
        console.error(`[companies/stock] DB error for ${ticker}:`, error.message)
      } else {
        savedCount++
        console.log(
          `[companies/stock] Saved ${ticker}: $${price.toFixed(2)} (${(change_pct ?? 0).toFixed(2)}%)`
        )
      }
    } catch (err) {
      console.error(`[companies/stock] Error fetching quote for ${ticker}:`, err)
    }

    // Small delay to avoid hammering Yahoo Finance
    await sleep(200)
  }

  return savedCount
}

// ─── Main Export ────────────────────────────────────────────

import type { CollectorResult } from '@/modules/collectors'

export async function collectCompanyData(): Promise<CollectorResult> {
  console.log('[companies] Starting company data collection…')

  const filings = await collectSecFilings()
  const stocks = await collectStockData()

  console.log('[companies] Company data collection complete.')
  return {
    total: filings + stocks,
    breakdown: [
      { source: 'SEC Filings', count: filings },
      { source: 'Stock Quotes', count: stocks },
    ],
  }
}
