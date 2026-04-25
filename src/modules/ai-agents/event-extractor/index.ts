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
const MAX_CONTENT_LEN = 12000 // truncate long content per item — body needs enough room for numbers / named entities the LLM must pull into headlines

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

## CRITICAL: read the full article
Each article below includes a full Content body (often 5–12k characters), NOT just a headline. You MUST scan the whole body to find the concrete numbers, named parties, amounts, dates, and jurisdictions that belong in the headline. Numbers buried in paragraph 5 must make it to the headline if they are the most eye-catching fact in the story. Do not write headlines based on the source's own title alone — the source's title is often generic and missing the key stat.

## Inclusion threshold (4 tests, ALL must pass — otherwise skip this article)

### 1. Core-topic relevance (STRICT — most common reason to skip)
The article's CORE SUBJECT (what the headline AND first 2-3 paragraphs are about) must be crypto/stablecoin/PayFi. A peripheral mention is NOT enough.

INCLUDE if core subject is:
  • Stablecoin issuance / adoption / redemption / reserves / depeg events
  • Crypto-payment rails, merchants accepting crypto, crypto-native lending
  • Regulatory action primarily targeting crypto entities, stablecoin issuers, or DeFi
  • CBDC progress, tokenized securities, on-chain RWA
  • Major crypto exchanges / custodians / infrastructure
  • Enforcement that SPECIFICALLY freezes or designates crypto wallets/tokens

SKIP (even if the article mentions crypto in passing):
  • Traditional banking: rebrands, BaaS deployments for traditional banks, credit cards, non-crypto e-money products
  • Non-crypto sanctions: fentanyl / drugs / terrorism / general financial sanctions where the body doesn't explicitly list crypto wallets/tokens as designated assets
  • Pure fintech: neobanks, payment apps, credit scoring, unless stablecoin / crypto integration is the core
  • Traditional asset management: money market funds, ETFs, unless the fund's mandate is crypto/stablecoin reserves
  • General macro / monetary policy unless crypto is the specific subject

### 2. Primary-source test (commentary detection)
If the article is clearly COMMENTARY or REACTION on someone else's event (phrases like "this signals", "market reacted", "analysts interpret"), DO NOT treat it as the original event. Re-frame:
  • If the commentary has its own concrete data (odds, flows, price moves) → treat as a market/reaction event, category='market'
  • If the commentary has no concrete data and the primary event isn't in any other article in this batch → SKIP (we're not a tabloid)

Real-world example (DO NOT repeat):
  Article: "Morgan Stanley unveils stablecoin reserves fund amid GENIUS Act anticipation" (Crypto Briefing) — actually a Polymarket analysis piece. Body says "unveiled a Stablecoin Reserves Portfolio" with ZERO fund specifics (no AUM, no launch date, no fee), then 400 words about Polymarket depeg contract at 2.9% YES / 252 days / 33x return.
  WRONG: extract "Morgan Stanley 推出稳定币准备金基金" — fund has no verifiable details in source
  RIGHT: extract "Polymarket 稳定币脱锚合约在 MS 公告后仍停留在 2.9% YES，距结算 252 天" (category='market', hooks the real numbers)
  OR: skip entirely — those Polymarket numbers may not pass newsworthy bar

### 3. Non-duplicate — not the same event as another article in this batch

### 4. Not pure opinion without market-moving authority (see Opinion policy)

If all 4 tests pass, INCLUDE. "No strong hook" is NOT a reason to skip — that's a WRITING problem.

## Real-world SKIP examples (these exact events were extracted incorrectly — do NOT repeat)

### BAD 1: traditional BaaS, no stablecoin/crypto involvement
  Article: Monument Technology + Castle Trust Bank BaaS deployment (finextra.com)
  Body: entirely about traditional UK banking-as-a-service; no stablecoin, no crypto token, no on-chain component
  Verdict: SKIP — fails core-topic test

### BAD 2: non-crypto sanctions, drug enforcement
  Article: "OFAC sanctions 23 entities tied to fentanyl trafficking" (@USTreasury)
  Body: Sinaloa cartel, opioid supply chain — NO designated crypto addresses mentioned
  Verdict: SKIP — OFAC often has non-crypto actions; sanctions are on-topic only when crypto addresses are specifically designated

