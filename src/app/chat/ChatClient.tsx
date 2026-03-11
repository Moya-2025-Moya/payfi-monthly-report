'use client'
import { useState, useRef, useEffect } from 'react'

interface Message { role: 'user' | 'assistant'; content: string }

export function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to get response.' }])
    } finally { setLoading(false) }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <p className="text-sm text-center py-12" style={{ color: 'var(--muted-fg)' }}>
            Ask anything about the stablecoin industry. Answers are based on verified atomic facts.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap"
              style={{
                background: m.role === 'user' ? 'var(--accent)' : 'var(--muted)',
                color: m.role === 'user' ? 'var(--accent-fg)' : 'var(--foreground)',
              }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="rounded-lg px-4 py-2 text-sm" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>Thinking...</div></div>}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question..."
          className="flex-1 rounded-md border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--background)' }} />
        <button type="submit" disabled={loading}
          className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          Send
        </button>
      </form>
    </div>
  )
}
