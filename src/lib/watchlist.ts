// ============================================================
// $U Daily News — DB-backed Watchlist Entity Management
// Replaces hardcoded WATCHLIST config with dynamic DB reads
// ============================================================

import { supabaseAdmin } from '@/db/client'
import type { WatchlistEntity, EntityCategory } from '@/lib/types'

// Cache to avoid hitting DB on every collector run
let entityCache: WatchlistEntity[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function isCacheValid(): boolean {
  return entityCache !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS
}

export function invalidateCache(): void {
  entityCache = null
  cacheTimestamp = 0
}

// ─── Read Operations ───

export async function getActiveEntities(): Promise<WatchlistEntity[]> {
  if (isCacheValid()) return entityCache!

  const { data, error } = await supabaseAdmin
    .from('watchlist_entities')
    .select('*')
    .eq('active', true)
    .order('name')

  if (error) throw new Error(`Failed to fetch watchlist: ${error.message}`)

  entityCache = data as WatchlistEntity[]
  cacheTimestamp = Date.now()
  return entityCache
}

export async function getAllEntities(): Promise<WatchlistEntity[]> {
  const { data, error } = await supabaseAdmin
    .from('watchlist_entities')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to fetch watchlist: ${error.message}`)
  return data as WatchlistEntity[]
}

export async function findEntity(nameOrAlias: string): Promise<WatchlistEntity | null> {
  const entities = await getActiveEntities()
  const lower = nameOrAlias.toLowerCase()
  return entities.find(
    e => e.name.toLowerCase() === lower ||
      e.aliases.some(a => a.toLowerCase() === lower)
  ) ?? null
}

// ─── Write Operations ───

export async function addEntity(
  name: string,
  aliases: string[],
  category: EntityCategory,
  metadata: Record<string, unknown> = {}
): Promise<WatchlistEntity> {
  const { data, error } = await supabaseAdmin
    .from('watchlist_entities')
    .insert({ name, aliases, category, metadata })
    .select()
    .single()

  if (error) throw new Error(`Failed to add entity: ${error.message}`)
  invalidateCache()
  return data as WatchlistEntity
}

export async function updateEntity(
  id: string,
  updates: Partial<Pick<WatchlistEntity, 'name' | 'aliases' | 'category' | 'active' | 'metadata'>>
): Promise<WatchlistEntity> {
  const { data, error } = await supabaseAdmin
    .from('watchlist_entities')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update entity: ${error.message}`)
  invalidateCache()
  return data as WatchlistEntity
}

export async function deactivateEntity(nameOrId: string): Promise<boolean> {
  // Try by ID first, then by name
  const { data, error } = await supabaseAdmin
    .from('watchlist_entities')
    .update({ active: false })
    .or(`id.eq.${nameOrId},name.ilike.${nameOrId}`)
    .select()

  if (error) throw new Error(`Failed to deactivate entity: ${error.message}`)
  invalidateCache()
  return (data?.length ?? 0) > 0
}

export async function deleteEntity(id: string): Promise<boolean> {
  const { error, count } = await supabaseAdmin
    .from('watchlist_entities')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete entity: ${error.message}`)
  invalidateCache()
  return (count ?? 0) > 0
}

// ─── Keyword Generation (for collectors) ───

export async function generateKeywords(): Promise<{
  strong: string[]
  weak: string[]
  context: string[]
}> {
  const entities = await getActiveEntities()

  // Strong keywords: entity names + aliases (direct match = relevant)
  const strong = new Set<string>()
  // Always include base terms
  const baseStrong = [
    'stablecoin', 'stable coin', 'USDC', 'USDT', 'PYUSD', 'DAI', 'USDe',
    'FDUSD', 'RLUSD', 'USDP', 'FRAX', 'AUSD',
    'payfi', 'pay-fi',
    'cross-border payment', 'cross border payment',
    'CBDC', 'central bank digital currency',
    'tokenization', 'tokenisation',
    'MiCA', 'GENIUS Act',
    'RWA', 'real world asset',
    'USYC', 'BUIDL', 'IBENJI',
  ]
  baseStrong.forEach(k => strong.add(k.toLowerCase()))

  for (const entity of entities) {
    strong.add(entity.name.toLowerCase())
    entity.aliases.forEach(a => strong.add(a.toLowerCase()))
  }

  // Weak keywords: need context word co-occurrence
  const weak = [
    'visa', 'mastercard', 'jpmorgan', 'blackrock',
    'sec', 'defi', 'crypto', 'blockchain',
    'digital asset', 'digital currency',
    'payment', 'settlement', 'remittance',
    'money transmission', 'money transfer',
  ]

  // Context words: required alongside weak keywords
  const context = [
    'stablecoin', 'payment', 'settlement', 'transfer',
    'custody', 'mint', 'redeem', 'reserve',
    'compliance', 'license', 'licence', 'regulation',
    'cross-border', 'b2b', 'tokeniz',
  ]

  return {
    strong: [...strong],
    weak,
    context,
  }
}
