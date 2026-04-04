// ============================================================
// StablePulse — Telegram Distributor
// Sends daily news and weekly digests to CN/EN supergroup topics.
//
// Architecture:
//   sendDailyNewsTelegram()  — yesterday's top-10 facts → both threads
//   sendWeeklyNewsTelegram() — week's featured + narratives + bullets → both threads
//   sendPipelineAlert()      — error notifications (no thread, goes to main group)
// ============================================================

import { supabaseAdmin } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import { getTelegramBotToken, getTelegramChannels } from '@/lib/telegram-config'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FactRow {
  id: string
  content_en: string
  content_zh: string | null
  source_url: string
  confidence: string | null
  fact_type: string
  tags: string[]
}

interface NarrativeRow {
  id: string
  topic: string
  total_weeks: number
  key_entities: string[]
}

interface WeeklyAIResult {
  featured_indices: number[]
  narratives: {
    topic_cn: string
    topic_en: string
    weeks: number
    event_index: number
    trend_cn: string
    trend_en: string
  }[]
  bullet_indices: number[]
}

// ─── Core send ────────────────────────────────────────────────────────────────

async function sendToThread(
  botToken: string,
  chatId: string,
  text: string,
  threadId?: number,
): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }
  if (threadId !== undefined) body.message_thread_id = threadId

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telegram API error ${res.status}: ${err}`)
  }
}

// ─── HTML escaping ────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function yesterdayLabel(lang: 'cn' | 'en'): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000)
  if (lang === 'cn') {
    return d.toLocaleDateString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Shanghai',
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// Returns Monday and Sunday of an ISO week as localised strings
function weekDateRange(weekNumber: string): { cn: string; en: string } {
  const m = weekNumber.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return { cn: weekNumber, en: weekNumber }

  const year = parseInt(m[1], 10)
  const week = parseInt(m[2], 10)

  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  const fmt = (d: Date, locale: string) =>
    d.toLocaleDateString(locale, { month: 'numeric', day: 'numeric' })

  const fmtYear = (d: Date, locale: string) =>
    d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })

  return {
    cn: `${monday.getUTCFullYear()}.${fmt(monday, 'zh-CN')} — ${fmt(sunday, 'zh-CN')}`,
    en: `${fmtYear(monday, 'en-US')} — ${fmt(sunday, 'en-US')}`,
  }
}

// ─── Daily ────────────────────────────────────────────────────────────────────

async function fetchYesterdayFacts(): Promise<FactRow[]> {
  // Look back 48 hours so the send works whether triggered same-day or next morning
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_en, content_zh, source_url, confidence, fact_type, tags')
    .in('verification_status', ['verified', 'partially_verified'])
    .gte('collected_at', cutoff.toISOString())
    .order('confidence', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[Telegram] fetchYesterdayFacts error:', error.message)
    return []
  }
  return (data ?? []) as FactRow[]
}

async function selectTopFacts(facts: FactRow[], max = 10): Promise<FactRow[]> {
  if (facts.length === 0) return []
  if (facts.length <= max) return facts

  const list = facts
    .map((f, i) => `[${i}] (${f.confidence ?? '?'}) ${f.content_en.slice(0, 160)}`)
    .join('\n')

  const result = await callHaikuJSON<{ indices: number[] }>(
    `You are a stablecoin/PayFi news editor. Select the ${max} most important facts below.
Priority order: regulatory actions > major partnerships/launches > significant market metrics > general updates.
Prefer high-confidence facts. Avoid duplicate topics.

Facts:
${list}

