import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'

export async function GET(req: NextRequest) {
  const week = req.nextUrl.searchParams.get('week') ?? getCurrentWeekNumber()
  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('verification_status', ['verified', 'partially_verified'])
    .eq('week_number', week)
    .order('fact_date', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
