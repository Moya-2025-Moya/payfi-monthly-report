import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, email, status, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