Return JSON: { "indices": [0, 3, 7, ...] } — up to ${max} indices in priority order (most important first).`,
    { maxTokens: 512 }
  )

  return (result.indices ?? [])
    .slice(0, max)
    .filter((i): i is number => typeof i === 'number' && i >= 0 && i < facts.length)
    .map(i => facts[i])
}

function buildDailyMessage(facts: FactRow[], lang: 'cn' | 'en'): string {
  const header = lang === 'cn'
    ? `📰 <b>StablePulse 日报</b> · ${yesterdayLabel('cn')}`
    : `📰 <b>StablePulse Daily</b> · ${yesterdayLabel('en')}`

  const items = facts
    .map((f, i) => {
      const content = (lang === 'cn' && f.content_zh) ? f.content_zh : f.content_en
      return `${i + 1}. ${esc(content)} <a href="${f.source_url}">🔗</a>`
    })
    .join('\n\n')

  const footer = lang === 'cn'
    ? `── 今日 ${facts.length} 条`
    : `── ${facts.length} items today`

  return [header, '', items, '', footer].join('\n')
}

export interface SendResult {
  skipped?: string   // reason for skip
  factCount?: number
  selected?: number
  channels?: number
}

export async function sendDailyNewsTelegram(): Promise<SendResult> {
  const [botToken, channels] = await Promise.all([
    getTelegramBotToken(),
    getTelegramChannels(),
  ])

  if (!botToken) {
    console.log('[Telegram] Daily: bot token not set, skipping')
    return { skipped: 'TELEGRAM_BOT_TOKEN not set in environment' }
  }
  if (channels.length === 0) {
    console.log('[Telegram] Daily: no channels configured, skipping')
    return { skipped: 'No channels configured — add one in Admin → Subscribers → Telegram Channels' }
  }

  const facts = await fetchYesterdayFacts()
  console.log(`[Telegram] Daily: ${facts.length} facts from yesterday's pipeline`)

  if (facts.length === 0) {
    return { skipped: 'No verified facts found for yesterday — run Collect + Process first', factCount: 0, channels: channels.length }
  }

  const top = await selectTopFacts(facts, 10)
  console.log(`[Telegram] Daily: selected ${top.length} top facts`)

  const msgCn = buildDailyMessage(top, 'cn')
  const msgEn = buildDailyMessage(top, 'en')

  for (const ch of channels) {
    const sends = await Promise.allSettled([
      ch.threadCn !== undefined ? sendToThread(botToken, ch.chatId, msgCn, ch.threadCn) : Promise.resolve(),
      ch.threadEn !== undefined ? sendToThread(botToken, ch.chatId, msgEn, ch.threadEn) : Promise.resolve(),
    ])
    sends.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[Telegram] Daily "${ch.name}" ${i === 0 ? 'CN' : 'EN'} failed:`, r.reason)
      }
    })
  }

  return { factCount: facts.length, selected: top.length, channels: channels.length }
}

// ─── Weekly ───────────────────────────────────────────────────────────────────

async function fetchWeeklyFacts(weekNumber: string): Promise<FactRow[]> {
  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_en, content_zh, source_url, confidence, fact_type, tags')
    .eq('week_number', weekNumber)
    .in('verification_status', ['verified', 'partially_verified'])
    .order('confidence', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[Telegram] fetchWeeklyFacts error:', error.message)
    return []
  }
  return (data ?? []) as FactRow[]
}

async function fetchActiveNarratives(weekNumber: string): Promise<NarrativeRow[]> {
  const { data } = await supabaseAdmin
    .from('narrative_threads')
    .select('id, topic, total_weeks, key_entities')
    .eq('status', 'active')
    .eq('last_updated_week', weekNumber)
    .order('total_weeks', { ascending: false })
    .limit(5)

  return (data ?? []) as NarrativeRow[]
}

async function fetchMarketStats(weekNumber: string): Promise<{
  factCount: number
  usdcBn: number | null
  usdtBn: number | null
  totalMktBn: number | null
}> {
  const [factsRes, metricsRes] = await Promise.allSettled([
    supabaseAdmin
      .from('atomic_facts')
      .select('id', { count: 'exact', head: true })
      .eq('week_number', weekNumber)
      .in('verification_status', ['verified', 'partially_verified']),
    supabaseAdmin
      .from('raw_onchain_metrics')
      .select('coin_symbol, metric_name, metric_value')
      .in('coin_symbol', ['USDC', 'USDT'])
      .eq('metric_name', 'circulating_supply')
      .order('fetched_at', { ascending: false })
      .limit(10),
  ])

  const factCount =
    factsRes.status === 'fulfilled' ? (factsRes.value.count ?? 0) : 0

  let usdcBn: number | null = null
  let usdtBn: number | null = null

  if (metricsRes.status === 'fulfilled' && metricsRes.value.data) {
    const seen = new Set<string>()
    for (const row of metricsRes.value.data as { coin_symbol: string; metric_value: number }[]) {
      const sym = row.coin_symbol.toUpperCase()
      if (seen.has(sym)) continue
      seen.add(sym)
      const bn = row.metric_value / 1e9
      if (sym === 'USDC') usdcBn = bn
      else if (sym === 'USDT') usdtBn = bn
    }
  }

  const totalMktBn =
    usdcBn !== null && usdtBn !== null ? null : null // Total from DeFiLlama if available

  return { factCount, usdcBn, usdtBn, totalMktBn }
}

async function generateWeeklyAIContent(
  facts: FactRow[],
  narratives: NarrativeRow[],
): Promise<WeeklyAIResult> {
  const factList = facts
    .map((f, i) => `[${i}] (${f.confidence ?? '?'}) ${f.content_en.slice(0, 160)}`)
    .join('\n')

  const narrativeList =
    narratives.length > 0
      ? narratives
          .map(
            (n, i) =>
              `[${i}] ${n.topic} (${n.total_weeks} weeks, entities: ${(n.key_entities ?? []).slice(0, 3).join(', ')})`,
          )
          .join('\n')
      : '(none — identify top 3 narratives yourself from the facts)'

  const prompt = `You are a stablecoin/PayFi intelligence editor composing a weekly digest.

## Facts this week (${facts.length} total):
${factList}

## Active narrative threads:
${narrativeList}

## Your task — return one JSON object:

1. featured_indices: indices of the 5 most important facts (regulatory > partnerships/launches > market metrics > general). No duplicates.

2. narratives: for the top 3 narrative threads (use provided threads if available, otherwise identify from facts):
   - topic_cn / topic_en: the narrative title in both languages
   - weeks: how many weeks this narrative has been active (use provided value if available, else estimate)
   - event_index: index of the single best fact representing this narrative this week
   - trend_cn: one sentence describing where this narrative is heading (Chinese)
   - trend_en: one sentence describing where this narrative is heading (English)

3. bullet_indices: indices of 5–8 remaining notable facts NOT already used in featured or narrative events.

## JSON format:
{
  "featured_indices": [2, 7, 1, 15, 4],
  "narratives": [
    {
      "topic_cn": "USDC市场份额扩张",
      "topic_en": "USDC Market Share Expansion",
      "weeks": 2,
      "event_index": 7,
      "trend_cn": "交易量首超USDT，Visa/Mastercard双线部署加速，机构级地位持续巩固。",
      "trend_en": "Volume surpasses USDT for the first time; Visa/Mastercard dual deployment accelerates institutional adoption."
    }
  ],
  "bullet_indices": [3, 9, 12, 18, 22]
}`

  try {
    return await callHaikuJSON<WeeklyAIResult>(prompt, { maxTokens: 2048 })
  } catch (err) {
    console.error('[Telegram] generateWeeklyAIContent failed:', err)
    // Graceful fallback: first 5 as featured, next 8 as bullets, no narratives
    return {
      featured_indices: [0, 1, 2, 3, 4].filter(i => i < facts.length),
      narratives: [],
      bullet_indices: [5, 6, 7, 8, 9, 10, 11, 12].filter(i => i < facts.length),
    }
  }
}

function buildWeeklyMessage(
  result: WeeklyAIResult,
  facts: FactRow[],
  stats: Awaited<ReturnType<typeof fetchMarketStats>>,
  lang: 'cn' | 'en',
  weekNumber: string,
  dateRange: { cn: string; en: string },
): string {
  const lines: string[] = []
  const isCn = lang === 'cn'

  // ── Header ──
  lines.push(
    isCn
      ? `📊 <b>StablePulse 周报</b> · ${weekNumber}`
      : `📊 <b>StablePulse Weekly</b> · ${weekNumber}`,
  )
  lines.push(isCn ? dateRange.cn : dateRange.en)
  lines.push('')

  // ── Stats line ──
  const parts: string[] = []
  if (stats.usdcBn !== null) parts.push(`USDC $${stats.usdcBn.toFixed(1)}B`)
  if (stats.usdtBn !== null) parts.push(`USDT $${stats.usdtBn.toFixed(1)}B`)
  parts.push(isCn ? `${stats.factCount} 条已验证` : `${stats.factCount} verified`)
  lines.push(parts.join(' · '))

  // ── Featured ──
  lines.push('')
  lines.push('━━━━━━')
  lines.push(isCn ? '<b>本周精选</b>' : '<b>Featured</b>')
  lines.push('')

  const usedIndices = new Set<number>()
  const featuredFacts = (result.featured_indices ?? [])
    .filter(i => typeof i === 'number' && i >= 0 && i < facts.length)
    .slice(0, 5)

  featuredFacts.forEach((idx, i) => {
    usedIndices.add(idx)
    const f = facts[idx]
    const content = (isCn && f.content_zh) ? f.content_zh : f.content_en
    lines.push(`${i + 1}. ${esc(content)} <a href="${f.source_url}">🔗</a>`)
    lines.push('')
  })

  // ── Narratives ──
  const validNarratives = (result.narratives ?? []).slice(0, 3)
  if (validNarratives.length > 0) {
    lines.push('━━━━━━')
    lines.push(isCn ? '<b>叙事追踪</b>' : '<b>Narratives</b>')
    lines.push('')

    for (const n of validNarratives) {
      const topic = isCn ? n.topic_cn : n.topic_en
      const weeksLabel = isCn ? `第 ${n.weeks} 周` : `Week ${n.weeks}`
      const trend = isCn ? n.trend_cn : n.trend_en

      lines.push(`📌 <b>${esc(topic)}</b>（${weeksLabel}）`)

      const eventIdx = n.event_index
      if (typeof eventIdx === 'number' && eventIdx >= 0 && eventIdx < facts.length) {
        usedIndices.add(eventIdx)
        const ef = facts[eventIdx]
        const eventContent = (isCn && ef.content_zh) ? ef.content_zh : ef.content_en
        const eventLabel = isCn ? '本周' : 'This week'
        lines.push(`${eventLabel}：${esc(eventContent)} <a href="${ef.source_url}">🔗</a>`)
      }

      const trendLabel = isCn ? '走势' : 'Trend'
      lines.push(`${trendLabel}：${esc(trend)}`)
      lines.push('')
    }
  }

  // ── Bullets ──
  const bulletFacts = (result.bullet_indices ?? [])
    .filter(i => typeof i === 'number' && i >= 0 && i < facts.length && !usedIndices.has(i))
    .slice(0, 8)
    .map(i => facts[i])

  if (bulletFacts.length > 0) {
    lines.push('━━━━━━')
    lines.push(isCn ? '<b>更多动态</b>' : '<b>More Updates</b>')
    lines.push('')
    for (const f of bulletFacts) {
      const content = (isCn && f.content_zh) ? f.content_zh : f.content_en
      lines.push(`· ${esc(content)} <a href="${f.source_url}">🔗</a>`)
    }
    lines.push('')
  }

  // ── Footer ──
  lines.push(
    isCn
      ? '<a href="https://stablepulse.app">阅读完整周报 →</a>'
      : '<a href="https://stablepulse.app">Read full report →</a>',
  )

  return lines.join('\n')
}

export async function sendWeeklyNewsTelegram(weekNumber: string): Promise<SendResult> {
  const [botToken, channels] = await Promise.all([
    getTelegramBotToken(),
    getTelegramChannels(),
  ])

  if (!botToken) {
    return { skipped: 'TELEGRAM_BOT_TOKEN not set in environment' }
  }
  if (channels.length === 0) {
    return { skipped: 'No channels configured — add one in Admin → Subscribers → Telegram Channels' }
  }

  const [facts, narratives, stats] = await Promise.all([
    fetchWeeklyFacts(weekNumber),
    fetchActiveNarratives(weekNumber),
    fetchMarketStats(weekNumber),
  ])

  console.log(
    `[Telegram] Weekly ${weekNumber}: ${facts.length} facts, ${narratives.length} narratives`,
  )

  if (facts.length === 0) {
    return { skipped: `No verified facts found for ${weekNumber} — run Collect + Process first`, factCount: 0, channels: channels.length }
  }

  const aiContent = await generateWeeklyAIContent(facts, narratives)
  const dateRange = weekDateRange(weekNumber)

  const msgCn = buildWeeklyMessage(aiContent, facts, stats, 'cn', weekNumber, dateRange)
  const msgEn = buildWeeklyMessage(aiContent, facts, stats, 'en', weekNumber, dateRange)

  for (const ch of channels) {
    const sends = await Promise.allSettled([
      ch.threadCn !== undefined ? sendToThread(botToken, ch.chatId, msgCn, ch.threadCn) : Promise.resolve(),
      ch.threadEn !== undefined ? sendToThread(botToken, ch.chatId, msgEn, ch.threadEn) : Promise.resolve(),
    ])
    sends.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[Telegram] Weekly "${ch.name}" ${i === 0 ? 'CN' : 'EN'} failed:`, r.reason)
      }
    })
  }

  console.log(`[Telegram] Weekly sent for ${weekNumber}`)
  return { factCount: facts.length, channels: channels.length }
}

// ─── Pipeline alert (no thread — goes to group main) ─────────────────────────

export async function sendPipelineAlert(pipelineType: string, error: string): Promise<void> {
  const [botToken, channels] = await Promise.all([
    getTelegramBotToken(),
    getTelegramChannels(),
  ])
  if (!botToken || channels.length === 0) return

  const text = `<b>⚠️ Pipeline Failed</b>\n\nType: ${esc(pipelineType)}\nError: ${esc(error)}`
  for (const ch of channels) {
    try {
      await sendToThread(botToken, ch.chatId, text)
    } catch (err) {
      console.error(`[Telegram] Alert to "${ch.name}" failed:`, err)
    }
  }
}
