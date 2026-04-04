// Admin Settings API
// GET  /api/admin/settings          — read all app settings
// PUT  /api/admin/settings          — upsert one or more settings
//
// Uses app_settings table (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ).
// Create in Supabase dashboard SQL editor:
//   CREATE TABLE IF NOT EXISTS app_settings (
//     key        TEXT PRIMARY KEY,
//     value      TEXT,
//     updated_at TIMESTAMPTZ DEFAULT now()
//   );

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'
import { verifyAdminToken } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('key, value, updated_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return as a flat object: { telegram_chat_id: "...", ... }
  const settings: Record<string, string> = {}
  for (const row of data ?? []) {
    settings[row.key as string] = row.value as string
  }

  return NextResponse.json(settings)
}

export async function PUT(request: NextRequest) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rows = Object.entries(body).map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
  }))

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No settings provided' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated: rows.map(r => r.key) })
}
