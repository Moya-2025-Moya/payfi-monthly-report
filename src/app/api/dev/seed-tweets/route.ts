// Dev-only: Seed raw_tweets with realistic mock data when Twitter API has no results
import { supabaseAdmin } from '@/db/client'
import { NextResponse } from 'next/server'

const MOCK_TWEETS = [
  // ── Founders ──
  {
    author_handle: 'jerallaire',
    author_name: 'Jeremy Allaire',
    author_category: 'founder',
    content:
      'USDC is now live on 16 blockchains with native issuance. Cross-chain transfers via CCTP v2 are settling in under 20 seconds. This is the future of internet payments — fast, transparent, and programmable money.',
    likes: 4821,
    retweets: 1203,
    replies: 287,
    days_ago: 1,
  },
  {
    author_handle: 'jerallaire',
    author_name: 'Jeremy Allaire',
    author_category: 'founder',
    content:
      'Circle has filed its S-1 with the SEC. We believe regulated, transparent digital dollars are a critical part of the global financial system. Excited for this next chapter.',
    likes: 12430,
    retweets: 3821,
    replies: 956,
    days_ago: 3,
  },
  {
    author_handle: 'paaborsch',
    author_name: 'Paolo Ardoino',
    author_category: 'founder',
    content:
      'Tether USDT market cap surpassed $140B. Strong demand across emerging markets for dollar-denominated savings. We continue to invest in compliance, transparency, and reserves diversification.',
    likes: 6310,
    retweets: 1875,
    replies: 412,
    days_ago: 2,
  },
  {
    author_handle: 'paaborsch',
    author_name: 'Paolo Ardoino',
    author_category: 'founder',
    content:
      'The Genius Act is a step in the right direction. Clear regulatory frameworks for stablecoins will unlock massive innovation in payments. We welcome sensible regulation.',
    likes: 3250,
    retweets: 892,
    replies: 198,
    days_ago: 5,
  },
  {
    author_handle: 'RuneKek',
    author_name: 'Rune Christensen',
    author_category: 'founder',
    content:
      'Sky (formerly MakerDAO) has approved the allocation of $1B in RWA-backed assets to the Spark lending protocol. DAI continues to be the most decentralized stablecoin with real yield backing.',
    likes: 2840,
    retweets: 721,
    replies: 156,
    days_ago: 4,
  },
  {
    author_handle: 'zabornjak',
    author_name: 'Zach Abrams',
    author_category: 'founder',
    content:
      'Bridge.xyz processed $5B in stablecoin payment volume last quarter. Enterprise demand for stablecoin rails is accelerating faster than anyone expected. The PayFi era is here.',
    likes: 1920,
    retweets: 543,
    replies: 87,
    days_ago: 2,
  },
  {
    author_handle: 'labordc',
    author_name: 'Laborde',
    author_category: 'founder',
    content:
      'USDe supply crossed $6B. The synthetic dollar model is proving its resilience — fully delta-neutral, transparent reserves, and now integrated with major CEXs for instant settlement.',
    likes: 3100,
    retweets: 845,
    replies: 201,
    days_ago: 3,
  },

  // ── VCs ──
  {
    author_handle: 'cdixon',
    author_name: 'Chris Dixon',
    author_category: 'vc',
    content:
      'Stablecoins are the killer app of crypto. They\'re already doing more transaction volume than Visa. The next wave is programmable payments — subscriptions, payroll, and cross-border commerce all on-chain.',
    likes: 8920,
    retweets: 2341,
    replies: 567,
    days_ago: 1,
  },
  {
    author_handle: 'nic__carter',
    author_name: 'Nic Carter',
    author_category: 'vc',
    content:
      'USDC and USDT combined now hold more US Treasuries than most G20 nations. Stablecoins have quietly become one of the largest buyers of US government debt. This changes the geopolitical calculus around regulation.',
    likes: 5670,
    retweets: 1892,
    replies: 423,
    days_ago: 2,
  },
  {
    author_handle: 'matthuang',
    author_name: 'Matt Huang',
    author_category: 'vc',
    content:
      'The stablecoin market is approaching $200B. What excites me most is the infrastructure layer being built — CCTP, payment APIs, on/off ramps. This is the plumbing for a new financial system.',
    likes: 4210,
    retweets: 1120,
    replies: 234,
    days_ago: 4,
  },
  {
    author_handle: 'RyanSAdams',
    author_name: 'Ryan Sean Adams',
    author_category: 'vc',
    content:
      'PayPal PYUSD just hit $1B market cap. When TradFi giants move into stablecoins, it validates everything crypto has been building. DeFi yield on PYUSD is now available across Aave, Curve, and Pendle.',
    likes: 3450,
    retweets: 987,
    replies: 312,
    days_ago: 3,
  },

  // ── KOLs ──
  {
    author_handle: 'DefiIgnas',
    author_name: 'Ignas',
    author_category: 'kol',
    content:
      'Stablecoin yield landscape update 🧵\n\nTop yields this week:\n- sUSDe (Ethena): 14.2% APY\n- sDAI (Sky): 8.5% APY\n- USDC on Aave V3: 6.8% APY\n- PYUSD on Pendle: 11.3% APY\n\nThe risk-free rate of DeFi keeps climbing.',
    likes: 2890,
    retweets: 876,
    replies: 198,
    days_ago: 1,
  },
  {
    author_handle: 'tokenterminal',
    author_name: 'Token Terminal',
    author_category: 'kol',
    content:
      'Stablecoin transfer volume (7d avg):\n\nUSDT: $42.3B/day\nUSDC: $12.8B/day\nDAI: $1.2B/day\nUSDe: $890M/day\n\nTotal stablecoin daily volume now exceeds Visa\'s average daily transaction volume.',
    likes: 5430,
    retweets: 1654,
    replies: 321,
    days_ago: 2,
  },
  {
    author_handle: 'MessariCrypto',
    author_name: 'Messari',
    author_category: 'kol',
    content:
      'NEW REPORT: "State of Stablecoins Q1 2026"\n\nKey findings:\n- Total market cap: $198B (+34% YoY)\n- USDT dominance: 65.2%\n- USDC growing fastest among regulated stablecoins\n- RWA-backed stablecoins emerged as new category\n\nFull report →',
    likes: 3210,
    retweets: 1243,
    replies: 156,
    days_ago: 3,
  },
  {
    author_handle: 'theaboringguy',
    author_name: 'Boring Guy',
    author_category: 'kol',
    content:
      'MiCA is now fully in effect across the EU. Circle is the first (and so far only) major issuer with full compliance. Tether still operating under transitional provisions. This regulatory gap will define the next 12 months of stablecoin competition in Europe.',
    likes: 1870,
    retweets: 534,
    replies: 145,
    days_ago: 4,
  },
  {
    author_handle: 'MikeBurgersburg',
    author_name: 'Dirty Bubble Media',
    author_category: 'kol',
    content:
      'Stripe acquiring Bridge.xyz for $1.1B was the signal. Now every major payment processor is exploring stablecoin integration. Visa, Mastercard, and PayPal all have active stablecoin settlement programs. The race is on.',
    likes: 4560,
    retweets: 1321,
    replies: 278,
    days_ago: 5,
  },

  // ── Community ──
  {
    author_handle: 'staborcoins',
    author_name: 'Stablecoins.wtf',
    author_category: 'user',
    content:
      'Weekly stablecoin dashboard update:\n\n📊 Total supply: $197.8B\n📈 7d change: +$2.1B\n🏆 Top gainer: USDe (+$340M)\n📉 Top loser: BUSD (-$89M)\n🔗 Ethereum still dominates at 52% of total supply\n\nFull dashboard at stablecoins.wtf',
    likes: 1240,
    retweets: 432,
    replies: 67,
    days_ago: 1,
  },
  {
    author_handle: 'ryanberckmans',
    author_name: 'Ryan Berckmans',
    author_category: 'user',
    content:
      'Unpopular opinion: the real stablecoin competition isn\'t USDT vs USDC. It\'s stablecoins vs legacy banking rails. Every dollar that moves on-chain instead of through SWIFT is a permanent market share shift. And it\'s accelerating.',
    likes: 2340,
    retweets: 678,
    replies: 189,
    days_ago: 6,
  },
]

