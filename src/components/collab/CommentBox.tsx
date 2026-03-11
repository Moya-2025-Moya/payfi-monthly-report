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
      <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..."
        className="flex-1 rounded-md border px-3 py-1.5 text-sm outline-none"
        style={{ borderColor: 'var(--border)', background: 'var(--background)' }} />
      <button type="submit" className="rounded-md px-3 py-1.5 text-xs font-medium"
        style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
        Send
      </button>
    </form>
  )
}
