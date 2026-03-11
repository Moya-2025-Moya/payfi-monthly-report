import Link from 'next/link'
import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { TimelineGenerator } from './TimelineGenerator'
import type { Timeline } from '@/lib/types'

export default async function TimelinesPage() {
  const { data } = await supabaseAdmin.from('timelines').select('*').order('updated_at', { ascending: false })
  const timelines = (data ?? []) as Timeline[]
  return (
    <div>
      <PageHeader title="时间线" description={`共 ${timelines.length} 条事件时间线`} />

      {/* 时间线生成器 */}
      <TimelineGenerator />

      {/* 已有时间线列表 */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>已有时间线</h2>
        {timelines.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-lg mb-1">暂无时间线</p>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>时间线会在流水线处理数据后自动生成，你也可以在上方手动生成。</p>
          </Card>
        ) : (
        <div className="space-y-2">
          {timelines.map(t => (
            <Link key={t.id} href={`/timelines/${t.id}`}
              className="block rounded-lg border p-4 hover:shadow-sm transition-shadow"
              style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded"
                  style={{ background: t.status === 'active' ? 'var(--success-soft)' : 'var(--surface-alt)', color: t.status === 'active' ? 'var(--success)' : 'var(--fg-muted)' }}>
                  {t.status === 'active' ? '活跃' : t.status === 'completed' ? '已完成' : '过期'}
                </span>
              </div>
              {t.description && <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{t.description}</p>}
            </Link>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}
