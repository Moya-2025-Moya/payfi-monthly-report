// GET /api/narrative-image?week=2026-W11&index=0
// Returns a PNG image of the narrative timeline for embedding in emails
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'
import { renderNarrativeImage, type NarrativeImageInput } from '@/lib/narrative-image'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const week = searchParams.get('week')
  const indexStr = searchParams.get('index')

  if (!week || indexStr === null) {
    return NextResponse.json(
      { error: 'Missing required params: week, index' },
      { status: 400 }
    )
  }

  const index = parseInt(indexStr, 10)
  if (isNaN(index) || index < 0) {
    return NextResponse.json(
      { error: 'Invalid index parameter' },
      { status: 400 }
    )
  }

  try {
    // Fetch the weekly snapshot
    const { data: snapshot, error } = await supabaseAdmin
      .from('weekly_snapshots')
      .select('snapshot_data')
      .eq('week_number', week)
      .single()

    if (error || !snapshot) {
      return NextResponse.json(
        { error: `Snapshot not found for week ${week}` },
        { status: 404 }
      )
    }

    const snapshotData = snapshot.snapshot_data as Record<string, unknown>
    const detailedStr = snapshotData.weekly_summary_detailed as string | undefined

    if (!detailedStr) {
      return NextResponse.json(
        { error: 'No detailed summary in snapshot' },
        { status: 404 }
      )
    }

    let narratives: NarrativeImageInput[] = []
    try {
      const parsed = JSON.parse(detailedStr)
      if (parsed.narratives && Array.isArray(parsed.narratives)) {
        narratives = parsed.narratives.map(
          (n: {
            topic: string
            last_week?: string
            this_week?: string
            next_week_watch?: string
            facts?: { content: string; date: string }[]
          }) => ({
            topic: n.topic ?? '',
            last_week: n.last_week ?? '首次追踪',
            this_week: n.this_week ?? '',
            next_week_watch: n.next_week_watch ?? '',
            facts: n.facts ?? [],
          })
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse snapshot narratives' },
        { status: 500 }
      )
    }

    if (index >= narratives.length) {
      return NextResponse.json(
        { error: `Narrative index ${index} out of range (${narratives.length} narratives)` },
        { status: 404 }
      )
    }

    const pngBuffer = await renderNarrativeImage(narratives[index])

    return new Response(pngBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'Content-Disposition': `inline; filename="narrative-${week}-${index}.png"`,
      },
    })
  } catch (err) {
    console.error('narrative-image render error:', err)
    return NextResponse.json(
      { error: 'Failed to render narrative image' },
      { status: 500 }
    )
  }
}