## Importance rating (1 = most important, 4 = least)
- 1 critical: billion-dollar events, major regulatory actions (SEC/CFTC enforcement, bill passage), market-moving frozen assets, major security incidents
- 2 high: significant partnerships with named major players, product launches by top issuers, material policy shifts, meaningful funding rounds ($50M+)
- 3 medium: routine partnerships, incremental product updates, moderate enforcement actions (small fines), moderate funding
- 4 low: corporate rebrands, minor PR, internal reorgs, routine compliance filings without market impact

Corporate rebrands, executive appointments, routine business PR → almost always importance 3 or 4. The 5-per-category digest cap will naturally push them out; we don't skip them, we just rank them low.

## Headline writing rules (title_zh / title_en) — ALL mandatory
Every headline is a complete sentence with:
  (a) Actor — the named subject (never "a company" / "the issuer")
  (b) Active verb — 部署 / 冻结 / 批准 / 起诉 / 推出 / 调降 / deploys / freezes / approves / downgrades
  (c) Object — what it targets (product, law, asset, chain, entity)

### The "2-number rule" (most important — CHECK BEFORE OUTPUT)
If the article body contains ANY numbers (dollar amounts, percentages, counts, dates beyond just the publication date, legal statute numbers, time intervals), the HEADLINE itself must carry AT LEAST TWO of them — pick the MOST EYE-CATCHING two (rank by: dollar magnitude > percentage swings > count of entities > date/deadline > legal article number).

**This applies to the title field ONLY. Putting numbers in summary_zh does NOT satisfy the rule — numbers must appear in title_zh.**

**Mandatory self-check before finalizing output**: scan the article body for numbers. Count the numbers present in your drafted title_zh. If body has ≥2 numbers AND title_zh has <2 numbers, REWRITE the title to lift the 2 most eye-catching into it, even if that makes the title longer (up to 70 Chinese chars).

If the article body contains exactly ONE number → headline carries that number + one other concrete element (named counterparty, date, jurisdiction, chain, mechanism name).

If the article body contains ZERO numbers → headline carries two concrete non-numeric elements (two named entities, or entity + specific action, or action + specific outcome).

### PYUSD compliance example (this exact failure happened — do NOT repeat)
Article body said: "PYUSD's market cap dropped from $4.22B to $3.6B over three days, with over $400M in supply reduction executed by Paxos."

BAD (previous output, fails 2-number rule — numbers are in detail, not title):
  title_zh: "PayPal 稳定币市值大幅下降"
  summary_zh: "PYUSD 三天内市值从 4.22B 美元下降至 3.6B 美元，发生了超过 400M 美元的供应量减少。"

GOOD (compliant — 2 most eye-catching numbers are IN the title):
  title_zh: "PayPal PYUSD 三天内供应量减少 400M 美元，市值从 4.22B 美元降至 3.6B 美元"
  summary_zh: "减少操作由发行合作方 Paxos 执行，Paxos 未披露赎回客户身份。"

### Number format — output MUST use k / M / B / T, NEVER 千 / 万 / 亿 / 万亿
Chinese readers of crypto/fintech news are fluent in k/M/B/T. **All numeric magnitudes in title_zh / summary_zh / title_en / summary_en MUST be expressed in k / M / B / T (English units), regardless of how the source article wrote them.**

  • If source uses English (M / B / billion / million) → keep the digits and unit letter verbatim, do not rescale.
  • If source uses Chinese (千 / 万 / 亿 / 万亿) → CONVERT into k / M / B / T using the rules below.

Conversion table (Chinese source → required output):
  • 1 千  = 1k       (e.g. "5 千人"          → "5k 人")
  • 1 万  = 10k      (e.g. "5 万人"          → "50k 人";    "1.2 万"  → "12k")
  • 1 百万 = 1M      (e.g. "300 万美元"       → "3M 美元")
  • 1 千万 = 10M     (e.g. "3 千万美元"       → "30M 美元")
  • 1 亿   = 100M    (e.g. "1.27 亿美元"     → "127M 美元"; "4.22 亿美元" → "422M 美元")
  • 10 亿  = 1B      (e.g. "12 亿"           → "1.2B")
  • 1 万亿 = 1T      (e.g. "3 万亿美元"      → "3T 美元")

English-unit examples (already in k/M/B — keep as-is, just attach 美元 if dollar):
  • "$127.5M"     → "127.5M 美元"  (NOT "1.275 亿美元")
  • "$4.22B"      → "4.22B 美元"   (NOT "42.2 亿美元")
  • "$900K"       → "900K 美元"    (NOT "90 万美元")
  • "1.2 billion" → "1.2B"          (NOT "12 亿")

