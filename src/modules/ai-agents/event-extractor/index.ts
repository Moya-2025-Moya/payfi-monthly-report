// Event Extractor — V2 AI processing module
//
// Replaces B1 fact-splitter. Instead of atomic facts, extracts events:
// - One raw_item may produce 0-2 events
// - Batches 3-5 raw_items per AI call for efficiency
// - Outputs: title, summary, category, importance, entity_names
// - Chinese-first (title_zh, summary_zh), with English originals preserved

import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import { getActiveEntities } from '@/lib/watchlist'
import type { RawItem, ExtractedEvent, EventCategory, Importance } from '@/lib/types'

// ─── Config ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 5       // raw_items per AI call
const MAX_ITEMS = 200      // max raw_items per run
const MAX_CONTENT_LEN = 4000 // truncate long content per item

// ─── Types ─────────────────────────────────────────────────────────────────

interface AIExtractedEvent {
  title_zh: string
  title_en: string
  summary_zh: string
  summary_en: string
  category: string
  importance: number
  entity_names: string[]
  // Batch-local indices of articles that describe this event. Required so we
  // don't attribute every extracted event to every article in the batch.
  source_indices: number[]
}

interface AIExtractionResponse {
  events: AIExtractedEvent[]
}

// ─── Prompt ────────────────────────────────────────────────────────────────

