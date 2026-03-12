import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('reports')
    .select('id, date, subject, content, created_at')
    .order('date', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
