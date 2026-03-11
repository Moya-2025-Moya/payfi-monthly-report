import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { action } = await req.json()
  // Stub: these would trigger actual pipeline runs
  const valid = ['collect', 'process', 'snapshot']
  if (!valid.includes(action)) return NextResponse.json({ error: `Invalid action. Use: ${valid.join(', ')}` }, { status: 400 })
  return NextResponse.json({ status: 'triggered', action, timestamp: new Date().toISOString() })
}
