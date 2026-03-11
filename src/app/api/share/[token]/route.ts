import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { data, error } = await supabaseAdmin.from('shared_views').select('*').eq('token', token).single()
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (new Date(data.expires_at) < new Date()) return NextResponse.json({ error: 'Expired' }, { status: 410 })
  return NextResponse.json(data)
}