function buildSystemPrompt(entityNames: string[]): string {
  return `You are a stablecoin/PayFi news editor. Your job is to extract distinct events from articles and rewrite them in a tight, reader-first style — NOT a researcher's abstract. Assume the reader is a busy professional deciding in 2 seconds whether to click.

## Core rules
1. Each event is a SINGLE, self-contained development (not a summary of an article)
2. Merge information that describes the same event across articles into one event — and set source_indices to ALL articles that contribute to it
3. Skip: duplicate events AND articles that are "pure opinion" by speakers without market-moving authority (see Opinion policy below)
4. source_indices: REQUIRED — array of article numbers (0-indexed) from the input that describe this event. Never invent indices. Never include articles that don't actually support the event.
5. Language: Chinese for title_zh/summary_zh, English for title_en/summary_en

## Headline (title_zh / title_en) — 4 mandatory elements
A valid headline must simultaneously carry:
  (a) Actor — who did it (name, never "a company" / "the issuer")
  (b) Verb — active voice (部署 / 冻结 / 批准 / 起诉 / 推出 / deploys / freezes / approves)
  (c) Object — what it targets (specific product, law, asset, chain)
  (d) HOOK — the single reason this is worth reading, picked in PRIORITY ORDER, stop at first hit:
      1. Concrete number ($340M / 3.4 亿美元 / 7 亿美元融资 / 12 个地址)
      2. Audience / market scale ($3T Islamic finance market / 欧盟 27 国 / 全美 40 州)
      3. Milestone (首次 / 史上最大 / 最终投票 / first of its kind)
      4. Specific counterparty that makes the deal newsworthy (BlackRock / 美 DOJ / 欧洲央行)

If the article does not supply any of the four hooks, the event is probably not newsworthy — prefer to skip it.

title_zh: 25–55 Chinese chars, one sentence, ends without trailing period. Active voice.
title_en: 10–25 English words, one sentence, active voice.

Example GOOD (hook = audience scale, #2): "PUSD 登陆 ADI Chain，瞄准 3 万亿美元伊斯兰金融市场"
Example BAD (no hook): "PUSD 稳定币部署 ADI Chain"
Example GOOD (hook = specific number, #1): "Tether 在以太坊链上冻结朝鲜洗钱网络相关的 3.4 亿美元 USDT"
Example BAD (passive, no active verb): "3.4 亿美元 USDT 被 Tether 冻结"

## Detail (summary_zh / summary_en) — OPTIONAL, 0 or 1 short sentence
summary_zh MUST PASS the "new information test": every character in it adds something the headline does NOT already state. Valid additions:
  • Mechanism (how it works: "以里亚尔+迪拉姆 1:1 储备")
  • Coverage / composition with NAMES ("覆盖 ETH / BNB / Solana / Tron 四链")
  • Specific timeline ("本周内表决" / "Q2 上线")
  • Specific counterparty not in headline ("承销方为花旗、高盛")
  • Legal/regulatory specifics ("依 MiCA 第 45 条的托管要求")

If the article offers nothing that passes the new-information test, OUTPUT EMPTY STRING "" for summary_zh / summary_en. An empty detail is ALWAYS preferred over filler.

If you do write a detail:
  • summary_zh: 1 complete sentence, 30–80 Chinese chars, ends with 。
  • summary_en: 1 complete sentence, 10–25 words
  • No adjectives without substance ("重要的战略合作" → delete it)
  • No restatement of headline nouns with adjectives ("这家面向中东机构结算的第二层网络" = definition padding, forbidden)

Example GOOD detail (for PUSD event): "以沙特里亚尔+阿联酋迪拉姆 1:1 储备，现覆盖 ETH / BNB / Solana / Tron 四链。"
Example BAD detail: "符合伊斯兰教法的稳定币 PUSD 已部署在 ADI Chain 上，这是一个专注于中东机构结算的第二层网络。" (restates headline; defines "ADI Chain" unnecessarily)

## Opinion policy (market-moving test)
INCLUDE opinion-framed news ONLY if the speaker has DIRECT market-moving authority:
  ✓ Regulators, central bankers, court judgments (SEC / CFTC / Fed / Powell / Lagarde / 易纲 / MAS / SFC / ESMA)
  ✓ CEOs / senior execs of the relevant issuer / exchange / custodian — ONLY when the statement is a binding commitment or specific plan (roadmap, exit decision, filing), not general commentary
  ✓ Rating agencies (Moody's / S&P / Fitch) — formal rating actions
  ✓ Large institutional investors publicly disclosing allocation changes (BlackRock / sovereign funds)

EXCLUDE (skip the event entirely if this is all the article has):
  ✗ Analyst predictions / "industry experts say"
  ✗ Media editorializing ("watershed moment", "game-changer")
  ✗ Crypto Twitter sentiment, KOL takes, retail reactions
  ✗ Exec predictions about the future ("I think in 3 years..." — unless it's a dated commitment)
  ✗ WSJ/FT/Bloomberg op-eds and analysis pieces
  ✗ Research firm trend reports (except BIS / IMF policy-level)

Decision rule: "if this person said this thing, would chain / order book move within the next hour?" Yes → include. No → skip.

## Anti-research-framing (STRICT)
Banned phrases that signal research / opinion framing:
  • Chinese: 据报道 / 有消息称 / 据悉 / 业内人士认为 / 分析师指出 / 分析认为 / 业内认为 / 市场普遍认为 / 或将 / 有望 / 被视为 / 引发关注 / 意味着 / 值得关注 / 众所周知
  • English: analysts say, industry experts believe, reportedly, sources say, could usher in, is seen as, signals a shift, watershed moment, landmark

If the original article uses these, rewrite in direct factual voice. The headline / detail should state facts, not frame them.

## Anti-vague-quantifier policy (STRICT)
Bare quantifiers without enumeration are BANNED in title_zh / title_en / summary_zh / summary_en. Banned phrases include (not exhaustive):
  • Chinese: 几家 / 多家 / 若干 / 数家 / 一些 / 多个 / 一批 / 部分 / 大量 / 不少 / 少数 / 许多 / 数十家 / 数百 / 多国 / 多方 / 多家交易所 / 多个地址 / 多名
  • English: several, multiple, some, various, numerous, many, a few, a handful of, a number of, dozens of, multiple parties, several exchanges

When the source article states a vague quantity, you MUST do one of the following — DO NOT simply omit the detail:
  A. ENUMERATE if the article names the items. Example: "Binance、OKX、Bybit 三家交易所冻结账户".
  B. PARTIALLY-ENUMERATE + explicit remainder count. Example: "8 家稳定币发行方（已披露 Circle、Paxos、PayPal，其余 5 家未具名）".
  C. EXPLICITLY FLAG as undisclosed. Example: "三家混币服务（具体名称未披露）" / "three mixing services (identities not disclosed)". REQUIRED if you cannot enumerate.

Omitting the detail entirely to avoid vagueness is FORBIDDEN — the reader must see either the names or an explicit "未披露" marker.

## Categories
- regulatory: laws, bills, enforcement, licenses, compliance actions
- partnership: business deals, integrations, collaborations
- product: new features, launches, upgrades, technical changes
- funding: fundraising, investments, acquisitions
- market: market data, TVL, volume, market cap changes
- policy: company policy changes, strategic shifts
- technical: blockchain upgrades, protocol changes, security incidents
- other: anything that doesn't fit above

## Importance
- 1 (critical): Major regulatory action, billion-dollar events, market-moving news
- 2 (high): Significant partnerships, product launches, important policy changes
- 3 (medium): Notable updates, moderate funding rounds, incremental progress
- 4 (low): Minor mentions, routine updates

## Known entities (use these exact names when they appear):
${entityNames.join(', ')}

## Output format
Respond with JSON: {"events": [{"title_zh", "title_en", "summary_zh", "summary_en", "category", "importance", "entity_names", "source_indices": [0,2]}]}
If no events worth extracting, return {"events": []}`
}

