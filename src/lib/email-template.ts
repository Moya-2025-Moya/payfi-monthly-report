// StablePulse Weekly Email — V15 Design Overhaul
// Pure <table> layout, no CSS3 (no border-radius, no rgba, no box-shadow)
// Light theme: #ffffff body, #f7f7f7 outer, #f0f7ff context blocks
// Unified brand color: #ff6d00 (orange) for brand, #1a1a1a for content hierarchy
// Context blocks: border-left 3px #c4c4c4 + bg #f5f5f5 (neutral, not competing with brand)
// font-size >= 13px (Gmail mobile threshold)
// MSO conditional comments for Outlook

const SITE_URL = 'https://payfi-monthly-report.vercel.app'

/* ── Types ── */

export interface NarrativeContext {
  event: string   // e.g. "Coinbase 上市"
  detail: string  // e.g. "S-1→上市: 118 天 (2020.12→2021.04)"
  // V14: 当前 vs 历史并排对比
  current_entity?: string   // e.g. "Circle"
  current_value?: string    // e.g. "25 天"
  delta_label?: string      // e.g. "快 42%"
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
  context?: string                     // legacy one-liner (backward compat)
  structured_context?: NarrativeContext // V14: structured with parallel comparison
  source_url?: string                  // V15: link to original source
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
  weekLabel: string       // "2026.03.10 - 03.16"
  marketLine?: string     // "USDC $60.2B (+2.1%) · USDT $144.1B (+0.8%)"
  oneLiner: string
  narratives: NarrativeForEmail[]
  signals: SignalItem[]
  briefs?: BriefItem[]    // V15: 零散快讯
  stats: EmailStats
  weekUrl?: string        // full URL to web version, defaults to SITE_URL/weekly/current
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  market_structure: { label: '市场', color: '#1a73e8' },
  product: { label: '产品', color: '#0d904f' },
  onchain_data: { label: '链上', color: '#7b61ff' },
  regulatory: { label: '监管', color: '#d93025' },
  funding: { label: '融资', color: '#e37400' },
}

const CATEGORY_ORDER: Array<SignalItem['category']> = [
  'market_structure', 'product', 'onchain_data', 'regulatory', 'funding',
]

/* ── Context block builder ── */
function buildContextItem(c: NarrativeContext): string {
  // Row 1: Historical reference (monospace, neutral)
  let html = `<tr><td style="padding:0 0 2px 0;font-size:13px;color:#444444;line-height:1.7;font-family:'Courier New',Courier,monospace;font-weight:bold;">${esc(c.event)}</td></tr>`
  html += `<tr><td style="padding:0 0 4px 0;font-size:13px;color:#666666;line-height:1.7;font-family:'Courier New',Courier,monospace;">${esc(c.detail)}</td></tr>`

  // Row 2: Current entity parallel comparison (bold, prominent)
  if (c.current_entity && c.current_value) {
    const delta = c.delta_label
      ? `<span style="color:#ff6d00;font-weight:bold;font-size:14px;"> — ${esc(c.delta_label)}</span>`
      : ''
    html += `<tr><td style="padding:4px 0 6px 0;font-size:14px;color:#111111;line-height:1.6;font-weight:bold;">${esc(c.current_entity)} 当前: ${esc(c.current_value)}${delta}</td></tr>`
  }

  return html
}

function buildContextBlockInner(items: NarrativeContext[]): string {
  if (!items || items.length === 0) return ''

  const rows = items.map((c, i) => {
    const separator = i > 0
      ? `<tr><td style="padding:4px 0;border-top:1px solid #e0e0e0;font-size:1px;line-height:1px;">&nbsp;</td></tr>`
      : ''
    return separator + buildContextItem(c)
  }).join('\n')

  return `<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="border-left:3px solid #c4c4c4;background-color:#f5f5f5;padding:12px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding:0 0 4px;font-size:11px;letter-spacing:1px;color:#bbbbbb;">COMPARABLE</td></tr>
          ${rows}
        </table>
      </td>
    </tr></table>`
}

function buildContextBlock(items: NarrativeContext[]): string {
  if (!items || items.length === 0) return ''
  return `<tr><td style="padding:8px 0 4px;">${buildContextBlockInner(items)}</td></tr>`
}

/* ── Section header helper ── */
function sectionHeader(label: string, count?: number): string {
  const countHtml = count != null
    ? `<td align="right" style="font-size:11px;color:#999999;">${count} 条</td>`
    : ''
  return `<tr><td style="padding:20px 32px 4px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:13px;font-weight:bold;letter-spacing:0;color:#1a1a1a;">${esc(label)}</td>
      ${countHtml}
    </tr></table>
  </td></tr>`
}

/* ── Divider helper ── */
function divider(): string {
  return `<tr><td style="padding:4px 32px;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #eeeeee;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>`
}

