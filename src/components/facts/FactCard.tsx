'use client'
import { useState } from 'react'
import { SourceCountBadge, FactTypeBadge } from '@/components/ui/Badge'
import { CommentBox } from '@/components/collab/CommentBox'
import type { AtomicFact, Comment } from '@/lib/types'

const DEFAULT_USER_ID = 'default-user'

const FACT_TYPE_ZH: Record<string, string> = {
  event: '事件', metric: '指标', quote: '引述', relationship: '关系', status_change: '状态变更',
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getSourceUrls(fact: AtomicFact): string[] {
  const urls = new Set<string>()
  // Primary source
  if (fact.source_url) urls.add(fact.source_url)
  // Cross-validation sources from V2
  const v2 = fact.v2_result as { source_urls?: string[] } | null
  if (v2?.source_urls) {
    for (const u of v2.source_urls) urls.add(u)
  }
  return [...urls]
}

export function FactCard({ fact, compact = false }: { fact: AtomicFact; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const date = new Date(fact.fact_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' })
  const displayContent = fact.content_zh || fact.content_en
  const sourceUrls = getSourceUrls(fact)

  return (
    <div
      className="rounded-lg border p-4 transition-colors"
      style={{ borderColor: expanded ? 'var(--border-hover)' : 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SourceCountBadge
            count={sourceUrls.length}
            onClick={() => setShowSources(s => !s)}
          />
          <FactTypeBadge type={FACT_TYPE_ZH[fact.fact_type] ?? fact.fact_type} />
        </div>
        <time className="text-[11px] font-mono whitespace-nowrap" style={{ color: 'var(--fg-faint)' }}>{date}</time>
      </div>

      {/* 信息源列表 */}
      {showSources && sourceUrls.length > 0 && (
        <div className="mb-3 p-2.5 rounded-md space-y-1.5" style={{ background: 'var(--surface-alt)' }}>
          <p className="text-[10px] font-mono mb-1.5" style={{ color: 'var(--fg-faint)' }}>信息源</p>
          {sourceUrls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] font-mono truncate flex-1" style={{ color: 'var(--fg-muted)' }}>
                {extractDomain(url)}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
                title={url}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 1H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7" />
                  <path d="M7 1h4v4M11 1L5.5 6.5" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      )}

      <p className="text-[13px] leading-relaxed cursor-pointer" style={{ color: 'var(--fg-body)' }}
        onClick={() => setExpanded(e => !e)}>
        {displayContent}
      </p>

      {fact.content_zh && fact.content_en && !compact && expanded && (
        <p className="text-[12px] mt-1 italic" style={{ color: 'var(--fg-dim)' }}>{fact.content_en}</p>
      )}

      {fact.fact_type === 'metric' && fact.metric_value != null && !compact && (
        <div className="mt-3 flex items-center gap-4 text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>
          <span>{fact.metric_name}: {fact.metric_value.toLocaleString()} {fact.metric_unit}</span>
          {fact.metric_change && <span style={{ color: 'var(--accent)' }}>{fact.metric_change}</span>}
          {fact.metric_period && <span>{fact.metric_period}</span>}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {fact.tags.slice(0, 5).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{ color: 'var(--fg-faint)', border: '1px solid var(--border)' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-2 text-[12px] font-mono" style={{ borderColor: 'var(--border)' }}
          onClick={e => e.stopPropagation()}>
          {fact.source_type && (
            <div className="flex gap-2">
              <span style={{ color: 'var(--fg-faint)' }}>来源类型:</span>
              <span style={{ color: 'var(--fg-muted)' }}>{fact.source_type}</span>
            </div>
          )}
          {fact.week_number && (
            <div className="flex gap-2">
              <span style={{ color: 'var(--fg-faint)' }}>周次:</span>
              <span style={{ color: 'var(--fg-muted)' }}>{fact.week_number}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span style={{ color: 'var(--fg-faint)' }}>ID:</span>
            <span style={{ color: 'var(--fg-dim)' }}>{fact.id}</span>
          </div>

          {/* Comments section */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[10px] font-mono mb-2" style={{ color: 'var(--fg-faint)' }}>
              评论 ({comments.length})
              {!commentsLoaded && (
                <button
                  className="ml-2 underline"
                  style={{ color: 'var(--accent)' }}
                  onClick={async () => {
                    const res = await fetch(`/api/comments?fact_id=${fact.id}`)
                    if (res.ok) setComments(await res.json())
                    setCommentsLoaded(true)
                  }}
                >
                  加载
                </button>
              )}
            </p>
            {commentsLoaded && comments.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {comments.map(c => (
                  <div key={c.id} className="text-[11px] p-2 rounded" style={{ background: 'var(--surface-alt)', color: 'var(--fg-body)' }}>
                    {c.content}
                    <time className="block mt-0.5" style={{ color: 'var(--fg-faint)' }}>
                      {new Date(c.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                ))}
              </div>
            )}
            <CommentBox
              factId={fact.id}
              onSubmit={async (content) => {
                const res = await fetch('/api/comments', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ user_id: DEFAULT_USER_ID, fact_id: fact.id, content }),
                })
                if (res.ok) {
                  const comment = await res.json()
                  setComments(prev => [...prev, comment])
                  setCommentsLoaded(true)
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
