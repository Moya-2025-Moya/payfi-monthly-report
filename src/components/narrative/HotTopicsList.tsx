'use client'

import { useEffect, useState } from 'react'

interface HotTopic {
  label: string
  description: string
  suggested_query: string
  fact_count: number
  key_entities: string[]
}

interface Props {
  onSelect: (query: string) => void
}

export function HotTopicsList({ onSelect }: Props) {
  const [topics, setTopics] = useState<HotTopic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/narratives/hot-topics')
      .then(r => r.json())
      .then(d => setTopics(d.topics ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[13px]" style={{ color: 'var(--fg-muted)' }}>
        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        正在发现热门叙事...
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <div className="text-center py-12 text-[13px]" style={{ color: 'var(--fg-muted)' }}>
        暂无热门话题，请手动输入主题搜索
      </div>
    )
  }

  return (
    <div>
      <div className="text-[13px] font-medium mb-3" style={{ color: 'var(--fg-muted)' }}>热门叙事</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {topics.map(t => (
          <button key={t.suggested_query} onClick={() => onSelect(t.suggested_query)}
            className="text-left p-3 rounded-lg border transition-all hover:shadow-md"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <div className="text-[13px] font-medium mb-1" style={{ color: 'var(--fg-body)' }}>{t.label}</div>
            <div className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--fg-muted)' }}>{t.description}</div>
            <div className="flex flex-wrap gap-1">
              {t.key_entities.slice(0, 3).map(e => (
                <span key={e} className="text-[11px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{e}</span>
              ))}
              {t.fact_count > 0 && (
                <span className="text-[11px] px-1.5 py-0.5" style={{ color: 'var(--fg-muted)' }}>{t.fact_count} 条事实</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