export async function POST() {
  try {
    // Check if tweets already exist
    const { count } = await supabaseAdmin
      .from('raw_tweets')
      .select('*', { count: 'exact', head: true })

    if (count && count > 0) {
      return NextResponse.json({
        message: `raw_tweets 已有 ${count} 条数据，跳过 mock 插入。如需重新插入请先清空表。`,
        seeded: 0,
      })
    }

    const now = Date.now()
    const rows = MOCK_TWEETS.map((t, i) => ({
      author_handle: t.author_handle,
      author_name: t.author_name,
      author_category: t.author_category,
      source_url: `https://twitter.com/${t.author_handle}/status/190000000000000${String(i).padStart(4, '0')}`,
      content: t.content,
      likes: t.likes,
      retweets: t.retweets,
      replies: t.replies,
      posted_at: new Date(now - t.days_ago * 24 * 60 * 60 * 1000).toISOString(),
      processed: false,
    }))

    const { error } = await supabaseAdmin.from('raw_tweets').insert(rows)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `成功插入 ${rows.length} 条 mock 推文`,
      seeded: rows.length,
      breakdown: {
        founder: rows.filter(r => r.author_category === 'founder').length,
        vc: rows.filter(r => r.author_category === 'vc').length,
        kol: rows.filter(r => r.author_category === 'kol').length,
        user: rows.filter(r => r.author_category === 'user').length,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
