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

// 辅助: 获取当前 ISO 8601 周号 (e.g. '2026-W10')
// Uses proper ISO week calculation: week 1 contains the first Thursday of the year
export function getCurrentWeekNumber(): string {
  const now = new Date()
  // Create a UTC date to avoid timezone issues
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  // ISO week: Monday=1 ... Sunday=7
  const dayNum = d.getUTCDay() || 7
  // Set to nearest Thursday (current date + 4 - day number)
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
