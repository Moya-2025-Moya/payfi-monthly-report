'use client'
import { useState, useRef, useEffect } from 'react'

interface Message { role: 'user' | 'assistant'; content: string }

export function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const examples = [
    'What are the top stablecoins by market cap this week?',
    'Any new regulatory developments?',
    'Compare USDT and USDC recent metrics',
    'What funding rounds happened recently?',
  ]

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
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="py-16 space-y-6 text-center">
            <p className="text-[13px] font-mono" style={{ color: 'var(--fg-dim)' }}>
              Ask anything about the stablecoin industry.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {examples.map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="rounded-full border px-3 py-1.5 text-[12px] font-mono transition-colors text-left"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[75%] rounded-lg px-4 py-3 text-[13px] whitespace-pre-wrap"
              style={{
                background: m.role === 'user' ? 'var(--accent)' : 'var(--surface-alt)',
                color: m.role === 'user' ? 'var(--accent-fg)' : 'var(--fg-body)',
              }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-3 text-[13px] font-mono" style={{ background: 'var(--surface-alt)', color: 'var(--fg-faint)' }}>...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question..."
          className="flex-1 rounded-lg border px-4 py-2.5 text-[13px] outline-none font-mono transition-colors"
          style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--fg)' }} />
        <button type="submit" disabled={loading}
          className="rounded-lg px-6 py-2.5 text-[13px] font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          Send
        </button>
      </form>
    </div>
  )
}
