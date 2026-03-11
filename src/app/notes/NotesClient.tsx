'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import type { Note } from '@/lib/types'

const DEFAULT_USER_ID = 'default-user'

export function NotesClient({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: DEFAULT_USER_ID, content: content.trim() }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes(prev => [note, ...prev])
        setContent('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* New note form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="记录想法、观察或问题..."
            className="flex-1 rounded-lg border px-4 py-2.5 text-[13px] outline-none transition-colors focus:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--fg)' }}
          />
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="rounded-lg px-5 py-2.5 text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--fg-title)', color: 'var(--bg)' }}
          >
            {submitting ? '...' : '添加'}
          </button>
        </div>
      </form>

      {/* Notes list */}
      {notes.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-lg mb-1" style={{ color: 'var(--fg-title)' }}>暂无笔记</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>在上方输入框中添加第一条团队笔记。</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <div
              key={note.id}
              className="rounded-lg border p-4 transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
                {note.content}
              </p>
              <div className="mt-2 flex items-center gap-3 text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>
                <time>{new Date(note.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                {note.entity_id && <span>实体: {note.entity_id}</span>}
                {note.fact_id && <span>事实: {note.fact_id.slice(0, 8)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
