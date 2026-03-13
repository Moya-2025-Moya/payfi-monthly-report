// Admin API 鉴权 — 所有 /api/admin/* 和 /api/cron/* 路由共用
import { NextResponse } from 'next/server'

// Support both server-only ADMIN_TOKEN and public NEXT_PUBLIC_ADMIN_TOKEN
// The frontend sends NEXT_PUBLIC_ADMIN_TOKEN via x-admin-token header,
// so the backend must accept the same value
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN

export function verifyAdminToken(request: Request): NextResponse | null {
  // 开发环境且未配置 token 时跳过鉴权
  if (!ADMIN_TOKEN && process.env.NODE_ENV === 'development') {
    return null
  }

  const token = request.headers.get('x-admin-token')

  if (!ADMIN_TOKEN) {
    return NextResponse.json(
      { status: 'error', message: 'ADMIN_TOKEN not configured' },
      { status: 500 }
    )
  }

  if (token !== ADMIN_TOKEN) {
    return NextResponse.json(
      { status: 'error', message: 'Unauthorized' },
      { status: 401 }
    )
  }

  return null // null = 通过
}
