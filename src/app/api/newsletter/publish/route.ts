import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { generateEmailHTML, weekToDateRange, type NarrativeForEmail, type SignalItem, type EmailData } from '@/lib/email-template'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://payfi-monthly-report.vercel.app'

export async function POST(req: NextRequest) {
  try {
    const { weekNumber } = await req.json().catch(() => ({ weekNumber: undefined }))
    const week = weekNumber ?? getCurrentWeekNumber()

    // ── 1. Fetch snapshot data ──
    const { data: snapshot } = await supabaseAdmin
      .from('weekly_snapshots')
      .select('snapshot_data')
      .eq('week_number', week)
      .single()

    if (!snapshot?.snapshot_data) {
      return NextResponse.json({ error: '该周暂无快照数据' }, { status: 404 })
    }

    const sd = snapshot.snapshot_data as Record<string, unknown>

    // ── 2. Fetch verified facts ──
    const { data: facts } = await supabaseAdmin
      .from('atomic_facts')
      .select('content_zh, fact_type, tags, source_url, metric_name, metric_value, metric_unit, metric_change, verification_status, fact_date')
      .in('verification_status', ['verified', 'partially_verified'])
      .eq('week_number', week)
      .order('fact_date', { ascending: false })
      .limit(200)

    const allFacts = facts ?? []

    // ── 3. Build weekLabel ──
    const weekLabel = weekToDateRange(week)

    // ── 4. Extract oneLiner + marketLine from weekly_summary_detailed ──
    let oneLiner = ''
    let marketLine: string | undefined
    const detailedStr = sd.weekly_summary_detailed as string | undefined
    if (detailedStr) {
      try {
        const parsed = JSON.parse(detailedStr)
        // V13 format: { oneLiner, marketLine, ... } or array of summary items
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          oneLiner = parsed.oneLiner || parsed.one_liner || ''
          marketLine = parsed.marketLine || parsed.market_line
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          // V12 fallback: use first item's simple_zh as oneLiner
          oneLiner = parsed[0]?.simple_zh || parsed[0]?.simple || ''
        }
      } catch { /* ignore */ }
    }

    // Fallback oneLiner from weekly_summary
    if (!oneLiner) {
      oneLiner = (sd.weekly_summary as string) || `本周 ${allFacts.length} 条事实`
    }

    // ── 5. Transform narratives ──
    const rawNarratives = (sd.narratives as Array<{
      topic: string
      summary: string
      nodes?: Array<{ date: string; title: string; description: string; isPrediction?: boolean }>
    }>) ?? []

    const narratives: NarrativeForEmail[] = rawNarratives.slice(0, 3).map(n => {
      const result: NarrativeForEmail = {
        topic: n.topic,
        this_week: n.summary,
      }

      if (n.nodes && n.nodes.length > 0) {
        // Sort nodes: non-prediction by date desc
        const pastNodes = n.nodes.filter(nd => !nd.isPrediction).sort((a, b) => b.date.localeCompare(a.date))
        const futureNodes = n.nodes.filter(nd => nd.isPrediction)

        // Most recent = this_week, second = last_week
        if (pastNodes.length > 0) {
          result.this_week = pastNodes[0].description || pastNodes[0].title
        }
        if (pastNodes.length > 1) {
          result.last_week = pastNodes[1].description || pastNodes[1].title
          result.weekCount = pastNodes.length
        }
        if (pastNodes.length > 2) {
          // Origin = earliest node
          const earliest = pastNodes[pastNodes.length - 1]
          result.origin = earliest.description || earliest.title
        }
        if (futureNodes.length > 0) {
          result.next_week_watch = futureNodes[0].description || futureNodes[0].title
        }
      }

      // Context: populated by Context Engine (future). Empty for now.
      return result
    })

    // ── 6. Build signals from atomic_facts ──
    // Map fact_type/tags to signal categories
    const signals: SignalItem[] = []
    const signalFacts = allFacts.slice(0, 10) // Top 10 most recent

    for (const f of signalFacts) {
      const fact = f as { content_zh: string; fact_type: string; tags: string[]; metric_change?: string }
      const category = inferSignalCategory(fact.fact_type, fact.tags)
      signals.push({
        category,
        text: fact.content_zh,
        // Context from reference_events would go here (future)
      })
    }

    // ── 7. Compute stats ──
    const verifiedCount = allFacts.filter((f: { verification_status?: string }) => f.verification_status === 'verified').length
    const sourceUrls = new Set(allFacts.map((f: { source_url?: string }) => {
      try { return new URL(f.source_url || '').hostname } catch { return '' }
    }).filter(Boolean))

    const stats = {
      factCount: allFacts.length,
      verifiedCount,
      sourceCount: sourceUrls.size || 1,
    }

    // ── 8. Generate HTML ──
    const emailData: EmailData = {
      weekLabel,
      marketLine,
      oneLiner,
      narratives,
      signals,
      stats,
      weekUrl: `${SITE_URL}/weekly/${week}`,
    }

    const html = generateEmailHTML(emailData)
    const reportDate = weekToMondayDate(week)
    const subject = `StablePulse | ${weekLabel}`

    // ── 9. Upsert into reports table ──
    const { error } = await supabaseAdmin
      .from('reports')
      .upsert({
        date: reportDate,
        subject,
        content: html,
      }, {
        onConflict: 'date',
      })

    if (error) {
      console.error('[newsletter] Publish error:', error)
      return NextResponse.json({ error: `发布失败: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, date: reportDate, subject, factCount: allFacts.length })
  } catch (err) {
    console.error('[newsletter] Publish error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/** Map fact_type + tags to one of the 5 signal categories */
function inferSignalCategory(
  factType: string,
  tags: string[]
): SignalItem['category'] {
  const tagStr = (tags ?? []).join(' ').toLowerCase()

  if (factType === 'metric' || tagStr.includes('tvl') || tagStr.includes('市值') || tagStr.includes('market')) {
    return 'market_structure'
  }
  if (tagStr.includes('funding') || tagStr.includes('融资') || tagStr.includes('raise')) {
    return 'funding'
  }
  if (tagStr.includes('regulat') || tagStr.includes('监管') || tagStr.includes('sec') || tagStr.includes('法案') || tagStr.includes('act')) {
    return 'regulatory'
  }
  if (factType === 'event' && (tagStr.includes('chain') || tagStr.includes('链上') || tagStr.includes('onchain'))) {
    return 'onchain_data'
  }
  if (tagStr.includes('product') || tagStr.includes('产品') || tagStr.includes('launch') || tagStr.includes('integrat')) {
    return 'product'
  }

  // Default based on fact_type
  if (factType === 'metric') return 'onchain_data'
  return 'market_structure'
}

function weekToMondayDate(week: string): string {
  const [yearStr, wPart] = week.split('-W')
  const year = Number(yearStr)
  const num = Number(wPart)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (num - 1) * 7)
  return monday.toISOString().split('T')[0]
}