/* ── Narrative cards ── */
function buildNarratives(narratives: NarrativeForEmail[]): string {
  if (narratives.length === 0) return ''

  const cards = narratives.slice(0, 3).map(n => {
    const weekBadge = n.weekCount && n.weekCount > 1
      ? `<td align="right" style="font-size:11px;color:#ff6d00;font-family:'Courier New',Courier,monospace;">第${n.weekCount}周</td>`
      : ''

    // Origin line (for narratives tracked > 1 week)
    const originRow = n.origin
      ? `<tr><td style="padding:4px 16px;font-size:13px;color:#666666;line-height:1.6;"><span style="color:#999999;">起点</span>&nbsp;&nbsp;${esc(n.origin)}</td></tr>`
      : ''

    // Last week (skip for first-week narratives)
    const lastWeekRow = n.last_week && n.last_week !== '首次追踪'
      ? `<tr><td style="padding:4px 16px;font-size:13px;color:#666666;line-height:1.6;"><span style="color:#999999;">上周</span>&nbsp;&nbsp;${esc(n.last_week)}</td></tr>`
      : ''

    // This week (highlighted — the star of the card) — 16px vs 13px origin/last_week for clear hierarchy
    const thisWeekRow = `<tr><td style="padding:6px 16px;font-size:16px;color:#111111;line-height:1.5;font-weight:bold;"><span style="color:#ff6d00;font-weight:bold;font-size:11px;letter-spacing:1px;">本周</span>&nbsp;&nbsp;${esc(n.this_week)}</td></tr>`

    // Context block
    const contextHtml = n.context && n.context.length > 0
      ? `<tr><td style="padding:4px 16px 4px;">${buildContextBlockInner(n.context)}</td></tr>`
      : ''

    // Next week watch
    const nextWeekRow = n.next_week_watch
      ? `<tr><td style="padding:6px 16px 4px;font-size:13px;color:#999999;line-height:1.6;border-top:1px dashed #e5e5e5;"><span style="color:#999999;">下周关注</span>&nbsp;&nbsp;${esc(n.next_week_watch)}</td></tr>`
      : ''

    return `<tr><td style="padding:0 0 16px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e5e5;">
        <tr><td style="padding:12px 16px 6px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td style="font-size:15px;font-weight:bold;color:#111111;">${esc(n.topic)}</td>
            ${weekBadge}
          </tr></table>
        </td></tr>
        ${originRow}
        ${lastWeekRow}
        ${thisWeekRow}
        ${contextHtml}
        ${nextWeekRow}
        <tr><td style="height:4px;"></td></tr>
      </table>
    </td></tr>`
  }).join('\n')

  return cards
}

/* ── Signals grouped by category ── */
function buildSignals(signals: SignalItem[]): string {
  if (signals.length === 0) return ''

  const grouped: Record<string, SignalItem[]> = {}
  for (const s of signals) {
    const cat = s.category || 'onchain_data'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  }

  return CATEGORY_ORDER
    .filter(cat => grouped[cat]?.length)
    .map(cat => {
      const items = grouped[cat]!.map(s => {
        // Signal fact line (with optional source link)
        const sourceLink = s.source_url
          ? ` <a href="${esc(s.source_url)}" target="_blank" style="color:#999999;font-size:11px;text-decoration:none;">&#x2197;</a>`
          : ''
        let row = `<tr><td style="padding:2px 0 2px 8px;font-size:14px;color:#333333;line-height:1.7;">&middot; ${esc(s.text)}${sourceLink}</td></tr>`

        // V14: prefer structured_context with parallel comparison
        if (s.structured_context) {
          const sc = s.structured_context
          let ctxContent = `<span style="font-weight:bold;color:#444444;">${esc(sc.event)}</span>: ${esc(sc.detail)}`
          if (sc.current_entity && sc.current_value) {
            const delta = sc.delta_label ? ` — <span style="color:#ff6d00;font-weight:bold;">${esc(sc.delta_label)}</span>` : ''
            ctxContent += `<br>${esc(sc.current_entity)} 当前: <strong>${esc(sc.current_value)}</strong>${delta}`
          }
          row += `<tr><td style="padding:0 0 4px 8px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td style="border-left:3px solid #c4c4c4;background-color:#f5f5f5;padding:6px 10px;font-size:13px;color:#666666;line-height:1.6;font-family:'Courier New',Courier,monospace;">${ctxContent}</td>
            </tr></table>
          </td></tr>`
        } else if (s.context) {
          // Legacy fallback: plain string context
          row += `<tr><td style="padding:0 0 4px 8px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td style="border-left:3px solid #c4c4c4;background-color:#f5f5f5;padding:4px 10px;font-size:13px;color:#666666;line-height:1.6;font-family:'Courier New',Courier,monospace;">${esc(s.context)}</td>
            </tr></table>
          </td></tr>`
        }

        return row
      }).join('\n')

      return `<tr><td style="padding:0 0 12px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding:0 0 4px;font-size:13px;font-weight:bold;color:${CATEGORY_LABELS[cat]?.color ?? '#666666'};">${esc(CATEGORY_LABELS[cat]?.label ?? cat)}</td></tr>
          ${items}
        </table>
      </td></tr>`
    }).join('\n')
}

