import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  let query = supabaseAdmin.from('fact_contradictions').select('*').order('detected_at', { ascending: false }).limit(50)
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
