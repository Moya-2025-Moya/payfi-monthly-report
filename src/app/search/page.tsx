'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'

interface FactResult {
  id: string
  content_zh?: string
  content_en?: string
  fact_date: string
  source_url?: string
  confidence_score?: number
  verification_status?: string
  tags?: string[]
}

interface EntityResult {
  id: string
  name: string
  type?: string
  description?: string
}

interface NarrativeThreadResult {
  id: string
  topic: string
  slug: string
  status: string
  first_seen_week: string
  last_updated_week: string
  total_weeks: number
  key_entities: string[]
}

type TabKey = 'entities' | 'facts' | 'narratives'

function getDomain(url?: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function ConfidenceDot({ score }: { score?: number }) {
  const s = score ?? 0
  const color = s >= 0.8 ? '#22c55e' : s >= 0.5 ? '#f59e0b' : '#ef4444'
  return (
    <span
      className="inline-block w-[6px] h-[6px] rounded-full shrink-0"
      style={{ background: color }}
      title={`confidence: ${(s * 100).toFixed(0)}%`}
    />
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const [facts, setFacts] = useState<FactResult[]>([])
  const [entities, setEntities] = useState<EntityResult[]>([])
  const [narrativeThreads, setNarrativeThreads] = useState<NarrativeThreadResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('entities')

  useEffect(() => {
    if (!q.trim()) {
      setFacts([])
      setEntities([])
      setNarrativeThreads([])
      return
    }

    setLoading(true)
    const controller = new AbortController()

    Promise.all([
      fetch(`/api/facts/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(r => r.json())
        .catch(() => []),
      fetch('/api/entities', { signal: controller.signal })
        .then(r => r.json())
        .catch(() => []),
      fetch(`/api/narrative-threads?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),
    ]).then(([factData, entityData, threadData]) => {
      setFacts(Array.isArray(factData) ? factData : [])
      const lower = q.toLowerCase()
      const filtered = (Array.isArray(entityData) ? entityData : []).filter(
        (e: EntityResult) => e.name?.toLowerCase().includes(lower)
      )
      setEntities(filtered)
      setNarrativeThreads(Array.isArray(threadData) ? threadData : [])
      // Auto-select first non-empty tab
      if (filtered.length > 0) setActiveTab('entities')
      else if (Array.isArray(factData) && factData.length > 0) setActiveTab('facts')
      else setActiveTab('narratives')
    }).finally(() => setLoading(false))

    return () => controller.abort()
  }, [q])

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'entities', label: '实体', count: entities.length },
    { key: 'facts', label: '事实', count: facts.length },
    { key: 'narratives', label: '叙事', count: narrativeThreads.length },
  ]

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <PageHeader title="搜索结果" />

      {q ? (
        <p className="text-[14px] mb-5" style={{ color: 'var(--fg-body)' }}>
          关键词: <span className="font-medium" style={{ color: 'var(--fg-title)' }}>{q}</span>
        </p>
      ) : (
        <p className="text-[14px]" style={{ color: 'var(--fg-muted)' }}>
          请输入搜索关键词 (?q=...)
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-12 justify-center">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
          <span className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>搜索中...</span>
        </div>
      )}

      {!loading && q && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="px-3 py-2 text-[13px] font-medium transition-colors relative"
                style={{
                  color: activeTab === t.key ? 'var(--accent)' : 'var(--fg-muted)',
                  borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {t.label}
                <span className="ml-1.5 text-[11px]" style={{ opacity: 0.6 }}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Entity results */}
          {activeTab === 'entities' && (
            <div>
              {entities.length === 0 ? (
                <EmptyState text="未找到匹配的实体" />
              ) : (
                <div className="space-y-2">
                  {entities.map(e => (
                    <Link
                      key={e.id}
                      href={`/entities/${e.id}`}
                      className="block rounded-lg border px-4 py-3 transition-colors hover:shadow-sm"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--surface)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium" style={{ color: 'var(--fg-title)' }}>
                          {e.name}
                        </span>
                        {e.type && (
                          <span
                            className="text-[11px] px-1.5 py-0.5 rounded"
                            style={{
                              background: 'var(--surface-alt, rgba(0,0,0,0.04))',
                              color: 'var(--fg-muted)',
                            }}
                          >
                            {e.type}
                          </span>
                        )}
                      </div>
                      {e.description && (
                        <p className="text-[12px] mt-1 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
                          {e.description}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fact results */}
          {activeTab === 'facts' && (
            <div>
              {facts.length === 0 ? (
                <EmptyState text="未找到匹配的事实" />
              ) : (
                <div className="space-y-2">
                  {facts.map(f => {
                    const content = f.content_zh || f.content_en || ''
                    const domain = getDomain(f.source_url)
                    const date = String(f.fact_date).split('T')[0]

                    return (
                      <div
                        key={f.id}
                        className="rounded-lg border px-4 py-3"
                        style={{
                          borderColor: 'var(--border)',
                          background: 'var(--surface)',
                        }}
                      >
                        <p className="text-[14px] leading-relaxed mb-2" style={{ color: 'var(--fg-body)' }}>
                          {content}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                            {date}
                          </span>
                          {domain && (
                            <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                              {domain}
                            </span>
                          )}
                          <ConfidenceDot score={f.confidence_score} />
                          {f.tags && f.tags.length > 0 && (
                            <div className="flex gap-1">
                              {f.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="text-[11px] px-1.5 py-0.5 rounded"
                                  style={{
                                    background: 'var(--surface-alt, rgba(0,0,0,0.04))',
                                    color: 'var(--fg-muted)',
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Narrative thread results */}
          {activeTab === 'narratives' && (
            <div>
              {narrativeThreads.length === 0 ? (
                <EmptyState text="未找到匹配的叙事线索" />
              ) : (
                <div className="space-y-2">
                  {narrativeThreads.map(t => {
                    const statusLabel = t.status === 'active' ? '进行中' : t.status === 'dormant' ? '休眠' : '已结束'
                    const statusColor = t.status === 'active' ? 'var(--success)' : t.status === 'dormant' ? 'var(--warning)' : 'var(--fg-muted)'
                    return (
                      <Link
                        key={t.id}
                        href={`/narratives?thread=${t.slug}`}
                        className="block rounded-lg border px-4 py-3 transition-colors hover:shadow-sm"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[14px] font-medium" style={{ color: 'var(--fg-title)' }}>
                            {t.topic}
                          </span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded"
                            style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}25` }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                          <span>第 {t.total_weeks} 周追踪</span>
                          <span>{t.first_seen_week} → {t.last_updated_week}</span>
                        </div>
                        {t.key_entities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {t.key_entities.slice(0, 5).map(e => (
                              <span key={e} className="text-[11px] px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
                                {e}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>{text}</p>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
          <PageHeader title="搜索结果" />
          <div className="flex items-center gap-2 py-12 justify-center">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            <span className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>加载中...</span>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
