// StablePulse Weekly Email — V16 Redesign
// Design principles:
//   1. 680px width (modern standard, supported by Gmail/Apple Mail/Outlook 365)
//   2. Information density curve: dense→deep→scan→light (like breathing)
//   3. Context blocks are the PROTAGONIST — left-border accent, neutral bg
//   4. Delta values (#ff6d00 orange bold) are the punchline of every comparison
//   5. Zero CSS3 (no border-radius, no rgba, no box-shadow) for email safety
//   6. font-size >= 13px (Gmail mobile threshold)
//   7. Pure <table> layout with MSO conditional comments

const SITE_URL = 'https://payfi-monthly-report.vercel.app'

/* ── Types ── */

export interface NarrativeContext {
  event: string
  detail: string
  current_entity?: string
  current_value?: string
  delta_label?: string
  comparison_basis?: string
  insight?: string
}

export interface NarrativeForEmail {
  topic: string
  weekCount?: number
  origin?: string
  last_week?: string
  this_week: string
  next_week_watch?: string
  context?: NarrativeContext[]
}

export interface SignalItem {
  category: 'market_structure' | 'product' | 'onchain_data' | 'regulatory' | 'funding'
  text: string
  context?: string
  structured_context?: NarrativeContext
  source_url?: string
}

export interface BriefItem {
  text: string
  date?: string
}

export interface EmailStats {
  factCount: number
  verifiedCount: number
  sourceCount: number
}

