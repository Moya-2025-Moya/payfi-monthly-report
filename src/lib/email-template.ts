// StablePulse Weekly Email — V19 Clean Typography
// Design principles:
//   1. 640px width, 40px horizontal padding → 560px content
//   2. Typography-first: clear hierarchy, generous line-height
//   3. Single accent (#ff6d00), three grays (#111827, #6b7280, #9ca3af)
//   4. Whitespace as structure — no boxes, no borders except section dividers
//   5. Zero CSS3 for email safety; font-size >= 13px
//   6. Pure <table> layout with MSO conditional comments

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

function dedup(text: string): string {
  // Aggressively remove redundant consecutive date parentheticals.
  // When two (...) blocks appear next to each other and both contain date/year info,
  // keep only the more specific one.
  return text.replace(/(\([^)]*\))\s*(\([^)]*\))/g, (_match, a: string, b: string) => {
    const isDateParen = (s: string) => /\d{4}/.test(s)
    if (!isDateParen(a) || !isDateParen(b)) return `${a} ${b}`
    // Keep whichever is longer (more specific)
    return a.length >= b.length ? a : b
  })
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

/* ── Thin horizontal rule ── */

function hr(topPad = 0, bottomPad = 0): string {
  return `<tr><td style="padding:${topPad}px 0 ${bottomPad}px;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>`
}

/* ── Section label ── */

function sectionLabel(label: string, color = '#9ca3af'): string {
  return `<tr><td style="padding:0 0 20px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:12px;font-weight:700;letter-spacing:2px;color:${color};white-space:nowrap;padding-right:14px;">${label}</td>
      <td width="100%" style="border-top:1px solid #e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td>
    </tr></table>
  </td></tr>`
}

/* ── Signals ── */

const EMAIL_CONTEXT_PREFIXES = [
  '相比之下，', '此前，', '作为参考，', '历史上，', '值得注意的是，',
  '类似地，', '与此对照，', '回顾来看，', '同一赛道中，', '从先例看，',
]

function buildSignals(signals: SignalItem[]): string {
  if (signals.length === 0) return ''

  const sorted: SignalItem[] = []
  for (const cat of CATEGORY_ORDER) {
    for (const s of signals) {
      if ((s.category || 'onchain_data') === cat) sorted.push(s)
    }
  }

  let prefixIdx = 0
  return sorted.map((s, i) => {
    const isLast = i === sorted.length - 1

    // Main signal text
    let html = `<tr><td style="padding:14px 0 ${s.context ? '6' : '14'}px;${!isLast && !s.context ? 'border-bottom:1px solid #f3f4f6;' : ''}">
      <p style="margin:0;font-size:15px;color:#1f2937;line-height:1.75;">${esc(s.text)}</p>
    </td></tr>`

    // Context line
    if (s.context) {
      let cleaned = s.context
        .replace(/\s*[—\-–]\s*(小|大)\s*[\d.,]+\s*倍/g, '')
        .replace(/\s*\|\s*/g, '。')
        .replace(/[。；]+$/g, '').replace(/。{2,}/g, '。').trim()
      cleaned = dedup(cleaned)
      if (cleaned) {
        const prefix = EMAIL_CONTEXT_PREFIXES[prefixIdx % EMAIL_CONTEXT_PREFIXES.length]
        prefixIdx++
        html += `<tr><td style="padding:0 0 14px;${!isLast ? 'border-bottom:1px solid #f3f4f6;' : ''}">
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.7;">${esc(prefix + cleaned)}</p>
        </td></tr>`
      }
    }

    return html
  }).join('\n')
}

/* ── Narratives ── */

