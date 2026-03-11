import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET() {
  const { data, error } = await supabaseAdmin.from('entities').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
