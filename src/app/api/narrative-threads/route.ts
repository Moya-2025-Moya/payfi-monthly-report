import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')

  let query = supabaseAdmin
    .from('narrative_threads')
    .select('id, topic, slug, status, first_seen_week, last_updated_week, total_weeks, key_entities')
    .order('last_updated_week', { ascending: false })
    .limit(20)

  if (q) {
    query = query.or(`topic.ilike.%${q}%,key_entities.cs.{${q.toLowerCase()}}`)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
