// Twitter 关注账号列表
// A6 采集器追踪这些特定账号的新帖子

import type { TwitterAuthorCategory } from '@/lib/types'

export interface TwitterAccount {
  handle: string
  name: string
  category: TwitterAuthorCategory
  description: string
}

export const TWITTER_ACCOUNTS: TwitterAccount[] = [
  // ── VC / 投资人 ──
  { handle: 'cdixon', name: 'Chris Dixon', category: 'vc', description: 'a16z Crypto GP' },
  { handle: 'haaborsch', name: 'Haseeb Qureshi', category: 'vc', description: 'Dragonfly GP' },
  { handle: 'nic__carter', name: 'Nic Carter', category: 'vc', description: 'Castle Island Ventures' },
  { handle: 'RyanSAdams', name: 'Ryan Sean Adams', category: 'vc', description: 'Bankless' },
  { handle: 'matthuang', name: 'Matt Huang', category: 'vc', description: 'Paradigm Co-founder' },

  // ── KOL / 分析师 ──
  { handle: 'DefiIgnas', name: 'Ignas', category: 'kol', description: 'DeFi Researcher' },
  { handle: 'MikeBurgersburg', name: 'Dirty Bubble Media', category: 'kol', description: 'Crypto Investigator' },
  { handle: 'tokenterminal', name: 'Token Terminal', category: 'kol', description: 'On-chain Data' },
  { handle: 'MessariCrypto', name: 'Messari', category: 'kol', description: 'Crypto Research' },
  { handle: 'theaboringguy', name: 'Boring Guy', category: 'kol', description: 'Stablecoin Focused' },

  // ── 创始人 / 项目方 ──
  { handle: 'jerallaire', name: 'Jeremy Allaire', category: 'founder', description: 'Circle CEO' },
  { handle: 'paaborsch', name: 'Paolo Ardoino', category: 'founder', description: 'Tether CTO' },
  { handle: 'labordc', name: 'Laborde', category: 'founder', description: 'Ethena' },
  { handle: 'RuneKek', name: 'Rune Christensen', category: 'founder', description: 'MakerDAO Founder' },
  { handle: 'zabornjak', name: 'Zach Abrams', category: 'founder', description: 'Bridge.xyz CEO' },

  // ── 社区 / 用户 ──
  { handle: 'staborcoins', name: 'Stablecoins.wtf', category: 'user', description: 'Stablecoin Dashboard' },
  { handle: 'ryanberckmans', name: 'Ryan Berckmans', category: 'user', description: 'ETH/Stablecoin Community' },
]

// 辅助: 按类别分组
export function getAccountsByCategory(category: TwitterAuthorCategory): TwitterAccount[] {
  return TWITTER_ACCOUNTS.filter(a => a.category === category)
}
