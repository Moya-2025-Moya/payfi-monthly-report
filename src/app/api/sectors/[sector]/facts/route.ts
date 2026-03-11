import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'

export async function GET(req: NextRequest, { params }: { params: Promise<{ sector: string }> }) {
  const { sector } = await params
  const week = req.nextUrl.searchParams.get('week') ?? getCurrentWeekNumber()

  const { data: sectorRec } = await supabaseAdmin.from('sectors').select('id').eq('name', sector).single()
  if (!sectorRec) return NextResponse.json([])

  const { data: links } = await supabaseAdmin.from('fact_sectors').select('fact_id').eq('sector_id', sectorRec.id)
  const factIds = (links ?? []).map((l: { fact_id: string }) => l.fact_id)
  if (factIds.length === 0) return NextResponse.json([])

  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('id', factIds)
    .in('verification_status', ['verified', 'partially_verified'])
    .eq('week_number', week)
    .order('fact_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
