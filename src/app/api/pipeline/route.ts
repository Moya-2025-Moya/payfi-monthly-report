import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('pipeline_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return NextResponse.json({ message: 'No pipeline runs yet' })
  return NextResponse.json(data[0])
}
