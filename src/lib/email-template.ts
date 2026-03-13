// StablePulse Weekly Email — V13 Context-First
// Pure <table> layout, no CSS3 (no border-radius, no rgba, no box-shadow)
// Light theme: #ffffff body, #f7f7f7 outer, #f0f7ff context blocks
// Context blocks = visual protagonist: border-left 3px #3b82f6 + bg #f0f7ff
// font-size >= 13px (Gmail mobile threshold)
// MSO conditional comments for Outlook

const SITE_URL = 'https://payfi-monthly-report.vercel.app'

/* ── Types ── */

export interface NarrativeContext {
  event: string   // e.g. "Coinbase IPO"
  detail: string  // e.g. "S-1→上市: 118 天 (2020.12→2021.04)"
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
  context?: string  // one-line historical comparison (if any)
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
  stats: EmailStats
  weekUrl?: string        // full URL to web version, defaults to SITE_URL/weekly/current
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const CATEGORY_LABELS: Record<string, string> = {
  market_structure: '市场',
  product: '产品',
  onchain_data: '链上',
  regulatory: '监管',
  funding: '融资',
}

const CATEGORY_ORDER: Array<SignalItem['category']> = [
  'market_structure', 'product', 'onchain_data', 'regulatory', 'funding',
]

/* ── Context block builder (the visual protagonist) ── */
function buildContextBlock(items: NarrativeContext[]): string {
  if (!items || items.length === 0) return ''

  const rows = items.map(c =>
    `<tr><td style="padding:0 0 4px 0;font-size:13px;color:#444444;line-height:1.7;font-family:'Courier New',Courier,monospace;">` +
    `<span style="font-size:13px;font-weight:bold;color:#333333;">${esc(c.event)}</span>` +
    `</td></tr>` +
    `<tr><td style="padding:0 0 6px 0;font-size:13px;color:#555555;line-height:1.7;font-family:'Courier New',Courier,monospace;">${esc(c.detail)}</td></tr>`
  ).join('\n')

  // Context block: blue left border + light blue background
  return `<tr><td style="padding:8px 0 4px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="border-left:3px solid #3b82f6;background-color:#f0f7ff;padding:12px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding:0 0 6px;font-size:11px;font-weight:bold;letter-spacing:1px;color:#3b82f6;">历史对比</td></tr>
          ${rows}
        </table>
      </td>
    </tr></table>
  </td></tr>`
}

/* ── Narrative cards ── */
function buildNarratives(narratives: NarrativeForEmail[]): string {
  if (narratives.length === 0) return ''

  const cards = narratives.slice(0, 3).map(n => {
    const weekBadge = n.weekCount && n.weekCount > 1
      ? `<td align="right" style="font-size:11px;color:#3b82f6;font-family:'Courier New',Courier,monospace;">第${n.weekCount}周</td>`
      : ''

    // Origin line (for narratives tracked > 1 week)
    const originRow = n.origin
      ? `<tr><td style="padding:4px 16px;font-size:13px;color:#666666;line-height:1.6;"><span style="color:#999999;">起点</span>&nbsp;&nbsp;${esc(n.origin)}</td></tr>`
      : ''

    // Last week (skip for first-week narratives)
    const lastWeekRow = n.last_week && n.last_week !== '首次追踪'
      ? `<tr><td style="padding:4px 16px;font-size:13px;color:#666666;line-height:1.6;"><span style="color:#999999;">上周</span>&nbsp;&nbsp;${esc(n.last_week)}</td></tr>`
      : ''

    // This week (highlighted)
    const thisWeekRow = `<tr><td style="padding:4px 16px;font-size:14px;color:#1a1a1a;line-height:1.6;font-weight:bold;"><span style="color:#999999;font-weight:normal;">本周</span>&nbsp;&nbsp;${esc(n.this_week)}</td></tr>`

    // Context block (the protagonist)
    const contextHtml = n.context && n.context.length > 0
      ? `<tr><td style="padding:4px 16px 4px;">${buildContextBlock(n.context).replace(/<tr><td style="padding:8px 0 4px;">/, '').replace(/<\/td><\/tr>$/, '')}</td></tr>`
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
        // Signal fact line
        let row = `<tr><td style="padding:2px 0 2px 8px;font-size:14px;color:#333333;line-height:1.7;">&middot; ${esc(s.text)}</td></tr>`

        // Inline context (one-liner, with blue left border if present)
        if (s.context) {
          row += `<tr><td style="padding:0 0 4px 8px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td style="border-left:3px solid #3b82f6;background-color:#f0f7ff;padding:4px 10px;font-size:13px;color:#555555;line-height:1.6;font-family:'Courier New',Courier,monospace;">${esc(s.context)}</td>
            </tr></table>
          </td></tr>`
        }

        return row
      }).join('\n')

      return `<tr><td style="padding:0 0 12px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding:0 0 4px;font-size:13px;font-weight:bold;color:#666666;">${esc(CATEGORY_LABELS[cat] ?? cat)}</td></tr>
          ${items}
        </table>
      </td></tr>`
    }).join('\n')
}

