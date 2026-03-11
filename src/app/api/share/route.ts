import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { created_by, query_params, title } = body
  if (!created_by) return NextResponse.json({ error: 'created_by required' }, { status: 400 })

  const token = randomBytes(16).toString('hex')
  const expires_at = new Date(Date.now() + 30 * 86400000).toISOString()

  const { data, error } = await supabaseAdmin.from('shared_views').insert({
    token, created_by, query_params: query_params ?? {}, title: title ?? null, expires_at, view_count: 0,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = process.env.SHARE_BASE_URL ?? 'http://localhost:3000'
  return NextResponse.json({ ...data, share_url: `${baseUrl}/share/${token}` }, { status: 201 })
}
