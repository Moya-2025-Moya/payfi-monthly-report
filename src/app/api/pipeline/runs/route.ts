import { NextRequest, NextResponse } from 'next/server'
import { getLatestRuns, getRunById } from '@/lib/pipeline-logger'

// GET /api/pipeline/runs — latest runs per type
// GET /api/pipeline/runs?id=xxx — poll a specific run
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (id) {
    const run = await getRunById(id)
    if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    return NextResponse.json(run)
  }

  const runs = await getLatestRuns()
  return NextResponse.json(runs)
}