export interface EmailData {
  weekLabel: string
  marketLine?: string
  oneLiner: string
  narratives: NarrativeForEmail[]
  signals: SignalItem[]
  briefs?: BriefItem[]
  stats: EmailStats
  weekUrl?: string
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/* ── Category config ── */

const CATEGORY_ORDER: Array<SignalItem['category']> = [
  'market_structure', 'product', 'onchain_data', 'regulatory', 'funding',
]

/* ── Context block — left-border accent (core visual) ── */

function buildContextBlock(items: NarrativeContext[]): string {
  if (!items || items.length === 0) return ''

  const rows = items.map((c, i) => {
    const separator = i > 0
      ? '<tr><td style="padding:6px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #e8e8e8;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>'
      : ''

    // Skip comparison_basis — only show insight (the useful part)
    // If insight exists, show it as primary; event/detail as supporting
    const insightRow = c.insight
      ? `<tr><td style="padding:0 0 2px;font-size:13px;color:#555555;line-height:1.6;">${esc(c.insight)}</td></tr>`
      : `<tr><td style="padding:0 0 2px;font-size:13px;color:#888888;line-height:1.6;">${esc(c.event)}${c.detail ? ` &middot; ${esc(c.detail)}` : ''}</td></tr>`

    return `${separator}${insightRow}`
  }).join('')

  return `<tr><td style="padding:10px 0 4px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td width="3" style="background-color:#c4c4c4;font-size:1px;line-height:1px;">&nbsp;</td>
      <td style="background-color:#f5f5f5;padding:14px 18px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          ${rows}
        </table>
      </td>
    </tr></table>
  </td></tr>`
}

/* ── Narrative cards ── */

function buildNarratives(narratives: NarrativeForEmail[]): string {
  if (narratives.length === 0) return ''

  return narratives.slice(0, 3).map(n => {
    const weekBadge = n.weekCount && n.weekCount > 1
      ? `<td align="right" valign="middle" style="font-size:12px;color:#ff6d00;font-weight:bold;">第${n.weekCount}周</td>`
      : ''

    // Timeline rows — story flow, not form fields
    const timelineRows: string[] = []

    if (n.origin) {
      timelineRows.push(`<tr><td style="padding:3px 0;font-size:14px;color:#bbbbbb;line-height:1.6;">
        &mdash; ${esc(n.origin)}
      </td></tr>`)
    }

    if (n.last_week && n.last_week !== '首次追踪') {
      timelineRows.push(`<tr><td style="padding:3px 0;font-size:14px;color:#999999;line-height:1.6;">
        &mdash; ${esc(n.last_week)}
      </td></tr>`)
    }

    // "本周" is the star — largest, boldest, darkest, no prefix
    timelineRows.push(`<tr><td style="padding:6px 0 4px;font-size:16px;color:#1a1a1a;line-height:1.5;font-weight:bold;">
      ${esc(n.this_week)}
    </td></tr>`)

    // Context block (the comparison — protagonist)
    const contextHtml = n.context && n.context.length > 0
      ? buildContextBlock(n.context)
      : ''

    return `<tr><td style="padding:0 0 20px;">
      <!--[if mso]><table cellpadding="0" cellspacing="0" border="1" bordercolor="#e0e0e0" width="100%"><tr><td style="padding:0;"><![endif]-->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e0e0e0;border-top:2px solid #cccccc;">
        <!-- Card header -->
        <tr><td style="padding:16px 24px 4px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td style="font-size:17px;font-weight:bold;color:#1a1a1a;line-height:1.3;">${esc(n.topic)}</td>
            ${weekBadge}
          </tr></table>
        </td></tr>
        <!-- Card body -->
        <tr><td style="padding:4px 24px 16px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            ${timelineRows.join('\n')}
            ${contextHtml}
          </table>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>`
  }).join('\n')
}

/* ── Signals ── */

function buildSignals(signals: SignalItem[]): string {
  if (signals.length === 0) return ''

  const grouped: Record<string, SignalItem[]> = {}
  for (const s of signals) {
    const cat = s.category || 'onchain_data'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  }

  // Flat list — no category labels, but ordered by category
  const allItems = CATEGORY_ORDER
    .filter(cat => grouped[cat]?.length)
    .flatMap(cat => grouped[cat]!)

  return allItems.map(s => {
    let row = `<tr><td style="padding:3px 0;font-size:14px;color:#333333;line-height:1.7;">&middot;&nbsp; ${esc(s.text)}</td></tr>`

    // Context — prefer structured, with left-border accent
    // Skip comparison_basis ("两者均为xxx") — it's noise. Only show insight.
    if (s.structured_context) {
      const sc = s.structured_context

      let ctxHtml = ''
      if (sc.insight) {
        ctxHtml = `<span style="color:#555555;font-size:13px;">${esc(sc.insight)}</span>`
      } else {
        ctxHtml = `<span style="color:#888888;font-size:13px;">${esc(sc.event)}${sc.detail ? ` &middot; ${esc(sc.detail)}` : ''}</span>`
      }

      row += `<tr><td style="padding:2px 0 6px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="3" style="background-color:#c4c4c4;font-size:1px;line-height:1px;">&nbsp;</td>
          <td style="background-color:#f5f5f5;padding:10px 14px;font-size:13px;color:#666666;line-height:1.7;">${ctxHtml}</td>
        </tr></table>
      </td></tr>`
    } else if (s.context) {
      row += `<tr><td style="padding:2px 0 6px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="3" style="background-color:#c4c4c4;font-size:1px;line-height:1px;">&nbsp;</td>
          <td style="background-color:#f5f5f5;padding:8px 14px;font-size:13px;color:#666666;line-height:1.7;">${esc(s.context)}</td>
        </tr></table>
      </td></tr>`
    }

    return row
  }).join('\n')
}

/* ── Briefs ── */

function buildBriefs(briefs: BriefItem[]): string {
  if (!briefs || briefs.length === 0) return ''

  return briefs.slice(0, 10).map(b => {
    if (b.date) {
      return `<tr>
        <td width="48" valign="top" style="padding:5px 0;font-size:13px;color:#999999;font-weight:bold;font-family:monospace;white-space:nowrap;">${esc(b.date)}</td>
        <td valign="top" style="padding:5px 0 5px 8px;font-size:14px;color:#444444;line-height:1.6;">${esc(b.text)}</td>
      </tr>`
    }
    return `<tr><td colspan="2" style="padding:5px 0;font-size:14px;color:#444444;line-height:1.6;">${esc(b.text)}</td></tr>`
  }).join('\n')
}

/* ── Section divider ── */

function divider(): string {
  return `<tr><td style="padding:12px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #eeeeee;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>`
}

/* ── Main generator ── */

export function generateEmailHTML(data: EmailData): string {
  const { weekLabel, marketLine, oneLiner, narratives, signals, briefs, stats, weekUrl } = data
  const webLink = weekUrl || `${SITE_URL}/weekly/current`

  const narrativesHTML = buildNarratives(narratives)
  const signalsHTML = buildSignals(signals)
  const briefsHTML = buildBriefs(briefs ?? [])

  const hasSignals = signals.length > 0
  const hasNarratives = narratives.length > 0
  const hasBriefs = (briefs ?? []).length > 0

  const coveredCount = narratives.length * 3 + signals.length + (briefs ?? []).length
  const remainingCount = Math.max(0, stats.factCount - coveredCount)
  const ctaText = remainingCount > 3
    ? `另有 ${remainingCount} 条本周事实 →`
    : '查看完整版 →'

  // Build sections with conditional dividers
  const sections: string[] = []

  if (hasSignals) {
    sections.push(`<!-- ━━━━━━ 本周精选 (SIGNALS) ━━━━━━ -->
  <tr><td style="padding:0 28px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="padding:0 0 12px;font-size:13px;font-weight:bold;letter-spacing:1.5px;color:#999999;">本周精选</td></tr>
      ${signalsHTML}
    </table>
  </td></tr>`)
  }

  if (hasNarratives) {
    if (sections.length > 0) {
      sections.push(`<tr><td style="padding:0 28px;">${divider().replace(/<tr><td[^>]*>/, '').replace(/<\/td><\/tr>$/, '')}</td></tr>`)
    }
    sections.push(`<!-- ━━━━━━ 本周叙事 (NARRATIVES) ━━━━━━ -->
  <tr><td style="padding:4px 28px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="padding:0 0 12px;font-size:13px;font-weight:bold;letter-spacing:1.5px;color:#999999;">本周叙事</td></tr>
      ${narrativesHTML}
    </table>
  </td></tr>`)
  }

  if (hasBriefs) {
    if (sections.length > 0) {
      sections.push(`<tr><td style="padding:0 28px;">${divider().replace(/<tr><td[^>]*>/, '').replace(/<\/td><\/tr>$/, '')}</td></tr>`)
    }
    sections.push(`<!-- ━━━━━━ 新闻速览 (BRIEFS) ━━━━━━ -->
  <tr><td style="padding:4px 28px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="padding:0 0 8px;font-size:13px;font-weight:bold;letter-spacing:1.5px;color:#999999;">新闻速览</td></tr>
      ${briefsHTML}
    </table>
  </td></tr>`)
  }

  return `<!DOCTYPE html>
<html lang="zh-CN" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>StablePulse | ${esc(weekLabel)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <style type="text/css">table{border-collapse:collapse;}td{font-family:Arial,sans-serif;}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader -->
<div style="display:none;font-size:1px;color:#f2f2f2;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${esc(oneLiner)} &mdash; StablePulse ${esc(weekLabel)}
</div>

<!-- Outer wrapper -->
<!--[if mso]><table cellpadding="0" cellspacing="0" border="0" width="680" align="center"><tr><td><![endif]-->
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f2f2f2;">
<tr><td align="center" style="padding:20px 12px;">

<!-- Inner container: 680px -->
<table cellpadding="0" cellspacing="0" border="0" width="680" style="max-width:680px;background-color:#ffffff;">

  <!-- ━━ Brand header ━━ -->
  <tr><td style="padding:32px 28px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:13px;font-weight:bold;letter-spacing:3px;color:#ff6d00;">STABLEPULSE</td>
      <td align="right" style="font-size:13px;color:#aaaaaa;">${esc(weekLabel)}</td>
    </tr></table>
  </td></tr>

  <!-- Orange accent line -->
  <tr><td style="padding:14px 28px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:2px solid #ff6d00;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>

  <!-- ━━ One-liner (HERO — largest element in entire email) ━━ -->
  <tr><td style="padding:24px 28px 6px;font-size:22px;font-weight:bold;color:#111111;line-height:1.35;">
    ${esc(oneLiner)}
  </td></tr>

  <!-- Market line -->
  ${marketLine ? `<tr><td style="padding:0 28px 32px;font-size:14px;color:#999999;line-height:1.6;">${esc(marketLine)}</td></tr>` : '<tr><td style="padding:0 0 32px;"></td></tr>'}

  ${sections.join('\n\n  ')}

  <!-- ━━━━━━ CTA ━━━━━━ -->
  <tr><td style="padding:36px 28px 24px;" align="center">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(webLink)}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="0%" fillcolor="#ff6d00" stroke="f">
      <w:anchorlock/>
      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${esc(ctaText)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${esc(webLink)}" target="_blank" style="display:inline-block;background-color:#ff6d00;color:#ffffff;padding:12px 32px;font-size:15px;font-weight:bold;text-decoration:none;font-family:Arial,sans-serif;">${esc(ctaText)}</a>
    <!--<![endif]-->
  </td></tr>

  <!-- ━━━━━━ Footer ━━━━━━ -->
  <tr><td style="padding:0 28px 32px;" align="center">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-size:12px;color:#bbbbbb;line-height:1.6;" align="center">
        AI 生成 &middot; 人工审核
      </td>
    </tr></table>
  </td></tr>

  <!-- Brand footer (gray bg) -->
  <tr><td style="background-color:#f7f7f7;padding:20px 28px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="font-size:11px;color:#cccccc;letter-spacing:2px;">STABLEPULSE</td>
        <td align="right"><a href="{{unsubscribe_url}}" style="font-size:11px;color:#cccccc;text-decoration:underline;">退订</a></td>
      </tr>
    </table>
  </td></tr>

</table>

</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->

</body>
</html>`
}

/** Convert week number to date range string */
export function weekToDateRange(weekNumber: string): string {
  const [yearStr, wPart] = weekNumber.split('-W')
  const year = Number(yearStr)
  const num = Number(wPart)
  if (isNaN(year) || isNaN(num)) return weekNumber
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (num - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmtDate = (d: Date) =>
    `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`
  return `${fmtDate(monday)} - ${fmtDate(sunday)}`
}

/** Get the Monday date of a given ISO week as YYYY-MM-DD */
export function weekToMondayDate(weekNumber: string): string {
  const [yearStr, wPart] = weekNumber.split('-W')
  const year = Number(yearStr)
  const num = Number(wPart)
  if (isNaN(year) || isNaN(num)) return new Date().toISOString().split('T')[0]
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (num - 1) * 7)
  return monday.toISOString().split('T')[0]
}
