'use client'
import { useState } from 'react'

export function CommentBox({ factId, onSubmit }: { factId: string; onSubmit: (content: string) => void }) {
  const [text, setText] = useState('')
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    onSubmit(text.trim())
    setText('')
  }
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Comment..."
        className="flex-1 rounded-lg border px-3 py-1.5 text-[13px] outline-none font-mono transition-colors focus:border-[var(--border-hover)]"
        style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--fg)' }} />
      <button type="submit" className="rounded-lg px-4 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
        style={{ background: 'var(--fg-title)', color: 'var(--bg)' }}>
        Send
      </button>
    </form>
  )
}
