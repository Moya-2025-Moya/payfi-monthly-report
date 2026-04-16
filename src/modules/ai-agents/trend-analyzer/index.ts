// Trend Analyzer — Weekly trend analysis with AI opinion
//
// Runs every Monday. Analyzes past 7 days of events to identify 3-5 trends.
// This is the ONLY place in the system where AI is allowed to give opinions.

import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import type { Event, WeeklyTrend, WeeklySummary, WeeklyStats, EventCategory } from '@/lib/types'

interface AITrendResponse {
  trends: {
    title_zh: string
    title_en: string
    description_zh: string
    description_en: string
    direction: 'heating' | 'cooling' | 'stable' | 'emerging'
    event_indices: number[]
  }[]
  summary_zh: string
  summary_en: string
}

export async function analyzeTrends(): Promise<WeeklySummary | null> {
  // Get past 7 days of events
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .gte('published_at', sevenDaysAgo.toISOString())
    .order('importance', { ascending: true })
    .order('published_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[trend-analyzer] Failed to fetch events:', error.message)
    return null
  }

  if (!events || events.length === 0) {
    console.log('[trend-analyzer] No events in past 7 days')
    return null
  }

  const allEvents = events as Event[]
  console.log(`[trend-analyzer] Analyzing ${allEvents.length} events from past 7 days`)

  // Build event list for AI
  const eventList = allEvents.map((e, i) =>
    `[${i}] [${e.category}] [importance:${e.importance}] ${e.title_zh} — ${e.summary_zh.slice(0, 80)} (${e.entity_names.join(', ')})`
  ).join('\n')

  // AI trend analysis — opinion allowed here
  const result = await callHaikuJSON<AITrendResponse>(
    `Analyze these events from the past week in the stablecoin/PayFi ecosystem. Identify 3-5 key trends.

${eventList}

For each trend:
1. Give it a concise title
2. Describe what happened and WHY it matters
3. You ARE allowed to give directional opinions (升温/降温/emerging)
4. Reference specific events by their [index]

Also write a 2-3 sentence overall summary of the week.

Return JSON:
{
  "trends": [
    {
      "title_zh": "趋势标题",
      "title_en": "Trend title",
      "description_zh": "描述+研判...",
      "description_en": "Description+analysis...",
      "direction": "heating|cooling|stable|emerging",
      "event_indices": [0, 3, 7]
    }
  ],
  "summary_zh": "本周整体概述...",
  "summary_en": "This week overview..."
}`,
    { system: 'You are a stablecoin/PayFi market analyst. You may express directional opinions about market trends. Be specific and reference actual events.', maxTokens: 4096 }
  )

  // Build stats
  const categoryBreakdown: Record<EventCategory, number> = {} as Record<EventCategory, number>
  const entityMentions: Record<string, number> = {}

  for (const e of allEvents) {
    categoryBreakdown[e.category as EventCategory] = (categoryBreakdown[e.category as EventCategory] ?? 0) + 1
    for (const name of e.entity_names) {
      entityMentions[name] = (entityMentions[name] ?? 0) + 1
    }
  }

  const stats: WeeklyStats = {
    event_count: allEvents.length,
    category_breakdown: categoryBreakdown,
    entity_mentions: entityMentions,
  }

  // Map event indices to IDs
  const trends: WeeklyTrend[] = (result.trends ?? []).map(t => ({
    title_zh: t.title_zh,
    title_en: t.title_en,
    description_zh: t.description_zh,
    description_en: t.description_en,
    direction: t.direction,
    event_ids: (t.event_indices ?? [])
      .filter(i => i >= 0 && i < allEvents.length)
      .map(i => allEvents[i].id),
  }))

  const weekNumber = getCurrentWeekNumber()

  // Save to DB
  const { data: saved, error: saveError } = await supabaseAdmin
    .from('weekly_summaries')
    .upsert({
      week_number: weekNumber,
      summary_zh: result.summary_zh ?? '',
      summary_en: result.summary_en ?? null,
      trends,
      stats,
    }, { onConflict: 'week_number' })
    .select()
    .single()

  if (saveError) {
    console.error('[trend-analyzer] Failed to save summary:', saveError.message)
    return null
  }

  // Mark events as included in weekly
  const eventIds = allEvents.map(e => e.id)
  await supabaseAdmin
    .from('events')
    .update({ included_in_weekly: true })
    .in('id', eventIds)

  console.log(`[trend-analyzer] Saved weekly summary: ${weekNumber} with ${trends.length} trends`)
  return saved as WeeklySummary
}