function buildUserPrompt(items: RawItem[]): string {
  // Index articles 0..N-1 so AI's source_indices field aligns with batch positions.
  const parts = items.map((item, i) => {
    const title = item.title ?? '(no title)'
    const content = item.content?.slice(0, MAX_CONTENT_LEN) ?? ''
    const fullText = item.full_text?.slice(0, MAX_CONTENT_LEN) ?? ''
    const text = fullText || content
    return `--- Article ${i} [${item.source_type}/${item.source_name}] ---
Title: ${title}
Content: ${text}
URL: ${item.source_url}
Date: ${item.published_at}`
  })

  return `Extract events from these ${items.length} articles (indexed 0..${items.length - 1}):\n\n${parts.join('\n\n')}`
}

// ─── Validation ────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set<string>([
  'regulatory', 'partnership', 'product', 'funding',
  'market', 'policy', 'technical', 'other',
])

// Vague quantifier detector. Matches a banned phrase ONLY if it's not
// immediately followed by an acknowledgement tag like "（具体未披露）" or
// "(not disclosed)". Used for observability, not rejection — the prompt is
// the primary defense; this lets us see when the model drifts.
const VAGUE_ZH = [
  '几家', '多家', '若干', '数家', '一些', '多个', '一批', '部分',
  '大量', '不少', '少数', '许多', '数十家', '多方', '多名', '多国',
]
const VAGUE_EN = [
  'several', 'multiple', 'some', 'various', 'numerous', 'many',
  'a few', 'a handful of', 'a number of', 'dozens of',
]
const DISCLOSURE_TAG_RE =
  /（\s*(具体)?(名称|身份)?\s*(未|暂未|尚未)?\s*(披露|公开|具名|公布)\s*）|\(\s*(not\s*disclosed|undisclosed|not\s*named|identities?\s*not\s*disclosed)\s*\)/i

// Research / opinion framing phrases. We log (don't reject) when these leak
// through, so prompt drift is visible in logs.
const RESEARCH_FRAMING_ZH = [
  '据报道', '有消息称', '据悉', '业内人士', '分析师指出', '分析认为',
  '业内认为', '市场普遍认为', '或将', '有望', '被视为', '引发关注',
  '意味着', '值得关注', '众所周知',
]
const RESEARCH_FRAMING_EN = [
  'analysts say', 'industry experts', 'reportedly', 'sources say',
  'could usher in', 'is seen as', 'signals a shift', 'watershed moment',
  'landmark',
]

function hasUnescortedVague(text: string): string | null {
  if (!text) return null
  for (const kw of VAGUE_ZH) {
    const idx = text.indexOf(kw)
    if (idx >= 0) {
      const tail = text.slice(idx, idx + kw.length + 60)
      if (!DISCLOSURE_TAG_RE.test(tail)) return kw
    }
  }
  const lower = text.toLowerCase()
  for (const kw of VAGUE_EN) {
    const re = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'i')
    const m = re.exec(lower)
    if (m) {
      const tail = text.slice(m.index, m.index + kw.length + 80)
      if (!DISCLOSURE_TAG_RE.test(tail)) return kw
    }
  }
  return null
}

function hasResearchFraming(text: string): string | null {
  if (!text) return null
  for (const kw of RESEARCH_FRAMING_ZH) {
    if (text.includes(kw)) return kw
  }
  const lower = text.toLowerCase()
  for (const kw of RESEARCH_FRAMING_EN) {
    if (lower.includes(kw)) return kw
  }
  return null
}

