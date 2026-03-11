import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 前端用: 带 RLS 的客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 后端用: 绕过 RLS 的服务端客户端 (只在 server-side 使用)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase

// 辅助: 获取当前 ISO 周号 (e.g. '2026-W10')
export function getCurrentWeekNumber(): string {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1
  const weekNum = Math.ceil((dayOfYear + startOfYear.getDay()) / 7)
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}
