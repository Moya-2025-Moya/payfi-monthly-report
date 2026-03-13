// StablePulse Weekly Email — V12 Light Theme
// Pure <table> layout, no CSS3 (no border-radius, no rgba)
// Light theme: #ffffff / #f7f7f7 / #333333
// font-size >= 13px (except metadata labels)
// MSO conditional comments for Outlook

const SITE_URL = 'https://payfi-monthly-report.vercel.app'

/* ── Types ── */

export interface NarrativeForEmail {
  topic: string
  weekCount?: number
  origin?: string
  last_week: string
  this_week: string
  timeline?: string
  context?: string[]
}

export interface SignalItem {
  category: 'market_structure' | 'product' | 'onchain_data'
  text: string
  context?: string
}

export interface EmailData {
  weekDate: string
  marketLine?: string
  oneLiner: string
  narratives: NarrativeForEmail[]
  signals: SignalItem[]
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const CATEGORY_LABELS: Record<string, string> = {
  market_structure: '市场结构',
  product: '产品动态',
  onchain_data: '链上数据',
}

export function generateEmailHTML(data: EmailData): string {
  const { weekDate, marketLine, oneLiner, narratives, signals } = data

  // Layer 2: Narratives
  const narrativesHTML = narratives.slice(0, 3).map(n => {
    const weekBadge = n.weekCount && n.weekCount > 1
      ? `<span style="display:inline-block;font-size:11px;color:#2563eb;background:#eff6ff;padding:1px 6px;margin-left:8px;">第${n.weekCount}周</span>`
      : ''

    const originLine = n.origin
      ? `<tr><td style="padding:4px 16px;font-size:13px;color:#666666;line-height:1.6;border-bottom:1px solid #eeeeee;">起点: ${esc(n.origin)}</td></tr>`
      : ''

    const lastWeekLine = n.last_week && n.last_week !== '首次追踪'
      ? `<tr><td style="padding:4px 16px;font-size:13px;color:#666666;line-height:1.6;"><span style="color:#999999;">上周</span>&nbsp;&nbsp;${esc(n.last_week)}</td></tr>`
      : ''

    const thisWeekLine = `<tr><td style="padding:4px 16px;font-size:14px;color:#333333;line-height:1.6;"><span style="color:#999999;">本周</span>&nbsp;&nbsp;${esc(n.this_week)}</td></tr>`

    let contextBlock = ''
    if (n.context && n.context.length > 0) {
      const contextItems = n.context.map(c =>
        `<tr><td style="padding:2px 16px 2px 24px;font-size:13px;color:#666666;line-height:1.7;">&middot; ${esc(c)}</td></tr>`
      ).join('\n')
      contextBlock = `
        <tr><td style="padding:8px 16px 2px;font-size:11px;font-weight:bold;color:#059669;letter-spacing:0.5px;">上下文</td></tr>
        ${contextItems}`
    }

    const timelineLine = n.timeline
      ? `<tr><td style="padding:4px 16px;font-size:13px;color:#999999;line-height:1.6;">时间线: ${esc(n.timeline)}</td></tr>`
      : ''

    return `<tr><td style="padding:0 0 12px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e5e5;">
        <tr><td style="padding:10px 16px 6px;">
          <span style="font-size:15px;font-weight:bold;color:#111111;">${esc(n.topic)}</span>${weekBadge}
        </td></tr>
        ${originLine}
        ${lastWeekLine}
        ${thisWeekLine}
        ${contextBlock}
        ${timelineLine}
      </table>
    </td></tr>`
  }).join('\n')

  // Layer 3: Signals grouped by category
  const grouped: Record<string, SignalItem[]> = {}
  for (const s of signals) {
    const cat = s.category || 'onchain_data'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  }

  const categoryOrder: Array<'market_structure' | 'product' | 'onchain_data'> = ['market_structure', 'product', 'onchain_data']
  const signalsHTML = categoryOrder
    .filter(cat => grouped[cat]?.length)
    .map(cat => {
      const items = grouped[cat]!.map(s => {
        const contextLine = s.context
          ? `<br><span style="font-size:13px;color:#999999;padding-left:12px;">&nbsp;&nbsp;${esc(s.context)}</span>`
          : ''
        return `<tr><td style="padding:2px 0 4px 8px;font-size:14px;color:#333333;line-height:1.7;">&middot; ${esc(s.text)}${contextLine}</td></tr>`
      }).join('\n')
      return `<tr><td style="padding:0 0 12px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding:0 0 4px;font-size:13px;font-weight:bold;color:#666666;">${esc(CATEGORY_LABELS[cat] ?? cat)}</td></tr>
          ${items}
        </table>
      </td></tr>`
    }).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>StablePulse | ${esc(weekDate)}</title>
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

  <!-- Header -->
  <tr><td style="padding:28px 32px 8px;border-bottom:2px solid #059669;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="font-size:11px;font-weight:bold;letter-spacing:3px;color:#059669;">STABLEPULSE</td>
        <td align="right" style="font-size:13px;color:#999999;">${esc(weekDate)}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Layer 1: Market + one-liner -->
  <tr><td style="padding:20px 32px 16px;">
    ${marketLine ? `<p style="margin:0 0 10px;font-size:14px;color:#666666;font-family:'Courier New',Courier,monospace;line-height:1.6;">${esc(marketLine)}</p>` : ''}
    <p style="margin:0;font-size:15px;font-weight:bold;color:#111111;line-height:1.6;">
      ${esc(oneLiner)}
    </p>
  </td></tr>

  <tr><td style="padding:0 32px;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #eeeeee;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>

  <!-- Layer 2: Narrative Tracking -->
  <tr><td style="padding:20px 32px 4px;">
    <p style="margin:0 0 14px;font-size:11px;font-weight:bold;letter-spacing:2px;color:#2563eb;">叙事追踪</p>
  </td></tr>

  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${narrativesHTML}
    </table>
  </td></tr>

  <tr><td style="padding:0 32px;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #eeeeee;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>

  <!-- Layer 3: Signals -->
  <tr><td style="padding:20px 32px 4px;">
    <p style="margin:0 0 14px;font-size:11px;font-weight:bold;letter-spacing:2px;color:#059669;">本周事实</p>
  </td></tr>

  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${signalsHTML}
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px 8px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #eeeeee;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding-top:16px;">
      <tr><td align="center" style="font-size:13px;color:#999999;padding:8px 0;">
        数据来源: RSS + SEC EDGAR + DeFiLlama &middot; AI 多源交叉验证
      </td></tr>
      <tr><td align="center" style="padding:4px 0 8px;">
        <a href="${SITE_URL}/weekly/current" target="_blank"
          style="font-size:14px;color:#059669;text-decoration:none;">查看完整周报 &rarr;</a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:12px 32px 24px;border-top:1px solid #eeeeee;background-color:#f7f7f7;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center" style="font-size:11px;color:#999999;letter-spacing:1px;padding:4px 0;">STABLEPULSE</td></tr>
      <tr><td align="center" style="font-size:13px;color:#999999;padding:2px 0;">稳定币行业上下文引擎 &middot; 内部参考</td></tr>
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
  const fmt = (d: Date) => `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
  return `${fmt(monday)} - ${fmt(sunday)}`
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
