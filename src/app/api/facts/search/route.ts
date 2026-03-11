import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')
  if (!q) return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })

  let query = supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('verification_status', ['verified', 'partially_verified'])
    .or(`content_en.ilike.%${q}%,content_zh.ilike.%${q}%`)
    .order('fact_date', { ascending: false })
    .limit(100)

  if (from) query = query.gte('fact_date', from)
  if (to) query = query.lte('fact_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
