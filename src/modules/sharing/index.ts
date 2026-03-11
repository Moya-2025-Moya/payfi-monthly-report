// D5 分享链接模块
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/db/client'
import type { SharedView, AtomicFact } from '@/lib/types'

const DEFAULT_EXPIRY_DAYS = 30

// ─── 创建分享链接 ───

interface CreateShareOptions {
  createdBy: string
  title?: string
  factIds?: string[]
  queryParams?: Record<string, unknown>
  expiryDays?: number
}

export async function createShareLink(options: CreateShareOptions): Promise<{ token: string; shareUrl: string; view: SharedView }> {
  const token = randomBytes(16).toString('hex')
  const expiryDays = options.expiryDays ?? DEFAULT_EXPIRY_DAYS
  const expiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString()

  const queryParams = options.queryParams ?? {}
  if (options.factIds) {
    queryParams.fact_ids = options.factIds
  }

  const { data, error } = await supabaseAdmin
    .from('shared_views')
    .insert({
      token,
      created_by: options.createdBy,
      query_params: queryParams,
      title: options.title ?? null,
      expires_at: expiresAt,
      view_count: 0,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create share link: ${error.message}`)

  const baseUrl = process.env.SHARE_BASE_URL ?? 'http://localhost:3000'
  return {
    token,
    shareUrl: `${baseUrl}/share/${token}`,
    view: data as SharedView,
  }
}

// ─── 获取分享视图 ───

export async function getSharedView(token: string): Promise<{ view: SharedView; facts: AtomicFact[] } | null> {
  const { data, error } = await supabaseAdmin
    .from('shared_views')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) return null

  const view = data as SharedView

  // 检查过期
  if (new Date(view.expires_at) < new Date()) return null

  // 增加访问量
  await supabaseAdmin
    .from('shared_views')
    .update({ view_count: view.view_count + 1 })
    .eq('id', view.id)

  // 获取事实
  const factIds = (view.query_params.fact_ids as string[]) ?? []
  let facts: AtomicFact[] = []
  if (factIds.length > 0) {
    const { data: factsData } = await supabaseAdmin
      .from('atomic_facts')
      .select('*')
      .in('id', factIds)
    facts = (factsData ?? []) as AtomicFact[]
  }

  return { view, facts }
}

// ─── 删除分享链接 ───

export async function deleteShareLink(token: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('shared_views')
    .delete()
    .eq('token', token)

  return !error
}

// ─── 列出用户的分享链接 ───

export async function listUserShares(userId: string): Promise<SharedView[]> {
  const { data } = await supabaseAdmin
    .from('shared_views')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  return (data ?? []) as SharedView[]
}
