'use client'

import { useState, useCallback } from 'react'

// Support both old (simple/background/...) and new (simple_zh/simple_en/...) formats
interface DetailedItem {
  date: string
  // New bilingual fields
  simple_zh?: string
  simple_en?: string
  background_zh?: string
  background_en?: string
  what_happened_zh?: string
  what_happened_en?: string
  insight_zh?: string
  insight_en?: string
  // Legacy single-language fields
  simple?: string
  background?: string
  what_happened?: string
  insight?: string
  source_url: string | null
  tags: string[]
}

type Lang = 'zh' | 'en'

function getField(item: DetailedItem, field: 'simple' | 'background' | 'what_happened' | 'insight', lang: Lang): string {
  const bilingualKey = `${field}_${lang}` as keyof DetailedItem
  return (item[bilingualKey] as string) || (item[field] as string) || ''
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function buildExportText(items: DetailedItem[], lang: Lang, weekInfo: string): string {
  const title = lang === 'zh' ? `稳定币周报 — ${weekInfo}` : `Stablecoin Weekly — ${weekInfo}`
  const lines = items.map((item, i) => {
    const simple = getField(item, 'simple', lang)
    const bg = getField(item, 'background', lang)
    const wh = getField(item, 'what_happened', lang)
    const ins = getField(item, 'insight', lang)
    const parts = [`${i + 1}. ${simple}`]
    if (bg) parts.push(`   - ${bg}`)
    if (wh) parts.push(`   - ${wh}`)
    if (ins) parts.push(`   - ${ins}`)
    if (item.source_url) parts.push(`   ${item.source_url}`)
    return parts.join('\n')
  })
  return `${title}\n${'='.repeat(40)}\n\n${lines.join('\n\n')}\n`
}

export function WeeklySummary({ simple, detailed, weekNumber }: { simple: string; detailed: string | null; weekNumber?: string }) {
  const [showDetailed, setShowDetailed] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [lang, setLang] = useState<Lang>('zh')
  const [copied, setCopied] = useState(false)

  // Strip any markdown formatting from legacy data
  const cleanText = simple
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')

  // Parse simple version
  const simpleLines = cleanText
    .replace(/^Weekly Stablecoin News Update:\n?/, '')
    .split(/\n\n/)
    .filter(l => l.trim())

  // Parse detailed version
  let detailedItems: DetailedItem[] = []
  if (detailed) {
    try {
      detailedItems = JSON.parse(detailed)
    } catch { /* ignore */ }
  }

  const hasDetailed = detailedItems.length > 0
  const hasBilingual = hasDetailed && !!(detailedItems[0].simple_zh || detailedItems[0].simple_en)
  const isLegacyParagraph = simpleLines.length === 1 && !/^\d+\./.test(simple)

  const handleExport = useCallback(() => {
    const text = hasDetailed
      ? buildExportText(detailedItems, lang, weekNumber ?? '')
      : cleanText
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [hasDetailed, detailedItems, lang, weekNumber, cleanText])

  function toggleItem(idx: number) {
    setExpandedIdx(prev => prev === idx ? null : idx)
  }

  return (
    <div className="mb-6 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: 'var(--info)' }}>
          {lang === 'zh' ? '本周概要' : 'Weekly Summary'}
        </p>
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          {hasBilingual && (
            <div className="flex gap-0.5 p-0.5 rounded" style={{ background: 'var(--surface-alt)' }}>
              {(['zh', 'en'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="px-2 py-0.5 rounded text-[11px] font-mono transition-colors"
                  style={{
                    background: lang === l ? 'var(--surface)' : 'transparent',
                    color: lang === l ? 'var(--fg-title)' : 'var(--fg-muted)',
                  }}>
                  {l === 'zh' ? '中' : 'EN'}
                </button>
              ))}
            </div>
          )}
          {/* Export button */}
          <button onClick={handleExport}
            className="text-[11px] px-2 py-0.5 rounded border transition-colors"
            style={{ borderColor: 'var(--border)', color: copied ? 'var(--success)' : 'var(--fg-muted)' }}>
            {copied ? '已复制' : '导出'}
          </button>
          {/* Detail toggle */}
          {hasDetailed && (
            <button
              onClick={() => { setShowDetailed(v => !v); setExpandedIdx(null) }}
              className="text-[11px] px-2 py-0.5 rounded transition-colors"
              style={{
                color: showDetailed ? 'var(--info)' : 'var(--fg-muted)',
                background: showDetailed ? 'var(--info-soft)' : 'transparent',
                border: '1px solid',
                borderColor: showDetailed ? 'var(--info-muted)' : 'var(--border)',
              }}
            >
              {showDetailed ? '简报' : '详细'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {!showDetailed ? (
          /* Simple list view */
          isLegacyParagraph ? (
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
              {cleanText}
            </p>
          ) : hasDetailed && hasBilingual ? (
            <ol className="space-y-2">
              {detailedItems.map((item, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
                  <span className="shrink-0 text-[11px] font-mono pt-0.5" style={{ color: 'var(--fg-muted)' }}>
                    {i + 1}.
                  </span>
                  <span>{getField(item, 'simple', lang)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="space-y-2">
              {simpleLines.map((line, i) => {
                const text = line.replace(/^\d+\.\s*/, '')
                return (
                  <li key={i} className="flex gap-2 text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
                    <span className="shrink-0 text-[11px] font-mono pt-0.5" style={{ color: 'var(--fg-muted)' }}>
                      {i + 1}.
                    </span>
                    <span>{text}</span>
                  </li>
                )
              })}
            </ol>
          )
        ) : (
          /* Q8: Detailed view — 前情提要 style with progressive disclosure */
          <div className="space-y-1">
            {detailedItems.map((item, i) => {
              const isExpanded = expandedIdx === i
              const simple = getField(item, 'simple', lang)
              const bg = getField(item, 'background', lang)
              const wh = getField(item, 'what_happened', lang)
              const ins = getField(item, 'insight', lang)
              const hasMore = !!(bg || wh || ins)

              return (
                <div key={i}
                  className={`rounded-md transition-colors ${hasMore ? 'cursor-pointer' : ''}`}
                  style={{
                    background: isExpanded ? 'var(--surface-alt)' : 'transparent',
                  }}
                  onClick={() => hasMore && toggleItem(i)}
                >
                  {/* Main line — always visible */}
                  <div className="flex items-start gap-2 px-3 py-2">
                    <span className="shrink-0 text-[11px] font-mono pt-0.5" style={{ color: 'var(--fg-muted)' }}>
                      {i + 1}.
                    </span>
                    <p className="text-[13px] leading-relaxed flex-1" style={{ color: 'var(--fg-body)' }}>
                      {simple}
                    </p>
                    {hasMore && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--fg-muted)" strokeWidth="1.5"
                        className="shrink-0 mt-1 transition-transform"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                        <path d="M4 2l4 4-4 4" />
                      </svg>
                    )}
                  </div>

                  {/* Expanded: progressive disclosure of bg/detail/insight */}
                  {isExpanded && (
                    <div className="px-3 pb-3 ml-6 space-y-1.5 text-[13px] leading-relaxed"
                      style={{ color: 'var(--fg-secondary)' }}>
                      {bg && <p>- {bg}</p>}
                      {wh && <p>- {wh}</p>}
                      {ins && (
                        <p className="italic" style={{ color: 'var(--fg-muted)' }}>- {ins}</p>
                      )}
                      {(item.source_url || item.tags?.length > 0) && (
                        <div className="flex items-center gap-2 pt-1">
                          {item.source_url && (
                            <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] font-mono underline" style={{ color: 'var(--info)' }}
                              onClick={e => e.stopPropagation()}>
                              {extractDomain(item.source_url)}
                            </a>
                          )}
                          {item.tags?.map(tag => (
                            <span key={tag} className="text-[11px] px-1 py-0.5 rounded font-mono"
                              style={{ color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