function buildNarratives(narratives: NarrativeForEmail[]): string {
  if (narratives.length === 0) return ''

  return narratives.slice(0, 3).map((n, ni) => {
    const weekTag = n.weekCount && n.weekCount > 1
      ? `<span style="color:#ff6d00;font-size:12px;font-weight:700;">&nbsp;&middot;&nbsp;第${n.weekCount}周</span>`
      : ''

    const lines: string[] = []

    // This week — the lead
    if (n.this_week) {
      lines.push(`<p style="margin:0 0 10px;font-size:15px;color:#111827;line-height:1.75;">${esc(n.this_week)}</p>`)
    }

    // Background (origin / last week) — compact, one line
    const bg: string[] = []
    if (n.origin) bg.push(esc(n.origin))
    if (n.last_week && n.last_week !== '首次追踪') bg.push(esc(n.last_week))
    if (bg.length > 0) {
      lines.push(`<p style="margin:0 0 10px;font-size:13px;color:#9ca3af;line-height:1.7;">${bg.join(' &rarr; ')}</p>`)
    }

    // Forward look — only if available
    if (n.next_week_watch) {
      const items = n.next_week_watch.split(/;\s*/).filter(Boolean)
      const formatted = items.map(item => esc(item)).join('<br>')
      lines.push(`<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;color:#d97706;">&#9654; 前瞻</p>`)
      lines.push(`<p style="margin:0 0 4px;font-size:13px;color:#6b7280;line-height:1.8;">${formatted}</p>`)
    }

    // Context
    if (n.context && n.context.length > 0) {
      lines.push(`<p style="margin:10px 0 4px;font-size:11px;font-weight:700;letter-spacing:1px;color:#9ca3af;">历史可比</p>`)
      for (const c of n.context) {
        const line = dedup(`${c.event}${c.detail ? `，${c.detail}` : ''}`)
        lines.push(`<p style="margin:0 0 2px;font-size:13px;color:#9ca3af;line-height:1.7;">${esc(line)}</p>`)
      }
    }

    const isLast = ni === Math.min(narratives.length, 3) - 1

    return `<tr><td style="padding:0 0 ${isLast ? '0' : '28'}px;">
      <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:#111827;line-height:1.35;">${esc(n.topic)}${weekTag}</p>
      ${lines.join('\n      ')}
      ${!isLast ? `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;"><tr><td style="border-top:1px solid #f3f4f6;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>` : ''}
    </td></tr>`
  }).join('\n')
}

/* ── Briefs ── */

function buildBriefs(briefs: BriefItem[]): string {
  if (!briefs || briefs.length === 0) return ''

  return briefs.slice(0, 10).map((b) => {
    return `<tr>
      <td style="padding:8px 0;font-size:14px;color:#374151;line-height:1.7;border-bottom:1px solid #f3f4f6;">&bull;&nbsp;&nbsp;${esc(b.text)}</td>
    </tr>`
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

  const sections: string[] = []

  if (hasSignals) {
    sections.push(`<tr><td style="padding:0 40px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${sectionLabel('本周精选')}
      ${signalsHTML}
    </table>
  </td></tr>`)
  }

  if (hasNarratives) {
    sections.push(`<tr><td style="padding:${hasSignals ? '32' : '0'}px 40px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${sectionLabel('叙事追踪', '#ff6d00')}
      ${narrativesHTML}
    </table>
  </td></tr>`)
  }

  if (hasBriefs) {
    sections.push(`<tr><td style="padding:32px 40px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${sectionLabel('新闻速览')}
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
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader -->
<div style="display:none;font-size:1px;color:#f5f5f4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${esc(oneLiner)} &mdash; StablePulse ${esc(weekLabel)}
</div>

<!--[if mso]><table cellpadding="0" cellspacing="0" border="0" width="640" align="center"><tr><td><![endif]-->
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f4;">
<tr><td align="center" style="padding:40px 16px;">

<table cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;background-color:#ffffff;">

  <!-- Top accent -->
  <tr><td style="background-color:#ff6d00;font-size:1px;line-height:3px;height:3px;">&nbsp;</td></tr>

  <!-- Header -->
  <tr><td style="padding:36px 40px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:13px;font-weight:700;letter-spacing:3.5px;color:#111827;">STABLEPULSE</td>
      <td align="right" style="font-size:12px;color:#9ca3af;font-family:'SF Mono',Menlo,monospace;">${esc(weekLabel)}</td>
    </tr></table>
  </td></tr>

  <!-- Hero headline -->
  <tr><td style="padding:28px 40px 0;">
    <p style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.35;letter-spacing:-0.02em;">
      ${esc(oneLiner)}
    </p>
  </td></tr>

  <!-- Market line + stats -->
  <tr><td style="padding:12px 40px 0;">
    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;font-family:'SF Mono',Menlo,monospace;">
      ${marketLine ? esc(marketLine) : ''}${marketLine && stats.factCount > 0 ? '&nbsp;&nbsp;&middot;&nbsp;&nbsp;' : ''}${stats.factCount > 0 ? `${stats.factCount} facts &middot; ${stats.verifiedCount} verified` : ''}
    </p>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:28px 40px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:2px solid #111827;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>

  <!-- Spacer -->
  <tr><td style="padding:28px 0 0;"></td></tr>

  ${sections.join('\n\n  ')}

  <!-- Footer -->
  <tr><td style="padding:40px 40px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>
  <tr><td style="padding:24px 40px 36px;" align="center">
    <p style="margin:0 0 8px;font-size:13px;">
      <a href="${esc(webLink)}" target="_blank" style="color:#ff6d00;text-decoration:none;font-weight:600;">阅读完整周报 &rarr;</a>
    </p>
    <p style="margin:0;font-size:12px;color:#d1d5db;">
      AI 多源交叉验证 &middot; 零观点
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <a href="{{unsubscribe_url}}" style="color:#d1d5db;text-decoration:underline;">退订</a>
    </p>
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
