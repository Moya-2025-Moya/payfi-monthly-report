'use client'

import { useSearchParams, useRouter } from 'next/navigation'
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

const PREVIEW_COUNT = 3

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
  const router = useRouter()
  const q = searchParams.get('q') ?? ''

  const [inputValue, setInputValue] = useState(q)
  const [facts, setFacts] = useState<FactResult[]>([])
  const [entities, setEntities] = useState<EntityResult[]>([])
  const [narrativeThreads, setNarrativeThreads] = useState<NarrativeThreadResult[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Sync input with URL param
  useEffect(() => {
    setInputValue(q)
  }, [q])

  useEffect(() => {
    if (!q.trim()) {
      setFacts([])
      setEntities([])
      setNarrativeThreads([])
      return
    }

    setLoading(true)
    setExpandedSections({})
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
    }).finally(() => setLoading(false))

    return () => controller.abort()
  }, [q])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
    }
  }

  function toggleSection(key: string) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const hasResults = facts.length > 0 || entities.length > 0 || narrativeThreads.length > 0
  const noResults = !loading && q && !hasResults

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <PageHeader title="搜索" />

      {/* Search input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div
          className="flex items-center rounded-lg border px-3 py-2 gap-2"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="搜索事实、实体、叙事线索..."
            className="flex-1 bg-transparent outline-none text-[14px]"
            style={{ color: 'var(--fg-body)' }}
            autoFocus
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => { setInputValue(''); router.push('/search') }}
              className="text-[12px] px-1"
              style={{ color: 'var(--fg-muted)' }}
            >
              清除
            </button>
          )}
        </div>
      </form>

      {loading && (
        <div className="flex items-center gap-2 py-12 justify-center">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
          <span className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>搜索中...</span>
        </div>
      )}

      {noResults && (
        <div className="flex items-center justify-center py-16">
          <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>
            未找到与 &ldquo;{q}&rdquo; 相关的结果
          </p>
        </div>
      )}

      {!loading && q && hasResults && (
        <div className="space-y-8">
          {/* Facts section */}
          {facts.length > 0 && (
            <ResultSection
              title="事实"
              count={facts.length}
              expanded={!!expandedSections['facts']}
              onToggle={() => toggleSection('facts')}
            >
              {(expandedSections['facts'] ? facts : facts.slice(0, PREVIEW_COUNT)).map(f => {
                const content = f.content_zh || f.content_en || ''
                const domain = getDomain(f.source_url)
                const date = String(f.fact_date).split('T')[0]
                return (
                  <div
                    key={f.id}
                    className="rounded-lg border px-4 py-3"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
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
            </ResultSection>
          )}

          {/* Entities section */}
          {entities.length > 0 && (
            <ResultSection
              title="实体"
              count={entities.length}
              expanded={!!expandedSections['entities']}
              onToggle={() => toggleSection('entities')}
            >
              {(expandedSections['entities'] ? entities : entities.slice(0, PREVIEW_COUNT)).map(e => (
                <Link
                  key={e.id}
                  href={`/entities/${e.id}`}
                  className="block rounded-lg border px-4 py-3 transition-colors hover:shadow-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
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
            </ResultSection>
          )}

          {/* Narrative threads section */}
          {narrativeThreads.length > 0 && (
            <ResultSection
              title="叙事线索"
              count={narrativeThreads.length}
              expanded={!!expandedSections['narratives']}
              onToggle={() => toggleSection('narratives')}
            >
              {(expandedSections['narratives'] ? narrativeThreads : narrativeThreads.slice(0, PREVIEW_COUNT)).map(t => {
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
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded"
                        style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}25` }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                      <span>最后更新: {t.last_updated_week}</span>
                    </div>
                    {t.key_entities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {t.key_entities.slice(0, 5).map(e => (
                          <span
                            key={e}
                            className="text-[11px] px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                )
              })}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  )
}

function ResultSection({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string
  count: number
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const showToggle = count > PREVIEW_COUNT

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--fg-title)' }}>
          {title}
          <span className="ml-2 text-[12px] font-normal" style={{ color: 'var(--fg-muted)' }}>
            {count}
          </span>
        </h2>
      </div>
      <div className="space-y-2">
        {children}
      </div>
      {showToggle && (
        <button
          onClick={onToggle}
          className="mt-3 text-[13px] font-medium transition-colors hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          {expanded ? '收起' : `查看全部 ${count} 条结果 \u2192`}
        </button>
      )}
    </section>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
          <PageHeader title="搜索" />
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
