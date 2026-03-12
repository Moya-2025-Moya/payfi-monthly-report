// One-time migration: add full_text columns to tables that are missing them
import { supabaseAdmin } from '@/db/client'
import { NextResponse } from 'next/server'

export async function POST() {
  const results: { table: string; status: string }[] = []

  const migrations = [
    {
      table: 'raw_regulatory',
      sql: 'ALTER TABLE raw_regulatory ADD COLUMN IF NOT EXISTS full_text TEXT',
    },
    {
      table: 'raw_product_updates',
      sql: 'ALTER TABLE raw_product_updates ADD COLUMN IF NOT EXISTS full_text TEXT',
    },
  ]

  for (const m of migrations) {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { query: m.sql })
      if (error) {
        // If rpc doesn't exist, try raw SQL via REST
        results.push({ table: m.table, status: `rpc failed: ${error.message}` })
      } else {
        results.push({ table: m.table, status: 'ok' })
      }
    } catch (err) {
      results.push({ table: m.table, status: `error: ${err}` })
    }
  }

  return NextResponse.json({ results })
}
