// Admin API: Undo today's processing step (safe — does NOT touch raw_items
// collection). Deletes events created today (Asia/Shanghai), resets the
// processed flag on raw_items that were consumed by those events, and clears
// included_in_daily on recent events so they're eligible for the next digest
// push.
//
// Cross-day-dedup caveat: if today's processing UPDATED events from earlier
// days (added source_urls / entity_names), those updates are NOT rolled back.
// For the intended use case (iterating on today's digest layout) this is fine.

import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/db/client'

// Start of "today" in Asia/Shanghai, returned as an ISO timestamp in UTC.
function todayStartSHISO(): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  // Asia/Shanghai is UTC+8 with no DST, so today-00:00 SH = today-16:00-prev UTC
  return `${get('year')}-${get('month')}-${get('day')}T00:00:00+08:00`
}

export async function POST(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    const todayStart = todayStartSHISO()

    // 1. Find events created today.
    const { data: todayEvents, error: findErr } = await supabaseAdmin
      .from('events')
      .select('id')
      .gte('created_at', todayStart)

    if (findErr) throw new Error(`list events: ${findErr.message}`)
    const eventIds = (todayEvents ?? []).map(e => e.id)

    // 2. Collect raw_item_ids referenced by those events (before we delete).
    let rawItemIds: string[] = []
    if (eventIds.length > 0) {
      const { data: links, error: linkErr } = await supabaseAdmin
        .from('event_sources')
        .select('raw_item_id')
        .in('event_id', eventIds)
      if (linkErr) throw new Error(`list event_sources: ${linkErr.message}`)
      rawItemIds = [...new Set((links ?? []).map(l => l.raw_item_id))]
    }

    // 3. Delete today's events (event_sources rows cascade).
    let deletedCount = 0
    if (eventIds.length > 0) {
      const { error: delErr, count } = await supabaseAdmin
        .from('events')
        .delete({ count: 'exact' })
        .in('id', eventIds)
      if (delErr) throw new Error(`delete events: ${delErr.message}`)
      deletedCount = count ?? eventIds.length
    }

    // 4. Reset raw_items.processed so they can be re-extracted.
    let resetRawCount = 0
    if (rawItemIds.length > 0) {
      const { error: resetErr, count } = await supabaseAdmin
        .from('raw_items')
        .update({ processed: false }, { count: 'exact' })
        .in('id', rawItemIds)
      if (resetErr) throw new Error(`reset raw_items: ${resetErr.message}`)
      resetRawCount = count ?? rawItemIds.length
    }

    // 5. Clear included_in_daily on events from the last 36h so the next push
    //    re-picks them (events the earlier push already claimed today).
    const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
    const { error: flagErr, count: clearedFlagCount } = await supabaseAdmin
      .from('events')
      .update({ included_in_daily: false }, { count: 'exact' })
      .gte('published_at', since)
      .eq('included_in_daily', true)
    if (flagErr) throw new Error(`clear included_in_daily: ${flagErr.message}`)

    return NextResponse.json({
      status: 'done',
      today_start: todayStart,
      events_deleted: deletedCount,
      raw_items_reset: resetRawCount,
      daily_flag_cleared: clearedFlagCount ?? 0,
    })
  } catch (err) {
    console.error('[admin/undo-today] failed:', err)
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
