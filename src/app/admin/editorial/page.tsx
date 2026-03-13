'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

interface NewsItem {
  date: string
  simple_zh: string
  simple_en: string
  background_zh: string
  what_happened_zh: string
  insight_zh: string
  source_url: string | null
  tags: string[]
}

interface SnapshotData {
  total_facts: number
  high_confidence: number
  medium_confidence: number
  low_confidence: number
  rejected: number
  new_entities: number
  active_entities: number
  weekly_summary_detailed: string | null
}

interface Snapshot {
  week_number: string
  snapshot_data: SnapshotData
  generated_at: string
}

interface Report {
  id: string
  date: string
  subject: string
  content: string
  created_at: string
}

interface StreamEvent {
  type: string
  runId?: string
  step?: string
  message?: string
  level?: string
}

export default function EditorialPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [streamLogs, setStreamLogs] = useState<string[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [snapshotRes, reportRes] = await Promise.all([
        fetch('/api/snapshot'),
        fetch('/api/reports'),
      ])
      if (snapshotRes.ok) {
        const data = await snapshotRes.json()
        if (data && !data.error) setSnapshot(data)
      }
      if (reportRes.ok) {
        const reports = await reportRes.json()
        if (Array.isArray(reports) && reports.length > 0) {
          setReport(reports[0])
        }
      }
    } catch {
      // ignore network errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamLogs])

  async function handleRegenerate() {
    setRegenerating(true)
    setStreamLogs([])

    try {
      const res = await fetch('/api/cron/snapshot/stream')
      if (!res.ok || !res.body) {
        setStreamLogs(prev => [...prev, '[ERROR] 请求失败'])
        setRegenerating(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event: StreamEvent = JSON.parse(line.slice(6))
            if (event.type === 'log' && event.message) {
              setStreamLogs(prev => [...prev, event.message!])
            } else if (event.type === 'progress' && event.step && event.message) {
              setStreamLogs(prev => [...prev, `[${event.step}] ${event.message}`])
            } else if (event.type === 'done') {
              setStreamLogs(prev => [...prev, '--- 生成完成 ---'])
            } else if (event.type === 'error' && event.message) {
              setStreamLogs(prev => [...prev, `[ERROR] ${event.message}`])
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      // Refresh data after regeneration
      await fetchData()
    } catch {
      setStreamLogs(prev => [...prev, '[ERROR] 网络错误'])
    } finally {
      setRegenerating(false)
    }
  }

  // Parse news items from weekly_summary_detailed
  let newsItems: NewsItem[] = []
  if (snapshot?.snapshot_data?.weekly_summary_detailed) {
    try {
      newsItems = JSON.parse(snapshot.snapshot_data.weekly_summary_detailed)
    } catch {
      // ignore
    }
  }

  const sd = snapshot?.snapshot_data

  return (
    <div>
      <PageHeader title="周报监控" />

      {/* Action bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="px-4 py-2 rounded-md text-[13px] font-medium transition-colors"
          style={{
            background: regenerating ? 'var(--surface-alt)' : 'var(--accent)',
            color: regenerating ? 'var(--fg-muted)' : 'var(--accent-fg)',
            opacity: regenerating ? 0.7 : 1,
          }}
        >
          {regenerating ? '生成中...' : '重新生成'}
        </button>
        <Link
          href="/admin/email-preview"
          className="px-4 py-2 rounded-md text-[13px] font-medium border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
        >
          邮件预览
        </Link>
        {snapshot && (
          <span className="text-[12px] ml-auto" style={{ color: 'var(--fg-muted)' }}>
            周期: {snapshot.week_number} | 生成于: {new Date(snapshot.generated_at).toLocaleString('zh-CN')}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>加载中...</p>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {/* Snapshot summary stats */}
          {sd ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="总事实数" value={sd.total_facts} />
              <StatCard label="高可信" value={sd.high_confidence} accent="var(--success)" />
              <StatCard label="中可信" value={sd.medium_confidence} accent="var(--warning)" />
              <StatCard label="低可信 / 拒绝" value={`${sd.low_confidence} / ${sd.rejected}`} accent="var(--danger)" />
            </div>
          ) : (
            <Card>
              <p className="text-[12px] text-center py-4" style={{ color: 'var(--fg-muted)' }}>
                本周暂无快照数据，点击「重新生成」开始
              </p>
            </Card>
          )}

          {/* Latest report info */}
          {report && (
            <Card>
              <p className="text-[11px] font-medium tracking-wider uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>
                最新报告
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium" style={{ color: 'var(--fg-title)' }}>
                    {report.subject}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--fg-muted)' }}>
                    日期: {report.date} | 创建于: {new Date(report.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* News items from weekly_summary_detailed */}
          {newsItems.length > 0 && (
            <Card>
              <p className="text-[11px] font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--fg-muted)' }}>
                本周新闻摘要 ({newsItems.length} 条)
              </p>
              <div className="space-y-3">
                {newsItems.map((item, i) => (
                  <div
                    key={i}
                    className="py-3 border-b last:border-b-0"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="text-[11px] font-mono w-6 text-center shrink-0 mt-0.5 rounded"
                        style={{ color: 'var(--fg-muted)', background: 'var(--surface-alt)', padding: '2px 0' }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium" style={{ color: 'var(--fg-title)' }}>
                          {item.simple_zh}
                        </p>
                        <p className="text-[12px] mt-1" style={{ color: 'var(--fg-secondary)' }}>
                          {item.what_happened_zh}
                        </p>
                        <p className="text-[11px] mt-1 italic" style={{ color: 'var(--fg-muted)' }}>
                          {item.insight_zh}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{item.date}</span>
                          {item.tags?.map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                            >
                              {tag}
                            </span>
                          ))}
                          {item.source_url && (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] underline"
                              style={{ color: 'var(--accent)' }}
                            >
                              source
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Stream logs (visible during/after regeneration) */}
          {streamLogs.length > 0 && (
            <Card>
              <p className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
                生成日志
              </p>
              <div
                className="font-mono text-[11px] leading-relaxed rounded-md p-3 overflow-auto"
                style={{ background: 'var(--surface-alt)', color: 'var(--fg-secondary)', maxHeight: '300px' }}
              >
                {streamLogs.map((log, i) => (
                  <div key={i} style={{ color: log.includes('[ERROR]') ? 'var(--danger)' : log.includes('完成') ? 'var(--success)' : undefined }}>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--fg-muted)' }}>
        {label}
      </p>
      <p className="text-[22px] font-semibold" style={{ color: accent ?? 'var(--fg-title)' }}>
        {value}
      </p>
    </div>
  )
}
