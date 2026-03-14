// StablePulse Weekly Email — V18 Premium Redesign
// Design principles:
//   1. 640px width (optimal for modern email clients)
//   2. Confident hero → structured scan → strong CTA → minimal footer
//   3. Single accent color (orange #ff6d00) — no competing hues
//   4. Generous whitespace signals premium quality
//   5. Category badges for instant scanability
//   6. Section dividers: thin rule + label pattern
//   7. Zero CSS3 (no border-radius, no rgba, no box-shadow) for email safety
//   8. font-size >= 13px (Gmail mobile threshold)
//   9. Pure <table> layout with MSO conditional comments

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

const CATEGORY_LABELS: Record<string, string> = {
  market_structure: '市场',
  product: '产品',
  onchain_data: '链上',
  regulatory: '监管',
  funding: '融资',
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  market_structure: { bg: '#fef3c7', text: '#92400e' },
  product: { bg: '#dbeafe', text: '#1e40af' },
  onchain_data: { bg: '#d1fae5', text: '#065f46' },
  regulatory: { bg: '#fce7f3', text: '#9d174d' },
  funding: { bg: '#ede9fe', text: '#5b21b6' },
}

/* ── Context block — refined left-border accent ── */

function buildContextBlock(items: NarrativeContext[]): string {
  if (!items || items.length === 0) return ''

  const rows = items.map((c, i) => {
    const separator = i > 0
      ? '<tr><td style="padding:4px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #f3f4f6;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>'
      : ''

    const insightRow = c.insight
      ? `<tr><td style="padding:0 0 2px;font-size:13px;color:#4b5563;line-height:1.7;">${esc(c.insight)}</td></tr>`
      : `<tr><td style="padding:0 0 2px;font-size:13px;color:#9ca3af;line-height:1.7;">${esc(c.event)}${c.detail ? ` &middot; ${esc(c.detail)}` : ''}</td></tr>`

    return `${separator}${insightRow}`
  }).join('')

  return `<tr><td style="padding:12px 0 4px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td width="3" style="background-color:#ff6d00;font-size:1px;line-height:1px;">&nbsp;</td>
      <td style="background-color:#fffbf5;padding:14px 18px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          ${rows}
        </table>
      </td>
    </tr></table>
  </td></tr>`
}

/* ── Section header with line ── */

function sectionHeader(label: string, color?: string): string {
  const labelColor = color || '#9ca3af'
  return `<tr><td style="padding:0 0 16px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="font-size:11px;font-weight:bold;letter-spacing:2.5px;color:${labelColor};text-transform:uppercase;white-space:nowrap;padding-right:16px;">${label}</td>
        <td width="100%" style="border-top:1px solid #e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td>
      </tr>
    </table>
  </td></tr>`
}

/* ── Narrative cards ── */

