'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'

interface ReportData {
  id: string
  date: string
  subject: string | null
  content: string
  created_at: string
}

export default function EmailPreviewPage() {
  const [reports, setReports] = useState<ReportData[]>([])
  const [selected, setSelected] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then((data: ReportData[]) => {
        setReports(data)
        if (data.length > 0) setSelected(data[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader title="邮件预览" />

      {loading ? (
        <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>加载中...</p>
      ) : reports.length === 0 ? (
        <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
          还没有生成过邮件报告。运行"生成周报快照"后会自动生成。
        </p>
      ) : (
        <div className="flex gap-4">
          {/* Report list */}
          <div className="w-48 shrink-0 space-y-1">
            {reports.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left px-3 py-2 rounded-md text-[12px] transition-colors"
                style={{
                  background: selected?.id === r.id ? 'var(--accent-soft)' : 'transparent',
                  color: selected?.id === r.id ? 'var(--accent)' : 'var(--fg-secondary)',
                  border: `1px solid ${selected?.id === r.id ? 'var(--accent-muted)' : 'var(--border)'}`,
                }}
              >
                <p className="font-medium">{r.date}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                  {r.subject ?? 'No subject'}
                </p>
              </button>
            ))}
          </div>

          {/* Preview iframe */}
          {selected && (
            <div className="flex-1 border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}>
                <div>
                  <p className="text-[12px] font-medium" style={{ color: 'var(--fg-title)' }}>
                    {selected.subject ?? `StablePulse Weekly | ${selected.date}`}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                    From: StablePulse Weekly News &lt;starboardanalyst@gmail.com&gt;
                  </p>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                  {new Date(selected.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <iframe
                srcDoc={selected.content}
                className="w-full border-0"
                style={{ height: '80vh', background: '#f0f0f0' }}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