/* ── Briefs (零散快讯) ── */
function buildBriefs(briefs: BriefItem[]): string {
  if (!briefs || briefs.length === 0) return ''

  return briefs.slice(0, 10).map(b => {
    const dateTag = b.date
      ? `<span style="color:#666666;font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:bold;">${esc(b.date)}</span>&nbsp;&nbsp;`
      : ''
    return `<tr><td style="padding:3px 0 3px 0;font-size:13px;color:#555555;line-height:1.7;">${dateTag}${esc(b.text)}</td></tr>`
  }).join('\n')
}

/* ── Main generator ── */
export function generateEmailHTML(data: EmailData): string {
  const { weekLabel, marketLine, oneLiner, narratives, signals, briefs, stats, weekUrl } = data
  const webLink = weekUrl || `${SITE_URL}/weekly/current`

  const narrativesHTML = buildNarratives(narratives)
  const signalsHTML = buildSignals(signals)
  const briefsHTML = buildBriefs(briefs ?? [])

  // CTA text: email covers ~3 narratives + ~5 signals + ~10 briefs = ~18 items
  // Remaining = total facts minus what's visually represented
  const coveredCount = narratives.length * 3 + signals.length + (briefs ?? []).length
  const remainingCount = Math.max(0, stats.factCount - coveredCount)
  const ctaText = remainingCount > 3
    ? `另有 ${remainingCount} 条本周事实 →`
    : '查看完整版 →'

  return `<!DOCTYPE html>
<html lang="zh-CN" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>StablePulse | ${esc(weekLabel)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f7f7f7;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader: visible in inbox preview, hidden in email body -->
<div style="display:none;font-size:1px;color:#f7f7f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  StablePulse | ${esc(weekLabel)} — ${esc(oneLiner)}
</div>

<!--[if mso]><table cellpadding="0" cellspacing="0" border="0" width="600" align="center"><tr><td><![endif]-->
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f7f7f7;">
<tr><td align="center" style="padding:24px 16px;">

<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;">

  <!-- ━━ Header ━━ -->
  <tr><td style="padding:28px 32px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="font-size:11px;font-weight:bold;letter-spacing:3px;color:#ff6d00;">STABLEPULSE</td>
        <td align="right" style="font-size:13px;color:#999999;font-family:'Courier New',Courier,monospace;">${esc(weekLabel)}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Header divider (brand orange) -->
  <tr><td style="padding:10px 32px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:2px solid #ff6d00;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>

  <!-- ━━ One-liner (hero) ━━ -->
  <tr><td style="padding:20px 32px 8px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:20px;font-weight:bold;color:#1a1a1a;line-height:1.4;">${esc(oneLiner)}</td></tr></table>
  </td></tr>

  <!-- Market line (data, secondary) -->
  ${marketLine ? `<tr><td style="padding:0 32px 16px;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:13px;color:#888888;font-family:'Courier New',Courier,monospace;line-height:1.6;">${esc(marketLine)}</td></tr></table></td></tr>` : ''}

  ${divider()}

  <!-- ━━ NARRATIVES ━━ -->
  ${sectionHeader('本周叙事', narratives.length)}

  <tr><td style="padding:8px 32px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${narrativesHTML}
    </table>
  </td></tr>

  ${divider()}

  <!-- ━━ SIGNALS ━━ -->
  ${sectionHeader('信号', signals.length)}

  <tr><td style="padding:8px 32px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${signalsHTML}
    </table>
  </td></tr>

  ${briefsHTML ? `${divider()}

  <!-- ━━ BRIEFS (零散快讯) ━━ -->
  ${sectionHeader('本周快讯')}

  <tr><td style="padding:8px 32px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${briefsHTML}
    </table>
  </td></tr>` : ''}

  <!-- ━━ Footer ━━ -->
  <tr><td style="padding:24px 32px 8px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #eeeeee;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding-top:16px;">
      <tr><td align="center" style="padding:0 0 12px;">
        <a href="${esc(webLink)}" target="_blank"
          style="font-size:14px;color:#ff6d00;text-decoration:none;font-weight:bold;">${esc(ctaText)}</a>
      </td></tr>
      <tr><td align="center" style="font-size:13px;color:#999999;padding:4px 0;font-family:'Courier New',Courier,monospace;">
        基于 ${stats.sourceCount} 个数据源 &middot; ${stats.factCount} 条事实 &middot; AI 交叉验证
      </td></tr>
    </table>
  </td></tr>

  <!-- ━━ Brand footer ━━ -->
  <tr><td style="padding:12px 32px 24px;background-color:#f7f7f7;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center" style="font-size:11px;color:#bbbbbb;letter-spacing:2px;padding:4px 0;">STABLEPULSE</td></tr>
      <tr><td align="center" style="padding:4px 0;">
        <a href="{{unsubscribe_url}}" style="font-size:11px;color:#bbbbbb;text-decoration:underline;">退订</a>
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
  if (isNaN(year) || isNaN(num)) return weekNumber // fallback to raw input
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
  if (isNaN(year) || isNaN(num)) return new Date().toISOString().split('T')[0] // fallback to today
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (num - 1) * 7)
  return monday.toISOString().split('T')[0]
}
