// StablePulse Weekly Email — V11 上下文引擎版
// Layer 1 (2s): 数字先行 + one-liner
// Layer 2 (30s): 3 narratives (起点/上周/本周/上下文区块/时间线)
// Layer 3 (2min): 5 signals by category, 每条含 inline 上下文
// Footer: 极简数据来源
// AI boundary: 零意见 — 结构化事实对比允许，预测/评价禁止

const SITE_URL = 'https://payfi-monthly-report.vercel.app'

/* ── Types ── */

export interface NarrativeForEmail {
  topic: string
  weekCount?: number
  origin?: string          // 叙事起点 (e.g. "2026.02.15 Circle 启动 IPO 流程")
  last_week: string
  this_week: string
  timeline?: string
  context?: string[]       // 2-3 条结构化上下文 (mandatory in V11)
}

export interface SignalItem {
  category: 'market_structure' | 'product' | 'onchain_data'
  text: string
  context?: string         // inline 上下文 (e.g. "DAI 达 $5B TVL 用时 3 年")
}

export interface EmailData {
  weekDate: string         // e.g. "3月10日 - 3月16日"
  marketLine?: string      // e.g. "USDC $60.2B (+2.1%) · USDT $144.1B (+0.8%) · 稳定币总市值 $205B"
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

  // Layer 2: Narratives as HTML table blocks
  const narrativesHTML = narratives.slice(0, 3).map(n => {
    const weekBadge = n.weekCount && n.weekCount > 1
      ? `<span style="display:inline-block;font-size:10px;color:#3b82f6;background:rgba(59,130,246,0.1);padding:1px 6px;border-radius:3px;margin-left:8px;">第${n.weekCount}周</span>`
      : ''

    const originLine = n.origin
      ? `<tr><td style="padding:6px 12px;font-size:12px;color:#888;line-height:1.6;border-bottom:1px solid #1a1a1a;">起点: ${esc(n.origin)}</td></tr>`
      : ''

    const lastWeekLine = n.last_week && n.last_week !== '首次追踪'
      ? `<tr><td style="padding:6px 12px;font-size:12px;color:#888;line-height:1.6;"><span style="color:#666;">上周</span>  ${esc(n.last_week)}</td></tr>`
      : ''
    const thisWeekLine = `<tr><td style="padding:6px 12px;font-size:13px;color:#ccc;line-height:1.6;"><span style="color:#888;">本周</span>  ${esc(n.this_week)}</td></tr>`

    // Context block (mandatory)
    let contextBlock = ''
    if (n.context && n.context.length > 0) {
      const contextItems = n.context.map(c =>
        `<tr><td style="padding:2px 12px 2px 16px;font-size:12px;color:#aaa;line-height:1.7;">· ${esc(c)}</td></tr>`
      ).join('\n')
      contextBlock = `
        <tr><td style="padding:8px 12px 4px;font-size:11px;font-weight:600;color:#10b981;letter-spacing:0.5px;">上下文</td></tr>
        ${contextItems}`
    }

    const timelineLine = n.timeline
      ? `<tr><td style="padding:6px 12px;font-size:12px;color:#666;line-height:1.6;">时间线: ${esc(n.timeline)}</td></tr>`
      : ''

    return `<tr><td style="padding:0 0 16px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #222;border-radius:6px;overflow:hidden;">
        <tr><td style="padding:10px 12px 6px;">
          <span style="font-size:14px;font-weight:700;color:#e5e5e5;">${esc(n.topic)}</span>${weekBadge}
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
          ? `<br><span style="font-size:11px;color:#888;padding-left:10px;">  ${esc(s.context)}</span>`
          : ''
        return `<tr><td style="padding:2px 0 4px 8px;font-size:13px;color:#ccc;line-height:1.7;">· ${esc(s.text)}${contextLine}</td></tr>`
      }).join('\n')
      return `<tr><td style="padding:0 0 12px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#888;">${esc(CATEGORY_LABELS[cat] ?? cat)}</p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">${items}</table>
      </td></tr>`
    }).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>StablePulse | ${esc(weekDate)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0a;">
<tr><td align="center" style="padding:24px 16px;">

<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">

  <!-- Header: STABLEPULSE + date -->
  <tr><td style="padding:28px 32px 8px;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;color:#10b981;">STABLEPULSE</p>
    <p style="margin:4px 0 0;font-size:12px;color:#666;">${esc(weekDate)}</p>
  </td></tr>

  <!-- Layer 1: Market numbers + one-liner -->
  <tr><td style="padding:16px 32px 12px;">
    ${marketLine ? `<p style="margin:0 0 10px;font-size:13px;color:#aaa;font-family:monospace;line-height:1.6;">${esc(marketLine)}</p>` : ''}
    <p style="margin:0;font-size:14px;font-weight:600;color:#e5e5e5;line-height:1.6;">
      ${esc(oneLiner)}
    </p>
  </td></tr>

  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #222;"></div></td></tr>

  <!-- Layer 2: Narrative Tracking -->
  <tr><td style="padding:20px 32px 4px;">
    <p style="margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:2px;color:#3b82f6;">叙事追踪</p>
  </td></tr>

  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${narrativesHTML}
    </table>
  </td></tr>

  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #222;"></div></td></tr>

  <!-- Layer 3: Signals -->
  <tr><td style="padding:20px 32px 4px;">
    <p style="margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:2px;color:#10b981;">本周事实</p>
  </td></tr>

  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${signalsHTML}
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px 8px;">
    <div style="border-top:1px solid #222;padding-top:16px;">
      <p style="margin:0 0 10px;font-size:11px;color:#555;text-align:center;">
        数据来源: RSS + SEC EDGAR + DeFiLlama · AI 多源交叉验证
      </p>
      <p style="margin:0 0 10px;text-align:center;">
        <a href="${SITE_URL}/weekly/current" target="_blank"
          style="font-size:12px;color:#10b981;text-decoration:none;">浏览器中查看完整事实 →</a>
      </p>
    </div>
  </td></tr>

  <tr><td style="padding:12px 32px 24px;border-top:1px solid #222;">
    <p style="margin:0 0 4px;font-size:11px;color:#444;text-align:center;letter-spacing:1px;">STABLEPULSE</p>
    <p style="margin:0 0 8px;font-size:11px;color:#333;text-align:center;">稳定币行业上下文引擎 · 内部参考</p>
    <p style="margin:0;font-size:11px;text-align:center;">
      <a href="{{unsubscribe_url}}" style="color:#444;text-decoration:underline;">退订</a>
    </p>
  </td></tr>

</table>

</td></tr>
</table>

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