Decimal precision: keep 1 decimal place by default; drop trailing ".0" for whole numbers (write "5M" not "5.0M", write "1.2M" not "1M" when source is 1,200,000). Do NOT preserve "万" as an exception — "5 万" must become "50k", never "5万".

The "$" becomes "美元" after the number; digits and the unit letter (k / M / B / T) stay identical to the converted value. Never emit 千 / 万 / 亿 / 万亿 anywhere in the output.

### No-invented-numbers rule (hard constraint, overrides everything else)
Every digit-bearing token in title_zh / title_en / summary_zh / summary_en MUST appear, with the same value and same order of magnitude, in the source article body. If the body does not contain a specific number for a fact, DO NOT put a number in the headline for that fact — write it qualitatively, or pick a different fact that IS numbered in the body.

Before output, for each number in your headline, locate it in the article body. If you can't locate it verbatim (same digits, same unit), remove it. A qualitative headline is better than a fabricated number.

### Banned in headlines (and detail) — vague adjectives
These words carry no information and MUST be replaced by the underlying number/name/fact:
  • Chinese: 大幅 / 显著 / 明显 / 重大 / 关键的 / 战略性 / 重要的 / 历史性 / 划时代 / 广泛 / 有力 / 强劲
  • English: major, significant, substantial, critical, strategic, important, key, historic, landmark, sweeping, robust, strong

If the article's own wording uses these, find the underlying number in the body and put THAT in the headline instead. Example: "market cap dropped significantly" → find the % or $ drop and write that number.

title_zh: 30–70 Chinese chars, one sentence. May use comma to chain clauses so two numbers/facts fit. Active voice.
title_en: 12–30 English words.

### Concrete examples

Example GOOD (2 numbers): "PayPal PYUSD 三天内供应量减少 400M 美元，市值从 4.22B 美元降至 3.6B 美元"
Example BAD (adjective, no number): "PayPal 稳定币市值大幅下降"

Example GOOD (1 number + named entity): "PUSD 登陆 ADI Chain，瞄准 3T 美元伊斯兰金融市场"
Example BAD (no hook, generic): "PUSD 稳定币部署 ADI Chain"

Example GOOD (2 numbers): "Tether 冻结朝鲜洗钱网络相关的 12 个以太坊地址共 340M USDT"
Example BAD (passive): "340M USDT 被 Tether 冻结"

Example GOOD (0 numbers, 2 concrete entities): "Kalshi 对 3 名参议院候选人下达 5 年禁令，开创候选人自交易执法先例"
(note: "3 名" and "5 年" are numbers — if the article had them, use them; here we show pure-text case)

## Detail (summary_zh / summary_en) — OPTIONAL, 0 or 1 short sentence
summary_zh holds the NEXT layer of facts that didn't fit in the headline:
  • Additional numbers (after the 2 most eye-catching ones are in the title)
  • Mechanism (how it works)
  • Secondary counterparties or venues
  • Timeline or procedural step

MUST PASS the "new information test": every character adds something the headline does NOT already state. If nothing passes, output EMPTY STRING "".

Detail constraints:
  • 1 sentence, 30–90 Chinese chars (or 10–30 English words)
  • No restatement of headline
  • No vague adjectives (same ban list as headline)
  • No opinions, no predictions

Example GOOD headline + detail pair:
  title_zh: "PayPal PYUSD 三天内供应量减少 400M 美元，市值从 4.22B 美元降至 3.6B 美元"
  summary_zh: "减少操作由发行合作方 Paxos 执行，Paxos 未披露赎回客户身份。"

## Opinion policy (market-moving test)
INCLUDE opinion-framed news ONLY if the speaker has DIRECT market-moving authority:
  ✓ Regulators, central bankers, court judgments
  ✓ CEOs of relevant issuer / exchange / custodian — ONLY when binding commitment or specific plan (roadmap, exit decision, filing)
  ✓ Rating agencies — formal rating actions
  ✓ Large institutional investors publicly disclosing allocation changes

EXCLUDE:
  ✗ Analyst predictions / "industry experts say"
  ✗ Media editorializing
  ✗ Crypto Twitter sentiment, KOL takes
  ✗ Exec speculation about the future (unless dated commitment)
  ✗ Op-eds / analysis pieces
  ✗ Research firm trend reports (except BIS / IMF policy-level)

Decision rule: "if this person said this thing, would chain / order book / regulated firms move within the next hour?" Yes → include. No → skip.