function buildNarratives(narratives: NarrativeForEmail[]): string {
  if (narratives.length === 0) return ''

  return narratives.slice(0, 3).map((n) => {
    const weekBadge = n.weekCount && n.weekCount > 1
      ? `<td align="right" valign="middle" style="font-size:11px;color:#ff6d00;font-weight:bold;white-space:nowrap;">&#9679; 第${n.weekCount}周</td>`
      : ''

    const timelineRows: string[] = []

    if (n.origin) {
      timelineRows.push(`<tr>
        <td width="2" valign="top" style="padding:4px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:2px;height:100%;background-color:#e5e7eb;font-size:1px;">&nbsp;</td></tr></table></td>
        <td style="padding:3px 0 3px 14px;font-size:13px;color:#c4c4c4;line-height:1.7;">${esc(n.origin)}</td>
      </tr>`)
    }

    if (n.last_week && n.last_week !== '首次追踪') {
      timelineRows.push(`<tr>
        <td width="2" valign="top" style="padding:4px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:2px;height:100%;background-color:#e5e7eb;font-size:1px;">&nbsp;</td></tr></table></td>
        <td style="padding:3px 0 3px 14px;font-size:13px;color:#9ca3af;line-height:1.7;">${esc(n.last_week)}</td>
      </tr>`)
    }

    timelineRows.push(`<tr>
      <td width="2" valign="top" style="padding:6px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:2px;height:100%;background-color:#ff6d00;font-size:1px;">&nbsp;</td></tr></table></td>
      <td style="padding:6px 0 4px 14px;font-size:15px;color:#111827;line-height:1.5;font-weight:bold;">${esc(n.this_week)}</td>
    </tr>`)

    if (n.next_week_watch) {
      timelineRows.push(`<tr>
        <td width="2" valign="top" style="padding:4px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:2px;height:100%;background-color:#e5e7eb;font-size:1px;border-style:dashed;">&nbsp;</td></tr></table></td>
        <td style="padding:3px 0 3px 14px;font-size:13px;color:#6b7280;line-height:1.7;font-style:italic;">&#9654; ${esc(n.next_week_watch)}</td>
      </tr>`)
    }

    const contextHtml = n.context && n.context.length > 0
      ? buildContextBlock(n.context)
      : ''

    return `<tr><td style="padding:0 0 20px;">
      <!--[if mso]><table cellpadding="0" cellspacing="0" border="1" bordercolor="#e5e7eb" width="100%"><tr><td style="padding:0;"><![endif]-->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;">
        <!-- Card header -->
        <tr><td style="padding:22px 24px 6px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td style="font-size:16px;font-weight:bold;color:#111827;line-height:1.3;letter-spacing:-0.01em;">${esc(n.topic)}</td>
            ${weekBadge}
          </tr></table>
        </td></tr>
        <!-- Timeline body -->
        <tr><td style="padding:4px 24px 22px;">
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

/* ── Signals with category badges ── */

function buildSignals(signals: SignalItem[]): string {
  if (signals.length === 0) return ''

  const grouped: Record<string, SignalItem[]> = {}
  for (const s of signals) {
    const cat = s.category || 'onchain_data'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  }

  // Group by category with sub-headers
  const sections = CATEGORY_ORDER
    .filter(cat => grouped[cat]?.length)
    .map(cat => {
      const items = grouped[cat]!
      const colors = CATEGORY_COLORS[cat] || { bg: '#f3f4f6', text: '#374151' }
      const label = CATEGORY_LABELS[cat] || cat

      const itemRows = items.map(s => {
        let row = `<tr><td style="padding:6px 0;font-size:14px;color:#1f2937;line-height:1.75;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="top" style="padding-right:8px;font-size:14px;color:#d1d5db;line-height:1.75;">&bull;</td>
            <td style="font-size:14px;color:#1f2937;line-height:1.75;">${esc(s.text)}</td>
          </tr></table>
        </td></tr>`

        if (s.structured_context?.insight) {
          row += `<tr><td style="padding:2px 0 8px 16px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td width="3" style="background-color:#ff6d00;font-size:1px;line-height:1px;">&nbsp;</td>
              <td style="background-color:#fffbf5;padding:10px 14px;font-size:13px;color:#4b5563;line-height:1.7;">${esc(s.structured_context.insight)}</td>
            </tr></table>
          </td></tr>`
        } else if (s.context) {
          row += `<tr><td style="padding:2px 0 8px 16px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td width="3" style="background-color:#d1d5db;font-size:1px;line-height:1px;">&nbsp;</td>
              <td style="background-color:#f9fafb;padding:8px 14px;font-size:13px;color:#6b7280;line-height:1.7;">${esc(s.context)}</td>
            </tr></table>
          </td></tr>`
        }

        return row
      }).join('\n')

      // Category sub-header with badge
      return `<tr><td style="padding:12px 0 4px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="background-color:${colors.bg};padding:3px 10px;font-size:11px;font-weight:bold;color:${colors.text};letter-spacing:0.5px;">${esc(label)}</td>
        </tr></table>
      </td></tr>
      ${itemRows}`
    }).join('\n')

  return sections
}

/* ── Briefs ── */

function buildBriefs(briefs: BriefItem[]): string {
  if (!briefs || briefs.length === 0) return ''

  return briefs.slice(0, 10).map(b => {
    if (b.date) {
      return `<tr>
        <td width="56" valign="top" style="padding:8px 0;font-size:12px;color:#9ca3af;font-weight:bold;font-family:monospace;white-space:nowrap;">${esc(b.date)}</td>
        <td valign="top" style="padding:8px 0 8px 12px;font-size:13px;color:#374151;line-height:1.7;">${esc(b.text)}</td>
      </tr>`
    }
    return `<tr><td colspan="2" style="padding:8px 0;font-size:13px;color:#374151;line-height:1.7;">${esc(b.text)}</td></tr>`
  }).join('\n')
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

  const ctaText = '阅读完整周报 &rarr;'

  const sections: string[] = []

  if (hasSignals) {
    sections.push(`<!-- ━━━ SIGNALS ━━━ -->
  <tr><td style="padding:0 40px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${sectionHeader('本周精选')}
      ${signalsHTML}
    </table>
  </td></tr>`)
  }

  if (hasNarratives) {
    if (sections.length > 0) {
      sections.push(`<tr><td style="padding:24px 0;"></td></tr>`)
    }
    sections.push(`<!-- ━━━ NARRATIVES ━━━ -->
  <tr><td style="padding:0 40px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${sectionHeader('叙事追踪', '#ff6d00')}
      ${narrativesHTML}
    </table>
  </td></tr>`)
  }

  if (hasBriefs) {
    if (sections.length > 0) {
      sections.push(`<tr><td style="padding:24px 0;"></td></tr>`)
    }
    sections.push(`<!-- ━━━ BRIEFS ━━━ -->
  <tr><td style="padding:0 40px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${sectionHeader('新闻速览')}
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
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader -->
<div style="display:none;font-size:1px;color:#f0f0f0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${esc(oneLiner)} &mdash; StablePulse ${esc(weekLabel)}
</div>

<!-- Outer wrapper -->
<!--[if mso]><table cellpadding="0" cellspacing="0" border="0" width="640" align="center"><tr><td><![endif]-->
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f0f0f0;">
<tr><td align="center" style="padding:32px 16px;">

<!-- Inner container: 640px -->
<table cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;background-color:#ffffff;">

  <!-- ━━ Orange accent strip (top edge) ━━ -->
  <tr><td style="background-color:#ff6d00;font-size:1px;line-height:4px;height:4px;">&nbsp;</td></tr>

  <!-- ━━ Brand header ━━ -->
  <tr><td style="padding:32px 40px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td valign="middle">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-size:14px;font-weight:bold;letter-spacing:4px;color:#111827;">STABLEPULSE</td>
        </tr></table>
      </td>
      <td align="right" style="font-size:12px;color:#9ca3af;letter-spacing:0.5px;">${esc(weekLabel)}</td>
    </tr></table>
  </td></tr>

  <!-- ━━ One-liner (HERO) ━━ -->
  <tr><td style="padding:32px 40px 12px;font-size:26px;font-weight:bold;color:#111827;line-height:1.3;letter-spacing:-0.02em;">
    ${esc(oneLiner)}
  </td></tr>

  <!-- Market line -->
  ${marketLine ? `<tr><td style="padding:0 40px 0;font-size:13px;color:#9ca3af;line-height:1.6;font-family:monospace;">${esc(marketLine)}</td></tr>` : ''}

  <!-- Breathing space -->
  <tr><td style="padding:20px 40px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:2px solid #111827;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>
  <tr><td style="padding:24px 0;"></td></tr>

  ${sections.join('\n\n  ')}

  <!-- ━━━ CTA ━━━ -->
  <tr><td style="padding:44px 40px 32px;" align="center">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(webLink)}" style="height:52px;v-text-anchor:middle;width:320px;" arcsize="0%" fillcolor="#ff6d00" stroke="f">
      <w:anchorlock/>
      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;">${esc(ctaText)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${esc(webLink)}" target="_blank" style="display:inline-block;background-color:#ff6d00;color:#ffffff;padding:16px 56px;font-size:14px;font-weight:bold;text-decoration:none;font-family:Arial,sans-serif;letter-spacing:1px;">${ctaText}</a>
    <!--<![endif]-->
  </td></tr>

  <!-- ━━━ Credibility strip ━━━ -->
  <tr><td style="padding:0 40px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="border-top:1px solid #e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:16px 40px 20px;" align="center">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-size:13px;color:#9ca3af;line-height:1.6;font-family:monospace;" align="center">
        ${stats.factCount} 条事实&nbsp;&nbsp;&middot;&nbsp;&nbsp;${stats.verifiedCount} 条已验证&nbsp;&nbsp;&middot;&nbsp;&nbsp;${stats.sourceCount} 个来源
      </td>
    </tr></table>
  </td></tr>

  <!-- ━━━ Footer ━━━ -->
  <tr><td style="background-color:#111827;padding:28px 40px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td>
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="width:3px;height:12px;background-color:#ff6d00;font-size:1px;">&nbsp;</td>
            <td style="padding-left:10px;font-size:11px;color:#9ca3af;letter-spacing:2.5px;font-weight:bold;">STABLEPULSE</td>
          </tr></table>
        </td>
        <td align="right"><a href="{{unsubscribe_url}}" style="font-size:11px;color:#6b7280;text-decoration:underline;">退订</a></td>
      </tr>
      <tr><td colspan="2" style="padding-top:12px;font-size:11px;color:#4b5563;line-height:1.6;">
        AI 生成 &middot; 人工审核 &middot; 稳定币行业原子知识引擎
      </td></tr>
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
