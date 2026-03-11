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
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <p className="text-[13px] font-mono text-center py-20" style={{ color: '#333' }}>
            Ask anything about the stablecoin industry.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[75%] rounded px-4 py-3 text-[13px] whitespace-pre-wrap"
              style={{
                background: m.role === 'user' ? '#fff' : '#111',
                color: m.role === 'user' ? '#000' : '#ccc',
              }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded px-4 py-3 text-[13px] font-mono" style={{ background: '#111', color: '#444' }}>...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 pt-4 border-t" style={{ borderColor: '#1a1a1a' }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question..."
          className="flex-1 rounded border px-4 py-2.5 text-[13px] outline-none font-mono transition-colors focus:border-[#333]"
          style={{ borderColor: '#1a1a1a', background: '#0a0a0a', color: '#e5e5e5' }} />
        <button type="submit" disabled={loading}
          className="rounded px-6 py-2.5 text-[13px] font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{ background: '#fff', color: '#000' }}>
          Send
        </button>
      </form>
    </div>
  )
}
