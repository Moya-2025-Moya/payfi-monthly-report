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
        className="flex-1 rounded border px-3 py-1.5 text-[12px] outline-none font-mono transition-colors focus:border-[#333]"
        style={{ borderColor: '#1a1a1a', background: '#0a0a0a', color: '#e5e5e5' }} />
      <button type="submit" className="rounded px-4 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
        style={{ background: '#fff', color: '#000' }}>
        Send
      </button>
    </form>
  )
}