/* ── Main generator ── */
export function generateEmailHTML(data: EmailData): string {
  const { weekLabel, marketLine, oneLiner, narratives, signals, stats, weekUrl } = data
  const webLink = weekUrl || `${SITE_URL}/weekly/current`

  const narrativesHTML = buildNarratives(narratives)
  const signalsHTML = buildSignals(signals)

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
      <tr><td colspan="2" style="padding-top:2px;font-size:11px;color:#999999;letter-spacing:1px;">Weekly Stablecoin Intelligence</td></tr>
    </table>
  </td></tr>

  <!-- Header divider -->
  <tr><td style="padding:12px 32px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:2px solid #ff6d00;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>

  <!-- ━━ Market line + One-liner ━━ -->
  <tr><td style="padding:20px 32px 16px;">
    ${marketLine ? `<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:14px;color:#666666;font-family:'Courier New',Courier,monospace;line-height:1.6;padding-bottom:10px;">${esc(marketLine)}</td></tr></table>` : ''}
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:16px;font-weight:bold;color:#111111;line-height:1.5;">${esc(oneLiner)}</td></tr></table>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:0 32px;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #eeeeee;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>

  <!-- ━━ NARRATIVES ━━ -->
  <tr><td style="padding:20px 32px 4px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#3b82f6;">NARRATIVES</td>
      <td align="right" style="font-size:11px;color:#999999;">${narratives.length} 条</td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:8px 32px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${narrativesHTML}
    </table>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:4px 32px;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #eeeeee;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>

  <!-- ━━ SIGNALS ━━ -->
  <tr><td style="padding:20px 32px 4px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#3b82f6;">SIGNALS</td>
      <td align="right" style="font-size:11px;color:#999999;">${signals.length} 条</td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:8px 32px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${signalsHTML}
    </table>
  </td></tr>

  <!-- ━━ Footer: Stats + CTA ━━ -->
  <tr><td style="padding:20px 32px 8px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #eeeeee;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding-top:16px;">
      <tr><td align="center" style="font-size:13px;color:#999999;padding:4px 0;font-family:'Courier New',Courier,monospace;">
        ${stats.factCount} 条事实 &middot; ${stats.verifiedCount} 条已验证 &middot; ${stats.sourceCount} 个数据源
      </td></tr>
      <tr><td align="center" style="font-size:13px;color:#999999;padding:4px 0;">
        AI 多源交叉验证 &middot; 人工审核 &middot; 零观点
      </td></tr>
      <tr><td align="center" style="padding:12px 0 8px;">
        <a href="${esc(webLink)}" target="_blank"
          style="font-size:14px;color:#3b82f6;text-decoration:none;font-weight:bold;">查看完整版 &rarr;</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- ━━ Brand footer ━━ -->
  <tr><td style="padding:12px 32px 24px;border-top:1px solid #eeeeee;background-color:#f7f7f7;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center" style="font-size:11px;color:#999999;letter-spacing:1px;padding:4px 0;">STABLEPULSE</td></tr>
      <tr><td align="center" style="font-size:13px;color:#999999;padding:2px 0;">AI 生成 &middot; 人工审核 &middot; 内部参考</td></tr>
      <tr><td align="center" style="padding:4px 0;">
        <a href="{{unsubscribe_url}}" style="font-size:13px;color:#999999;text-decoration:underline;">退订</a>
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
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (num - 1) * 7)
  return monday.toISOString().split('T')[0]
}
