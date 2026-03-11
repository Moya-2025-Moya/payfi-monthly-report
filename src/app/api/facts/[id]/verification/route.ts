import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, verification_status, confidence, confidence_reasons, v1_result, v2_result, v3_result, v4_result, v5_result')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}
