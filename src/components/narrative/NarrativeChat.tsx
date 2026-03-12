'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  open: boolean
  onClose: () => void
  context: { factIds: string[]; query: string } | null
}

export function NarrativeChat({ open, onClose, context }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevContext = useRef(context)

  useEffect(() => {
    if (context && context !== prevContext.current) {
      setMessages([])
      prevContext.current = context
    }
  }, [context])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || !context || loading) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/narratives/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          context_fact_ids: context.factIds,
          narrative_query: context.query,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content ?? '无法回答' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '请求失败，请重试' }])
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t shadow-lg"
      style={{ height: 320, background: 'var(--bg-page)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[13px] font-medium" style={{ color: 'var(--fg-body)' }}>
          追问 · {context?.query ?? ''}
          {context?.factIds && (
            <span className="ml-2 text-[11px]" style={{ color: 'var(--fg-muted)' }}>({context.factIds.length} 条相关事实)</span>
          )}
        </div>
        <button onClick={onClose} className="text-[18px] px-2" style={{ color: 'var(--fg-muted)' }}>&times;</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ height: 'calc(100% - 90px)' }}>
        {messages.length === 0 && (
          <div className="text-[13px] text-center py-4" style={{ color: 'var(--fg-muted)' }}>
            基于选中节点的事实数据进行追问
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[75%] px-3 py-2 rounded-lg text-[13px] leading-relaxed"
              style={{
                background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-card)',
                color: m.role === 'user' ? '#fff' : 'var(--fg-body)',
                border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
              }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
              思考中...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="输入追问..."
          className="flex-1 px-3 py-1.5 rounded-lg border text-[13px]"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg-body)' }} />
        <button onClick={send} disabled={!input.trim() || loading}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium"
          style={{ background: input.trim() && !loading ? 'var(--accent)' : 'var(--border)', color: input.trim() && !loading ? '#fff' : 'var(--fg-muted)' }}>
          发送
        </button>
      </div>
    </div>
  )
}
