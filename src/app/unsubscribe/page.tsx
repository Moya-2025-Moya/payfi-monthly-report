import Link from 'next/link'
import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  let status: 'success' | 'error' | 'invalid' = 'invalid'

  if (token) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('unsubscribe_token', token)
      .select()

    if (error) {
      status = 'error'
    } else if (!data || data.length === 0) {
      status = 'error'
    } else {
      status = 'success'
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-md rounded-lg border p-8"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <PageHeader title="退订" />

        {status === 'success' && (
          <div className="text-center">
            <p
              className="text-[14px] font-medium mb-2"
              style={{ color: 'var(--success)' }}
            >
              已退订
            </p>
            <p className="text-[12px] mb-6" style={{ color: 'var(--fg-muted)' }}>
              你已成功退订，将不再收到 StablePulse Weekly 邮件。
            </p>
            <Link
              href="/"
              className="text-[12px] underline"
              style={{ color: 'var(--fg-muted)' }}
            >
              返回首页
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <p
              className="text-[14px] font-medium mb-2"
              style={{ color: 'var(--danger)' }}
            >
              退订失败
            </p>
            <p className="text-[12px] mb-6" style={{ color: 'var(--fg-muted)' }}>
              无效的退订链接，或该邮箱已退订。请检查链接是否正确。
            </p>
            <Link
              href="/"
              className="text-[12px] underline"
              style={{ color: 'var(--fg-muted)' }}
            >
              返回首页
            </Link>
          </div>
        )}

        {status === 'invalid' && (
          <div className="text-center">
            <p
              className="text-[14px] font-medium mb-2"
              style={{ color: 'var(--danger)' }}
            >
              缺少退订凭证
            </p>
            <p className="text-[12px] mb-6" style={{ color: 'var(--fg-muted)' }}>
              请使用邮件中的退订链接。
            </p>
            <Link
              href="/"
              className="text-[12px] underline"
              style={{ color: 'var(--fg-muted)' }}
            >
              返回首页
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
