'use client'

import { useState } from 'react'

interface DetailedItem {
  date: string
  simple: string
  background: string
  what_happened: string
  insight: string
  source_url: string | null
  tags: string[]
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function WeeklySummary({ simple, detailed }: { simple: string; detailed: string | null }) {
  const [showDetailed, setShowDetailed] = useState(false)

  // Strip any markdown formatting from legacy data
  const cleanText = simple
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')

  // Parse simple version: "Weekly Stablecoin News Update:\n1. ...\n\n2. ..."
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
  // Legacy data: if simpleLines has only 1 entry and no numbered format, it's a plain paragraph
  const isLegacyParagraph = simpleLines.length === 1 && !/^\d+\./.test(simple)

  return (
    <div className="mb-6 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: 'var(--accent)' }}>
          Weekly Update
        </p>
        {hasDetailed && (
          <button
            onClick={() => setShowDetailed(v => !v)}
            className="text-[11px] px-2 py-0.5 rounded transition-colors"
            style={{
              color: showDetailed ? 'var(--accent)' : 'var(--fg-muted)',
              background: showDetailed ? 'var(--accent-soft)' : 'transparent',
              border: '1px solid',
              borderColor: showDetailed ? 'var(--accent-muted)' : 'var(--border)',
            }}
          >
            {showDetailed ? '简报' : '详细'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {!showDetailed ? (
          isLegacyParagraph ? (
            /* Legacy paragraph summary */
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
              {cleanText}
            </p>
          ) : (
            /* Simplified numbered list */
            <ol className="space-y-2">
              {simpleLines.map((line, i) => {
                const text = line.replace(/^\d+\.\s*/, '')
                return (
                  <li key={i} className="flex gap-2 text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
                    <span className="shrink-0 text-[11px] font-mono pt-0.5" style={{ color: 'var(--fg-faint)' }}>
                      {i + 1}.
                    </span>
                    <span>{text}</span>
                  </li>
                )
              })}
            </ol>
          )
        ) : (
          /* Detailed view */
          <div className="space-y-4">
            {detailedItems.map((item, i) => (
              <div key={i} className="rounded-md border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}>
                {/* Title line */}
                <div className="flex items-start gap-2 mb-2">
                  <span className="shrink-0 text-[11px] font-mono pt-0.5" style={{ color: 'var(--fg-faint)' }}>
                    {i + 1}.
                  </span>
                  <p className="text-[13px] font-medium leading-snug" style={{ color: 'var(--fg-title)' }}>
                    {item.simple}
                  </p>
                </div>

                {/* Details */}
                <div className="ml-5 space-y-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                  <p><span className="font-medium" style={{ color: 'var(--fg-muted)' }}>Background: </span>{item.background}</p>
                  <p><span className="font-medium" style={{ color: 'var(--fg-muted)' }}>What happened: </span>{item.what_happened}</p>
                  <p><span className="font-medium" style={{ color: 'var(--fg-muted)' }}>Insight: </span>{item.insight}</p>
                </div>

                {/* Source + Tags */}
                <div className="ml-5 mt-2 flex items-center gap-2 flex-wrap">
                  {item.source_url && (
                    <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] font-mono underline" style={{ color: 'var(--accent)' }}>
                      {extractDomain(item.source_url)}
                    </a>
                  )}
                  {item.tags?.map(tag => (
                    <span key={tag} className="text-[11px] px-1 py-0.5 rounded font-mono"
                      style={{ color: 'var(--fg-faint)', border: '1px solid var(--border)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
