import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET() {
  try {
    const { error } = await supabaseAdmin.from('atomic_facts').select('id').limit(1)
    return NextResponse.json({ status: 'ok', db: error ? 'error' : 'connected', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error', db: 'disconnected' }, { status: 500 })
  }
}
