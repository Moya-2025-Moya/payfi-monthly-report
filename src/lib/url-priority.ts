// URL display priority — when an event has multiple source URLs (Twitter +
// RSS media + primary press), we want the reader's click-through to land on
// the MOST authoritative / most detailed source, not the first URL that
// happened to be collected.
//
// Used at digest render time: sortUrlsByPriority() reorders source_urls,
// then the existing pickLiveUrl() walks the sorted list and returns the
// first URL that is actually live. If Tier-1 is dead, Tier-2 is tried, etc.
// So the DISPLAYED url is always both (a) the highest-priority reachable
// source and (b) guaranteed live.
//
// Lower tier number = higher priority (shown first).

const HOST_TIER: Array<[RegExp, number]> = [
  // ── Tier 1: Issuer / company primary press (one-hand) ──
  [/(?:^|\.)circle\.com$/i, 1],
  [/(?:^|\.)tether\.io$/i, 1],
  [/(?:^|\.)paxos\.com$/i, 1],
  [/^newsroom\.paypal-corp\.com$/i, 1],
  [/^investor\.coinbase\.com$/i, 1],
  [/^investor\.visa\.com$/i, 1],
  [/^investor\.mastercard\.com$/i, 1],
  [/(?:^|\.)stripe\.com$/i, 1],
  [/^blog\.kraken\.com$/i, 1],
  [/(?:^|\.)fireblocks\.com$/i, 1],
  [/^blog\.chain\.link$/i, 1],
  [/^forum\.makerdao\.com$/i, 1],
  [/^ark-invest\.com$/i, 1],
  // Medium hosts company blogs (Circle, MakerDAO, BlackRock, JPMorgan,
  // Ondo, Polymarket, Frax, Coinbase). Treated as Tier-1 for our use case.
  [/(?:^|\.)medium\.com$/i, 1],

  // ── Tier 2: Regulator / central bank official ──
  [/(?:^|\.)sec\.gov$/i, 2],
  [/(?:^|\.)cftc\.gov$/i, 2],
  [/(?:^|\.)federalreserve\.gov$/i, 2],
  [/(?:^|\.)occ\.gov$/i, 2],
  [/(?:^|\.)treasury\.gov$/i, 2],
  [/^esma\.europa\.eu$/i, 2],
  [/^(?:www\.)?ecb\.europa\.eu$/i, 2],
  [/(?:^|\.)fca\.org\.uk$/i, 2],
  [/(?:^|\.)bankofengland\.co\.uk$/i, 2],
  [/(?:^|\.)sfc\.hk$/i, 2],
  [/(?:^|\.)boj\.or\.jp$/i, 2],

  // ── Tier 3: Crypto media ──
  [/(?:^|\.)theblock\.co$/i, 3],
  [/(?:^|\.)coindesk\.com$/i, 3],
  [/(?:^|\.)cointelegraph\.com$/i, 3],
  [/(?:^|\.)decrypt\.co$/i, 3],
  [/(?:^|\.)cryptobriefing\.com$/i, 3],
  [/(?:^|\.)blockworks\.co$/i, 3],
  [/(?:^|\.)dlnews\.com$/i, 3],
  [/(?:^|\.)thedefiant\.io$/i, 3],
  [/(?:^|\.)unchainedcrypto\.com$/i, 3],
  [/(?:^|\.)cryptoslate\.com$/i, 3],
  [/(?:^|\.)protos\.com$/i, 3],
  [/^wublock\.substack\.com$/i, 3],
  [/(?:^|\.)coindeskkorea\.com$/i, 3],
  [/(?:^|\.)coinpost\.jp$/i, 3],

  // ── Tier 4: Payments / fintech media ──
  [/(?:^|\.)pymnts\.com$/i, 4],
  [/(?:^|\.)finextra\.com$/i, 4],
  [/(?:^|\.)paymentsdive\.com$/i, 4],

  // ── Tier 5: Mainstream finance media ──
  [/(?:^|\.)bloomberg\.com$/i, 5],
  [/(?:^|\.)reuters\.com$/i, 5],
  [/(?:^|\.)ft\.com$/i, 5],
  [/(?:^|\.)wsj\.com$/i, 5],

  // ── Tier 7: Twitter / X (explicit deprioritization) ──
  // A tweet is OK as a fallback when it's the only URL we have, but we
  // should never prefer it when a press release / article / regulator
  // page exists.
  [/^(?:mobile\.)?twitter\.com$/i, 7],
  [/(?:^|\.)x\.com$/i, 7],
]

const TIER_UNKNOWN = 6   // Host we don't recognize — above Twitter, below named media
const TIER_INVALID = 99  // Unparseable URL

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

function tierOf(url: string): number {
  const host = hostOf(url)
  if (!host) return TIER_INVALID
  for (const [re, tier] of HOST_TIER) {
    if (re.test(host)) return tier
  }
  return TIER_UNKNOWN
}

// Return urls reordered by tier; preserves relative order within the same
// tier (stable sort — Array.sort in modern Node is stable).
export function sortUrlsByPriority(urls: readonly string[]): string[] {
  return [...urls].sort((a, b) => tierOf(a) - tierOf(b))
}
