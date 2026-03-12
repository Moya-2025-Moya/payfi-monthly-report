'use client'

import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { FactCard } from '@/components/facts/FactCard'
import type { AtomicFact } from '@/lib/types'

type Stage = 'review' | 'select' | 'compose' | 'preview'

const STAGE_LABELS: Record<Stage, string> = {
  review: '审核',
  select: '选稿',
  compose: '排版',
  preview: '预览',
}

const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  review: '审核 AI 提取的事实，标记需要修正的内容',
  select: '选择入刊内容，调整优先级',
  compose: '调整排序，编辑摘要',
  preview: '预览最终邮件效果，确认后发布',
}

interface FactWithSelection extends AtomicFact {
  selected: boolean
  priority: number
}

export default function EditorialPage() {
  const [stage, setStage] = useState<Stage>('review')
  const [facts, setFacts] = useState<FactWithSelection[]>([])
  const [loading, setLoading] = useState(true)
  const [emailHtml, setEmailHtml] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<string | null>(null)

  // Load facts for current week
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/facts?confidence=high,medium&limit=200')
        const data = await res.json()
        const enriched: FactWithSelection[] = (data.data ?? data ?? []).map((f: AtomicFact, i: number) => ({
          ...f,
          selected: f.confidence === 'high',
          priority: i,
        }))
        setFacts(enriched)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const selectedFacts = facts.filter(f => f.selected)
  const objectiveFacts = selectedFacts.filter(f => f.objectivity === 'fact' || !f.objectivity)
  const opinions = selectedFacts.filter(f => f.objectivity === 'opinion' || f.objectivity === 'analysis')

  const toggleSelect = useCallback((id: string) => {
    setFacts(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f))
  }, [])

  const movePriority = useCallback((id: string, dir: -1 | 1) => {
    setFacts(prev => {
      const idx = prev.findIndex(f => f.id === id)
      if (idx < 0) return prev
      const targetIdx = idx + dir
      if (targetIdx < 0 || targetIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[targetIdx]] = [next[targetIdx], next[idx]]
      return next
    })
  }, [])

  async function handlePreview() {
    setStage('preview')
    try {
      const res = await fetch('/api/newsletter/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factIds: selectedFacts.map(f => f.id) }),
      })
      if (res.ok) {
        const data = await res.json()
        setEmailHtml(data.html)
      }
    } catch {
      // fallback: just show preview stage
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setPublishResult(null)
    try {
      const res = await fetch('/api/newsletter/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factIds: selectedFacts.map(f => f.id) }),
      })
      const data = await res.json()
      if (res.ok) {
        setPublishResult('发布成功')
      } else {
        setPublishResult(`发布失败: ${data.error ?? 'unknown'}`)
      }
    } catch {
      setPublishResult('发布失败: 网络错误')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div>
      <PageHeader title="编辑台" />

      {/* Stage navigation */}
      <div className="flex items-center gap-1 mb-6">
        {(Object.keys(STAGE_LABELS) as Stage[]).map((s, i) => (
          <div key={s} className="flex items-center">
            {i > 0 && <span className="mx-2 text-[12px]" style={{ color: 'var(--fg-muted)' }}>→</span>}
            <button
              onClick={() => setStage(s)}
              className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
              style={{
                background: stage === s ? 'var(--accent-soft)' : 'transparent',
                color: stage === s ? 'var(--accent)' : 'var(--fg-muted)',
                border: `1px solid ${stage === s ? 'var(--accent-muted)' : 'var(--border)'}`,
              }}
            >
              {STAGE_LABELS[s]}
            </button>
          </div>
        ))}
      </div>

      <p className="text-[12px] mb-4" style={{ color: 'var(--fg-muted)' }}>
        {STAGE_DESCRIPTIONS[stage]}
      </p>

      {loading ? (
        <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>加载中...</p>
      ) : (
        <div className="max-w-3xl">
          {/* Stage: Review */}
          {stage === 'review' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-medium" style={{ color: 'var(--fg-title)' }}>
                  本周事实 ({facts.length})
                </p>
                <div className="flex gap-4 text-[12px]" style={{ color: 'var(--fg-muted)' }}>
                  <span>高可信: {facts.filter(f => f.confidence === 'high').length}</span>
                  <span>中可信: {facts.filter(f => f.confidence === 'medium').length}</span>
                </div>
              </div>
              {facts.map(fact => (
                <FactCard key={fact.id} fact={fact} />
              ))}
              <div className="pt-4 text-center">
                <button onClick={() => setStage('select')}
                  className="px-6 py-2 rounded-md text-[13px] font-medium"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                  审核完毕，进入选稿 →
                </button>
              </div>
            </div>
          )}

          {/* Stage: Select */}
          {stage === 'select' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-medium" style={{ color: 'var(--fg-title)' }}>
                  选择入刊内容 (已选 {selectedFacts.length}/{facts.length})
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setFacts(prev => prev.map(f => ({ ...f, selected: f.confidence === 'high' })))}
                    className="text-[11px] px-2 py-1 rounded border"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                    仅高可信
                  </button>
                  <button onClick={() => setFacts(prev => prev.map(f => ({ ...f, selected: true })))}
                    className="text-[11px] px-2 py-1 rounded border"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                    全选
                  </button>
                </div>
              </div>

              {facts.map(fact => (
                <div key={fact.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={fact.selected}
                    onChange={() => toggleSelect(fact.id)}
                    className="mt-3 shrink-0"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <div className="flex-1 min-w-0" style={{ opacity: fact.selected ? 1 : 0.5 }}>
                    <FactCard fact={fact} />
                  </div>
                </div>
              ))}

              <div className="pt-4 flex gap-3 justify-center">
                <button onClick={() => setStage('review')}
                  className="px-4 py-2 rounded-md text-[13px] border"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                  ← 返回审核
                </button>
                <button onClick={() => setStage('compose')}
                  className="px-6 py-2 rounded-md text-[13px] font-medium"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                  确认选稿 ({selectedFacts.length}) →
                </button>
              </div>
            </div>
          )}

          {/* Stage: Compose */}
          {stage === 'compose' && (
            <div>
              <Card>
                <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--fg-title)' }}>
                  入刊内容排序
                </p>
                <p className="text-[11px] mb-4" style={{ color: 'var(--fg-muted)' }}>
                  拖动调整顺序，事实 {objectiveFacts.length} 条 · 观点 {opinions.length} 条
                </p>

                <div className="space-y-1">
                  {selectedFacts.map((fact, i) => (
                    <div key={fact.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md border"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <span className="text-[11px] font-mono w-6 text-center shrink-0" style={{ color: 'var(--fg-muted)' }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] truncate" style={{ color: 'var(--fg-body)' }}>
                          {fact.content_zh || fact.content_en}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => movePriority(fact.id, -1)}
                          disabled={i === 0}
                          className="w-6 h-6 flex items-center justify-center rounded text-[11px]"
                          style={{ color: i === 0 ? 'var(--fg-muted)' : 'var(--fg-secondary)', opacity: i === 0 ? 0.3 : 1 }}>
                          ↑
                        </button>
                        <button onClick={() => movePriority(fact.id, 1)}
                          disabled={i === selectedFacts.length - 1}
                          className="w-6 h-6 flex items-center justify-center rounded text-[11px]"
                          style={{ color: i === selectedFacts.length - 1 ? 'var(--fg-muted)' : 'var(--fg-secondary)', opacity: i === selectedFacts.length - 1 ? 0.3 : 1 }}>
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="pt-4 flex gap-3 justify-center">
                <button onClick={() => setStage('select')}
                  className="px-4 py-2 rounded-md text-[13px] border"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                  ← 返回选稿
                </button>
                <button onClick={handlePreview}
                  className="px-6 py-2 rounded-md text-[13px] font-medium"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                  生成预览 →
                </button>
              </div>
            </div>
          )}

          {/* Stage: Preview */}
          {stage === 'preview' && (
            <div>
              {emailHtml ? (
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between px-4 py-2 border-b"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}>
                    <p className="text-[12px] font-medium" style={{ color: 'var(--fg-title)' }}>
                      邮件预览
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                        {selectedFacts.length} 条内容
                      </span>
                    </div>
                  </div>
                  <iframe
                    srcDoc={emailHtml}
                    className="w-full border-0"
                    style={{ height: '70vh', background: '#0a0a0a' }}
                    title="Newsletter preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <Card>
                  <p className="text-[12px] text-center py-8" style={{ color: 'var(--fg-muted)' }}>
                    生成预览中...
                  </p>
                </Card>
              )}

              <div className="pt-4 flex gap-3 justify-center">
                <button onClick={() => setStage('compose')}
                  className="px-4 py-2 rounded-md text-[13px] border"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                  ← 返回排版
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="px-6 py-2 rounded-md text-[13px] font-medium"
                  style={{
                    background: publishResult === '发布成功' ? 'var(--success)' : 'var(--accent)',
                    color: 'var(--accent-fg)',
                    opacity: publishing ? 0.7 : 1,
                  }}
                >
                  {publishing ? '发布中...' : publishResult === '发布成功' ? '已发布' : '确认发布'}
                </button>
              </div>

              {publishResult && (
                <p className="mt-3 text-center text-[12px]"
                  style={{ color: publishResult === '发布成功' ? 'var(--success)' : 'var(--danger)' }}>
                  {publishResult}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
