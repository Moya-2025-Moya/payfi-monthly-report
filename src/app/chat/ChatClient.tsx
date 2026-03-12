'use client'
import { useState, useRef, useEffect } from 'react'

interface Citation {
  index: number
  content: string
  source_url: string | null
  source_type: string | null
  fact_date: string | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

/* Render text with [N] citation markers as clickable links */
function CitedText({ content, citations }: { content: string; citations?: Citation[] }) {
  if (!citations || citations.length === 0) {
    return <span className="whitespace-pre-wrap">{content}</span>
  }

  const parts = content.split(/(\[\d+\])/)
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/)
        if (match) {
          const idx = parseInt(match[1], 10)
          const cite = citations.find(c => c.index === idx)
          if (cite) {
            return (
              <span key={i} className="inline-group relative">
                {cite.source_url ? (
                  <a
                    href={cite.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-mono font-bold align-super -mt-1 mx-0.5 cursor-pointer transition-colors"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    title={cite.content}
                  >
                    {idx}
                  </a>
                ) : (
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-mono font-bold align-super -mt-1 mx-0.5"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    title={cite.content}
                  >
                    {idx}
                  </span>
                )}
              </span>
            )
          }
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

export function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const examples = [
    '本周稳定币行业有什么新动态？',
    '最近有什么监管新进展？',
    'USDC 和 USDT 最近有什么变化？',
    '近期有哪些融资事件？',
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
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content, citations: data.citations }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '错误：未能获取响应，请稍后重试。' }])
    } finally { setLoading(false) }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="py-16 space-y-6 text-center">
            <p className="text-[13px] font-mono" style={{ color: 'var(--fg-dim)' }}>
              关于稳定币行业，随便问。
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
            <div className="max-w-[75%] rounded-lg px-4 py-3 text-[13px]"
              style={{
                background: m.role === 'user' ? 'var(--accent)' : 'var(--surface-alt)',
                color: m.role === 'user' ? 'var(--accent-fg)' : 'var(--fg-body)',
              }}>
              {m.role === 'assistant' ? (
                <CitedText content={m.content} citations={m.citations} />
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
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
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="输入你的问题..."
          className="flex-1 rounded-lg border px-4 py-2.5 text-[13px] outline-none font-mono transition-colors"
          style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--fg)' }} />
        <button type="submit" disabled={loading}
          className="rounded-lg px-6 py-2.5 text-[13px] font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          发送
        </button>
      </form>
    </div>
  )
}
