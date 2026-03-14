// StablePulse Weekly Email — V17 Premium Redesign
// Design principles:
//   1. 640px width (optimal for modern email clients)
//   2. Breathing rhythm: hero → dense → spacious → dense → calm
//   3. Refined typography: system font stack, tight heading spacing
//   4. Accent used surgically: orange for brand + CTA only
//   5. Context blocks: subtle left border + warm gray bg
//   6. Zero CSS3 (no border-radius, no rgba, no box-shadow) for email safety
//   7. font-size >= 13px (Gmail mobile threshold)
//   8. Pure <table> layout with MSO conditional comments

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

/* ── Context block — refined left-border accent ── */

function buildContextBlock(items: NarrativeContext[]): string {
  if (!items || items.length === 0) return ''

  const rows = items.map((c, i) => {
    const separator = i > 0
      ? '<tr><td style="padding:5px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #ebebeb;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>'
      : ''

    const insightRow = c.insight
      ? `<tr><td style="padding:0 0 2px;font-size:13px;color:#4b5563;line-height:1.7;">${esc(c.insight)}</td></tr>`
      : `<tr><td style="padding:0 0 2px;font-size:13px;color:#9ca3af;line-height:1.7;">${esc(c.event)}${c.detail ? ` &middot; ${esc(c.detail)}` : ''}</td></tr>`

    return `${separator}${insightRow}`
  }).join('')

  return `<tr><td style="padding:12px 0 4px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td width="3" style="background-color:#d1d5db;font-size:1px;line-height:1px;">&nbsp;</td>
      <td style="background-color:#f9fafb;padding:14px 18px;">
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

  return narratives.slice(0, 3).map((n, idx) => {
    const weekBadge = n.weekCount && n.weekCount > 1
      ? `<td align="right" valign="middle" style="font-size:11px;color:#ff6d00;font-weight:bold;">&#9679; 第${n.weekCount}周</td>`
      : ''

    const timelineRows: string[] = []

    if (n.origin) {
      timelineRows.push(`<tr><td style="padding:3px 0;font-size:13px;color:#c4c4c4;line-height:1.7;">
        &mdash; ${esc(n.origin)}
      </td></tr>`)
    }

    if (n.last_week && n.last_week !== '首次追踪') {
      timelineRows.push(`<tr><td style="padding:3px 0;font-size:13px;color:#9ca3af;line-height:1.7;">
        &mdash; ${esc(n.last_week)}
      </td></tr>`)
    }

    timelineRows.push(`<tr><td style="padding:6px 0 4px;font-size:15px;color:#111827;line-height:1.5;font-weight:bold;">
      ${esc(n.this_week)}
    </td></tr>`)

    const contextHtml = n.context && n.context.length > 0
      ? buildContextBlock(n.context)
      : ''

    // Alternate subtle background for visual rhythm
    const cardBg = idx % 2 === 0 ? '#ffffff' : '#fafafa'

    return `<tr><td style="padding:0 0 16px;">
      <!--[if mso]><table cellpadding="0" cellspacing="0" border="1" bordercolor="#e5e7eb" width="100%"><tr><td style="padding:0;"><![endif]-->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;background-color:${cardBg};">
        <!-- Accent top bar -->
        <tr><td style="background-color:#2563eb;font-size:1px;line-height:3px;height:3px;">&nbsp;</td></tr>
        <!-- Card header -->
        <tr><td style="padding:20px 24px 4px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td style="font-size:16px;font-weight:bold;color:#111827;line-height:1.3;letter-spacing:-0.01em;">${esc(n.topic)}</td>
            ${weekBadge}
          </tr></table>
        </td></tr>
        <!-- Card body -->
        <tr><td style="padding:4px 24px 20px;">
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

  // Group by category with subtle category labels
  const sections = CATEGORY_ORDER
    .filter(cat => grouped[cat]?.length)
    .map(cat => {
      const items = grouped[cat]!
      const label = CATEGORY_LABELS[cat] || cat

      const itemsHtml = items.map(s => {
        let row = `<tr><td style="padding:4px 0;font-size:14px;color:#1f2937;line-height:1.75;">&middot;&nbsp; ${esc(s.text)}</td></tr>`

        if (s.structured_context) {
          const sc = s.structured_context
          let ctxHtml = ''
          if (sc.insight) {
            ctxHtml = `<span style="color:#4b5563;font-size:13px;">${esc(sc.insight)}</span>`
          } else {
            ctxHtml = `<span style="color:#9ca3af;font-size:13px;">${esc(sc.event)}${sc.detail ? ` &middot; ${esc(sc.detail)}` : ''}</span>`
          }

          row += `<tr><td style="padding:2px 0 8px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td width="3" style="background-color:#d1d5db;font-size:1px;line-height:1px;">&nbsp;</td>
              <td style="background-color:#f9fafb;padding:10px 14px;font-size:13px;color:#6b7280;line-height:1.7;">${ctxHtml}</td>
            </tr></table>
          </td></tr>`
        } else if (s.context) {
          row += `<tr><td style="padding:2px 0 8px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td width="3" style="background-color:#d1d5db;font-size:1px;line-height:1px;">&nbsp;</td>
              <td style="background-color:#f9fafb;padding:8px 14px;font-size:13px;color:#6b7280;line-height:1.7;">${esc(s.context)}</td>
            </tr></table>
          </td></tr>`
        }

        return row
      }).join('\n')

      return `<tr><td style="padding:2px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding:8px 0 4px;font-size:11px;font-weight:bold;letter-spacing:1px;color:#9ca3af;text-transform:uppercase;">${label}</td></tr>
          ${itemsHtml}
        </table>
      </td></tr>`
    }).join('\n')

  return sections
}

/* ── Briefs ── */

function buildBriefs(briefs: BriefItem[]): string {
  if (!briefs || briefs.length === 0) return ''

  return briefs.slice(0, 10).map(b => {
    if (b.date) {
      return `<tr>
        <td width="44" valign="top" style="padding:6px 0;font-size:12px;color:#9ca3af;font-weight:bold;font-family:monospace;white-space:nowrap;">${esc(b.date)}</td>
        <td valign="top" style="padding:6px 0 6px 12px;font-size:13px;color:#374151;line-height:1.7;">${esc(b.text)}</td>
      </tr>`
    }
    return `<tr><td colspan="2" style="padding:6px 0;font-size:13px;color:#374151;line-height:1.7;">${esc(b.text)}</td></tr>`
  }).join('\n')
}

/* ── Section divider ── */

function divider(): string {
  return `<tr><td style="padding:16px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #f3f4f6;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>`
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

  const sections: string[] = []

  if (hasSignals) {
    sections.push(`<!-- ━━━ SIGNALS ━━━ -->
  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="padding:0 0 8px;font-size:11px;font-weight:bold;letter-spacing:2px;color:#9ca3af;text-transform:uppercase;">本周精选</td></tr>
      ${signalsHTML}
    </table>
  </td></tr>`)
  }

  if (hasNarratives) {
    if (sections.length > 0) {
      sections.push(`<tr><td style="padding:0 32px;">${divider().replace(/<tr><td[^>]*>/, '').replace(/<\/td><\/tr>$/, '')}</td></tr>`)
    }
    sections.push(`<!-- ━━━ NARRATIVES ━━━ -->
  <tr><td style="padding:4px 32px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="padding:0 0 12px;font-size:11px;font-weight:bold;letter-spacing:2px;color:#2563eb;text-transform:uppercase;">叙事追踪</td></tr>
      ${narrativesHTML}
    </table>
  </td></tr>`)
  }

  if (hasBriefs) {
    if (sections.length > 0) {
      sections.push(`<tr><td style="padding:0 32px;">${divider().replace(/<tr><td[^>]*>/, '').replace(/<\/td><\/tr>$/, '')}</td></tr>`)
    }
    sections.push(`<!-- ━━━ BRIEFS ━━━ -->
  <tr><td style="padding:4px 32px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="padding:0 0 8px;font-size:11px;font-weight:bold;letter-spacing:2px;color:#9ca3af;text-transform:uppercase;">新闻速览</td></tr>
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
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader -->
<div style="display:none;font-size:1px;color:#f3f4f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${esc(oneLiner)} &mdash; StablePulse ${esc(weekLabel)}
</div>

<!-- Outer wrapper -->
<!--[if mso]><table cellpadding="0" cellspacing="0" border="0" width="640" align="center"><tr><td><![endif]-->
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:24px 16px;">

<!-- Inner container: 640px -->
<table cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;background-color:#ffffff;">

  <!-- ━━ Brand header ━━ -->
  <tr><td style="padding:36px 32px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td valign="middle">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:5px;height:16px;background-color:#ff6d00;font-size:1px;">&nbsp;</td>
          <td style="padding-left:10px;font-size:13px;font-weight:bold;letter-spacing:3px;color:#111827;">STABLEPULSE</td>
        </tr></table>
      </td>
      <td align="right" style="font-size:12px;color:#9ca3af;letter-spacing:0.5px;">${esc(weekLabel)}</td>
    </tr></table>
  </td></tr>

  <!-- Subtle divider -->
  <tr><td style="padding:18px 32px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #f3f4f6;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>

  <!-- ━━ One-liner (HERO) ━━ -->
  <tr><td style="padding:24px 32px 8px;font-size:22px;font-weight:bold;color:#111827;line-height:1.35;letter-spacing:-0.02em;">
    ${esc(oneLiner)}
  </td></tr>

  <!-- Market line -->
  ${marketLine ? `<tr><td style="padding:0 32px 36px;font-size:13px;color:#9ca3af;line-height:1.6;font-family:monospace;">${esc(marketLine)}</td></tr>` : '<tr><td style="padding:0 0 36px;"></td></tr>'}

  ${sections.join('\n\n  ')}

  <!-- ━━━ CTA ━━━ -->
  <tr><td style="padding:40px 32px 28px;" align="center">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(webLink)}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="0%" fillcolor="#ff6d00" stroke="f">
      <w:anchorlock/>
      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:0.5px;">${esc(ctaText)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${esc(webLink)}" target="_blank" style="display:inline-block;background-color:#ff6d00;color:#ffffff;padding:14px 36px;font-size:14px;font-weight:bold;text-decoration:none;font-family:Arial,sans-serif;letter-spacing:0.5px;">${esc(ctaText)}</a>
    <!--<![endif]-->
  </td></tr>

  <!-- ━━━ Stats bar ━━━ -->
  <tr><td style="padding:0 32px 24px;" align="center">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-size:11px;color:#d1d5db;line-height:1.6;" align="center">
        ${stats.factCount} 条事实 &middot; ${stats.verifiedCount} 条已验证 &middot; ${stats.sourceCount} 个来源
      </td>
    </tr></table>
  </td></tr>

  <!-- ━━━ Footer ━━━ -->
  <tr><td style="background-color:#f9fafb;padding:24px 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td>
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="width:4px;height:12px;background-color:#ff6d00;font-size:1px;">&nbsp;</td>
            <td style="padding-left:8px;font-size:11px;color:#9ca3af;letter-spacing:2px;font-weight:bold;">STABLEPULSE</td>
          </tr></table>
        </td>
        <td align="right"><a href="{{unsubscribe_url}}" style="font-size:11px;color:#9ca3af;text-decoration:underline;">退订</a></td>
      </tr>
      <tr><td colspan="2" style="padding-top:12px;font-size:11px;color:#d1d5db;line-height:1.6;">
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
