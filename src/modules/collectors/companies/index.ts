// ============================================================
// Companies Collector — SEC Filings + Stock Data
// Fetches recent SEC filings and current stock quotes for
// all watchlisted companies that have a CIK or ticker.
// ============================================================

import { SOURCES } from '@/config/sources'
import { getCompaniesWithCIK } from '@/config/watchlist'
import { supabaseAdmin } from '@/db/client'
import { extractContentBatch } from '@/lib/extract-content'
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

interface FilingRow {
  company_cik: string
  company_name: string
  filing_type: string
  filing_url: string
  filing_date: string
  description: string | null
  full_text: string | null
  processed: boolean
}

async function collectSecFilings(): Promise<number> {
  const companies = getCompaniesWithCIK()
  const sevenDaysAgo = dateStr(7)
  const today = dateStr(0)

  let totalInserted = 0
  const allRows: FilingRow[] = []

  console.log(
    `[companies/sec] Fetching filings for ${companies.length} companies ` +
      `(${sevenDaysAgo} → ${today})`
  )

  for (const company of companies) {
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

      const filingCount = recent.accessionNumber.length
      const targetForms = new Set(['10-K', '10-Q', '8-K', 'S-1'])

      const seen = new Set<string>()

      for (let i = 0; i < filingCount; i++) {
        const filingDate = recent.filingDate[i]
        if (filingDate < sevenDaysAgo || filingDate > today) continue

        const form = recent.form[i]
        if (!targetForms.has(form)) continue

        const accessionNumber = recent.accessionNumber[i]
        const filingUrl = buildFilingUrl(cik, accessionNumber)

        if (seen.has(filingUrl)) continue
        seen.add(filingUrl)

        const description = recent.primaryDocDescription[i] ?? null

        allRows.push({
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

      if (allRows.length === 0) {
        console.log(`[companies/sec] No recent filings for ${company.name}`)
      }
    } catch (err) {
      console.error(`[companies/sec] Error fetching filings for ${company.name}:`, err)
    }

    await sleep(120)
  }

  if (allRows.length === 0) return 0

  // Fetch full text for all filings
  console.log(`[companies/sec] Fetching full text for ${allRows.length} filings...`)
  const urls = allRows.map(r => r.filing_url)
  const textMap = await extractContentBatch(urls, 3) // lower concurrency for SEC

  let enriched = 0
  for (const row of allRows) {
    const text = textMap.get(row.filing_url)
    if (text) {
      row.full_text = text
      enriched++
    }
  }
  console.log(`[companies/sec] Full text extracted: ${enriched}/${allRows.length}`)

  // Upsert all rows
  const { error } = await supabaseAdmin
    .from('raw_filings')
    .upsert(allRows, { onConflict: 'filing_url', ignoreDuplicates: true })

  if (error) {
    console.error('[companies/sec] DB upsert error:', error.message)
  } else {
    totalInserted = allRows.length
    console.log(`[companies/sec] Inserted ${totalInserted} filing(s)`)
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

      const { error } = await supabaseAdmin.from('raw_stock_data').upsert(row, { onConflict: 'ticker,date' })

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
