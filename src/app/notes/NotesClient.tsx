'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import type { Note, AtomicFact } from '@/lib/types'

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function formatExport(fact: AtomicFact | undefined, note: Note): string {
  const lines: string[] = []
  if (fact) {
    const content = fact.content_zh || fact.content_en
    const date = new Date(fact.fact_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' })
    const source = fact.source_url ? extractDomain(fact.source_url) : '未知来源'
    lines.push(`【事实】${content}`)
    lines.push(`来源: ${source} | ${date}`)
    if (fact.source_url) lines.push(`链接: ${fact.source_url}`)
    lines.push('')
  }
  const nDate = new Date(note.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  lines.push(`【笔记】${note.content}`)
  lines.push(`— ${nDate}`)
  return lines.join('\n')
}

interface Props {
  initialNotes: Note[]
  factsMap: Record<string, AtomicFact>
}

export function NotesClient({ initialNotes, factsMap }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  function handleExport(note: Note) {
    const fact = note.fact_id ? factsMap[note.fact_id] : undefined
    const text = formatExport(fact, note)
    navigator.clipboard.writeText(text)
    setCopied(note.id)
    setTimeout(() => setCopied(null), 1500)
  }

  if (initialNotes.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-lg mb-1" style={{ color: 'var(--fg-title)' }}>暂无笔记</p>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          在信息流中点击任意事实，展开后可以写笔记。
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {initialNotes.map(note => {
        const fact = note.fact_id ? factsMap[note.fact_id] : undefined
        const factContent = fact ? (fact.content_zh || fact.content_en) : null
        const factDate = fact ? new Date(fact.fact_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : null
        const factSource = fact?.source_url ? extractDomain(fact.source_url) : null

        return (
          <div
            key={note.id}
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            {/* 原始事实 */}
            {fact && (
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
                  {factContent}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono" style={{ color: 'var(--fg-faint)' }}>
                  {factSource && <span>{factSource}</span>}
                  {factDate && <span>{factDate}</span>}
                  {fact.source_url && (
                    <a href={fact.source_url} target="_blank" rel="noopener noreferrer"
                      className="underline" style={{ color: 'var(--fg-dim)' }}
                      onClick={e => e.stopPropagation()}>
                      原文
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* 笔记内容 */}
            <div className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-title)' }}>
                  {note.content}
                </p>
                <time className="block mt-1 text-[10px] font-mono" style={{ color: 'var(--fg-faint)' }}>
                  {new Date(note.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
              <button
                onClick={() => handleExport(note)}
                className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-mono transition-colors"
                style={{ border: '1px solid var(--border)', color: copied === note.id ? 'var(--accent)' : 'var(--fg-muted)' }}
              >
                {copied === note.id ? '已复制' : '导出'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