## Core output rules
1. Each event is a SINGLE, self-contained development
2. Merge information describing the same event across articles; set source_indices to ALL contributing articles
3. source_indices: REQUIRED — 0-indexed article numbers from input that describe this event. Never invent indices.
4. Language: Chinese for title_zh/summary_zh, English for title_en/summary_en

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

// Vague adjectives that the prompt bans from headlines/details. They carry no
// information — the underlying number should appear instead. Observability
// only: we warn so prompt drift is visible.
const VAGUE_ADJ_ZH = [
  '大幅', '显著', '明显', '重大', '关键的', '战略性', '重要的',
  '历史性', '划时代', '广泛', '有力', '强劲',
]
const VAGUE_ADJ_EN_RE =
  /\b(major|significant(?:ly)?|substantial(?:ly)?|critical|strategic|important|key|historic|landmark|sweeping|robust|strong)\b/i

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

function hasVagueAdjective(text: string): string | null {
  if (!text) return null
  for (const kw of VAGUE_ADJ_ZH) {
    if (text.includes(kw)) return kw
  }
  const m = VAGUE_ADJ_EN_RE.exec(text)
  if (m) return m[0]
  return null
}

// Count numeric tokens: Arabic digits (allowing .,%$亿万千B(n)M(n)k commas),
// Chinese numerals in a counter position, and percentage / currency-prefixed
// numbers. Rough but good enough to flag "title has no numbers despite body
// containing many".
const NUMBER_TOKEN_RE = /[0-9]+[0-9.,]*\s*(%|亿|万|千|百万|M|B|bn|k)?|[一二三四五六七八九十百千万]+(家|个|位|名|次|天|年|月|周|亿|万|倍|%)/g
function countNumberTokens(text: string): number {
  if (!text) return 0
  const matches = text.match(NUMBER_TOKEN_RE)
  return matches ? matches.length : 0
}

// Crypto / stablecoin / PayFi keyword canary. If an extracted event's full
// text (title + summary in both langs) contains none of these, the LLM
// likely extracted something off-topic — warn so drift is visible.
const CRYPTO_KEYWORD_RE =
  /\b(stablecoin|stablecoins|usdc|usdt|pyusd|dai|usde|rlusd|fdusd|tusd|bitcoin|ethereum|solana|crypto|cryptocurrency|cbdc|digital\s+dollar|digital\s+euro|digital\s+asset|tokenization|tokenized|tokenised|blockchain|defi|dex|chain|circle|tether|paxos|coinbase|binance|kraken|genius\s+act|mica|clarity\s+act|polymarket|kalshi|ripple|ondo|fidu|buidl)\b|稳定币|加密|比特币|以太|链上|代币化|数字美元|数字欧元|数字资产|区块链/i

function hasCryptoKeyword(...texts: string[]): boolean {
  for (const t of texts) {
    if (t && CRYPTO_KEYWORD_RE.test(t)) return true
  }
  return false
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
  const adjHit =
    hasVagueAdjective(e.title_zh) ||
    hasVagueAdjective(summary_zh) ||
    hasVagueAdjective(e.title_en ?? '') ||
    hasVagueAdjective(summary_en)
  if (adjHit) {
    console.warn(
      `[event-extractor] vague-adjective leak "${adjHit}" in: ${e.title_zh.slice(0, 80)}`,
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

        // Observability: body has numbers but title doesn't — prompt violation.
        const bodyText = cited
          .map(it => `${it.title ?? ''} ${it.full_text ?? ''} ${it.content ?? ''}`)
          .join(' ')
        const bodyNums = countNumberTokens(bodyText)
        const titleNums = countNumberTokens(event.title_zh)
        if (bodyNums >= 2 && titleNums < 2) {
          console.warn(
            `[event-extractor] 2-number-rule miss: body has ${bodyNums} numbers, ` +
            `title has ${titleNums}: "${event.title_zh.slice(0, 80)}"`,
          )
        }

        // Observability: if the final event (title + summary) contains no
        // crypto keyword in either language, the LLM likely ignored the
        // core-topic test and extracted an off-topic event (Monument BaaS /
        // OFAC fentanyl style). Warn so we can see drift.
        if (!hasCryptoKeyword(event.title_zh, event.summary_zh, event.title_en, event.summary_en)) {
          console.warn(
            `[event-extractor] off-topic leak (no crypto keyword): "${event.title_zh.slice(0, 80)}"`,
          )
        }

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
