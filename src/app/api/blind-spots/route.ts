import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'

export async function GET(req: NextRequest) {
  const entityType = req.nextUrl.searchParams.get('entity_type')
  const week = getCurrentWeekNumber()

  let query = supabaseAdmin.from('blind_spot_reports').select('*').eq('week_number', week)
  if (entityType) query = query.eq('entity_type', entityType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
