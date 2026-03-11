import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let action: string | undefined
  try {
    const body = await req.json()
    action = body.action
  } catch {
    // No body or invalid JSON — treat as generic process trigger
    action = 'process'
  }

  const valid = ['collect', 'process', 'snapshot']
  if (!action || !valid.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Use: ${valid.join(', ')}` }, { status: 400 })
  }

  // Stub response — actual pipeline triggers are at /api/trigger/collect, /api/cron/*, etc.
  return NextResponse.json({ status: 'triggered', action, timestamp: new Date().toISOString() })
}