function validateEvent(e: AIExtractedEvent): { event: ExtractedEvent; sourceIndices: number[] } | null {
  // title_zh is mandatory; summary_zh is optional (headline-only events are
  // allowed when the headline is self-sufficient).
  if (!e.title_zh || e.title_zh.length < 3) return null
  // Normalise missing/whitespace-only summaries to empty string so downstream
  // rendering can branch on e.summary_zh === ''.
  const summary_zh = typeof e.summary_zh === 'string' ? e.summary_zh.trim() : ''
  const summary_en = typeof e.summary_en === 'string' ? e.summary_en.trim() : ''

  // Observability: log drift on anti-vague + anti-research-framing rules.
  // Rejection would cost events we'd rather keep; warnings let us tighten.
  const vagueHit =
    hasUnescortedVague(e.title_zh) ||
    hasUnescortedVague(summary_zh) ||
    hasUnescortedVague(e.title_en ?? '') ||
    hasUnescortedVague(summary_en)
  if (vagueHit) {
    console.warn(
      `[event-extractor] vague-quantifier leak "${vagueHit}" in: ${e.title_zh.slice(0, 80)}`,
    )
  }
  const framingHit =
    hasResearchFraming(e.title_zh) ||
    hasResearchFraming(summary_zh) ||
    hasResearchFraming(e.title_en ?? '') ||
    hasResearchFraming(summary_en)
  if (framingHit) {
    console.warn(
      `[event-extractor] research-framing leak "${framingHit}" in: ${e.title_zh.slice(0, 80)}`,
    )
  }

  const category = VALID_CATEGORIES.has(e.category)
    ? (e.category as EventCategory)
    : 'other'

  const importance = (e.importance >= 1 && e.importance <= 4)
    ? (e.importance as Importance)
    : 3

  const sourceIndices = Array.isArray(e.source_indices)
    ? e.source_indices.filter(i => Number.isInteger(i) && i >= 0)
    : []

  return {
    event: {
      title_zh: e.title_zh,
      title_en: e.title_en || '',
      summary_zh, // may be '' (headline-only event)
      summary_en,
      category,
      importance,
      entity_names: Array.isArray(e.entity_names) ? e.entity_names : [],
      raw_item_ids: [], // filled by caller from sourceIndices
      source_urls: [],  // filled by caller from sourceIndices
      published_at: new Date().toISOString(), // overridden by caller
    },
    sourceIndices,
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

export async function extractEvents(rawItemIds?: string[]): Promise<{
  events: ExtractedEvent[]
  processedCount: number
}> {
  // Fetch unprocessed raw_items
  let query = supabaseAdmin
    .from('raw_items')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(MAX_ITEMS)

  if (rawItemIds && rawItemIds.length > 0) {
    query = query.in('id', rawItemIds)
  } else {
    query = query.eq('processed', false)
  }

  const { data: rawItems, error } = await query

  if (error) throw new Error(`Failed to fetch raw_items: ${error.message}`)
  if (!rawItems || rawItems.length === 0) {
    console.log('[event-extractor] No unprocessed items')
    return { events: [], processedCount: 0 }
  }

  console.log(`[event-extractor] Processing ${rawItems.length} raw items`)

  // Get entity names for the prompt
  const entities = await getActiveEntities()
  const entityNames = entities.map(e => e.name)

  const systemPrompt = buildSystemPrompt(entityNames)
  const allEvents: ExtractedEvent[] = []

  // Process in batches
  for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
    const batch = rawItems.slice(i, i + BATCH_SIZE) as RawItem[]
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(rawItems.length / BATCH_SIZE)

    console.log(`[event-extractor] Batch ${batchNum}/${totalBatches} (${batch.length} items)`)

    try {
      const result = await callHaikuJSON<AIExtractionResponse>(
        buildUserPrompt(batch),
        { system: systemPrompt, maxTokens: 4096, cacheSystem: true }
      )

      const events = result.events ?? []
      let validCount = 0
      for (const rawEvent of events) {
        const validated = validateEvent(rawEvent)
        if (!validated) continue
        const { event, sourceIndices } = validated

        // Resolve source_indices → actual articles. If AI didn't supply valid
        // indices, fall back to the whole batch (old behavior) with a warning,
        // since dropping the event silently would hide extraction bugs.
        const inRange = sourceIndices.filter(i => i < batch.length)
        const cited = inRange.length > 0 ? inRange.map(i => batch[i]) : batch
        if (inRange.length === 0) {
          console.warn(
            `[event-extractor] Event "${event.title_zh}" missing valid source_indices; ` +
            `attributing to whole batch of ${batch.length}.`,
          )
        }

        event.raw_item_ids = cited.map(item => item.id)
        event.source_urls = [...new Set(cited.map(item => item.source_url))]
        event.published_at = cited.map(item => item.published_at).sort()[0]

        allEvents.push(event)
        validCount++
      }

      console.log(`[event-extractor]   → ${events.length} events extracted, ${validCount} valid`)
    } catch (err) {
      console.error(`[event-extractor] Batch ${batchNum} failed:`, err instanceof Error ? err.message : String(err))
    }

    // Mark batch as processed
    const batchIds = batch.map(item => item.id)
    await supabaseAdmin
      .from('raw_items')
      .update({ processed: true })
      .in('id', batchIds)
  }

  console.log(`[event-extractor] Total: ${allEvents.length} events from ${rawItems.length} raw items`)
  return { events: allEvents, processedCount: rawItems.length }
}
