'use client'

import { useState, useCallback, useRef } from 'react'
import { NarrativeFlow } from '@/components/narrative/NarrativeFlow'
import { HotTopicsList } from '@/components/narrative/HotTopicsList'
import { NarrativeChat } from '@/components/narrative/NarrativeChat'
import { NarrativeTabBar } from '@/components/narrative/NarrativeTabBar'
import { BranchDimensionSelector } from '@/components/narrative/BranchDimensionSelector'
import type { Node, Edge } from '@xyflow/react'

export interface NarrativeBranch {
  id: string; label: string; side: 'left' | 'right'; color: string
}

export interface NarrativeNodeData {
  date: string; title: string; description: string
  significance: 'high' | 'medium' | 'low'
  factIds: string[]; branchId: string; entityNames: string[]
  sourceUrl?: string
  participants?: { name: string; role: string }[]
  isMerged?: boolean
}

export interface NarrativeTab {
  id: string; query: string
  nodes: Node[]; edges: Edge[]; branches: NarrativeBranch[]
  branchDimension: 'auto' | 'entity' | 'stance'
  status: 'idle' | 'streaming' | 'done' | 'error'
  summary: string | null; totalFacts: number; error?: string
}

export function NarrativesClient() {
  const [tabs, setTabs] = useState<NarrativeTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [mergedView, setMergedView] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatContext, setChatContext] = useState<{ factIds: string[]; query: string } | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null

  const handleSSEEvent = useCallback((tabId: string, data: Record<string, unknown>) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab
      switch (data.type) {
        case 'node':
        case 'merged_node':
          return { ...tab, nodes: [...tab.nodes, data.node as unknown as Node] }
        case 'edge':
          return { ...tab, edges: [...tab.edges, data.edge as unknown as Edge] }
        case 'meta':
          return { ...tab, summary: (data.summary as string) ?? null, branches: (data.branches as NarrativeBranch[]) ?? [], totalFacts: (data.totalFacts as number) ?? 0 }
        case 'done':
          return { ...tab, status: 'done' }
        case 'error':
          return { ...tab, status: 'error', error: data.message as string }
        default:
          return tab
      }
    }))
  }, [])

  const runSearch = useCallback(async (query: string, branchDimension: 'auto' | 'entity' | 'stance' = 'auto') => {
    if (!query.trim()) return
    const tabId = `tab-${Date.now()}`
    setTabs(prev => [...prev, { id: tabId, query, nodes: [], edges: [], branches: [], branchDimension, status: 'streaming', summary: null, totalFacts: 0 }])
    setActiveTabId(tabId)
    setSearchInput('')

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`/api/narratives/search?${new URLSearchParams({ query, branch: branchDimension })}`, { signal: controller.signal })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try { handleSSEEvent(tabId, JSON.parse(line.slice(6))) } catch { /* ignore */ }
        }
      }
      if (buffer.startsWith('data: ')) {
        try { handleSSEEvent(tabId, JSON.parse(buffer.slice(6))) } catch { /* ignore */ }
      }
      setTabs(prev => prev.map(t => t.id === tabId ? { ...t, status: 'done' } : t))
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setTabs(prev => prev.map(t => t.id === tabId ? { ...t, status: 'error', error: (err as Error).message } : t))
      }
    }
  }, [handleSSEEvent])

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId)
      if (activeTabId === tabId) setActiveTabId(next.length > 0 ? next[next.length - 1].id : null)
      return next
    })
  }, [activeTabId])

  const changeBranchDimension = useCallback((dim: 'auto' | 'entity' | 'stance') => {
    if (!activeTab) return
    closeTab(activeTab.id)
    runSearch(activeTab.query, dim)
  }, [activeTab, closeTab, runSearch])

  const handleNodeClick = useCallback((nodeData: NarrativeNodeData) => {
    setChatContext({ factIds: nodeData.factIds, query: activeTab?.query ?? '' })
    setChatOpen(true)
  }, [activeTab])

  const displayData = (() => {
    if (!mergedView || tabs.length < 2) return { nodes: activeTab?.nodes ?? [], edges: activeTab?.edges ?? [] }
    const seenIds = new Set<string>()
    const nodes: Node[] = []; const edges: Edge[] = []
    for (const tab of tabs) {
      for (const n of tab.nodes) { if (!seenIds.has(n.id)) { seenIds.add(n.id); nodes.push(n) } }
      edges.push(...tab.edges)
    }
    return { nodes, edges }
  })()

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
      <div className="flex gap-2 mb-4">
        <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runSearch(searchInput)}
          placeholder="输入叙事主题，如「MiCA 监管进展」「Circle IPO」「非洲支付」..."
          className="flex-1 px-4 py-2.5 rounded-lg border text-sm"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg-body)' }} />
        <button onClick={() => runSearch(searchInput)} disabled={!searchInput.trim()}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ background: searchInput.trim() ? 'var(--accent)' : 'var(--border)', color: searchInput.trim() ? '#fff' : 'var(--fg-muted)' }}>
          生成时间线
        </button>
      </div>

      {tabs.length === 0 && <HotTopicsList onSelect={q => runSearch(q)} />}

      {tabs.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <NarrativeTabBar tabs={tabs} activeTabId={activeTabId} onSelect={setActiveTabId} onClose={closeTab}
            mergedView={mergedView} onToggleMerge={() => setMergedView(v => !v)} />
          {activeTab?.status === 'done' && <BranchDimensionSelector value={activeTab.branchDimension} onChange={changeBranchDimension} />}
        </div>
      )}

      {activeTab?.summary && (
        <div className="mb-3 px-4 py-3 rounded-lg border text-[13px] leading-relaxed"
          style={{ borderColor: 'var(--accent-muted)', background: 'var(--accent-soft)', color: 'var(--fg-body)' }}>
          <span className="font-medium" style={{ color: 'var(--accent)' }}>摘要: </span>{activeTab.summary}
          {activeTab.totalFacts > 0 && <span className="ml-2 text-[11px]" style={{ color: 'var(--fg-muted)' }}>({activeTab.totalFacts} 条事实)</span>}
        </div>
      )}

      {activeTab?.status === 'streaming' && (
        <div className="mb-3 flex items-center gap-2 text-[13px]" style={{ color: 'var(--fg-muted)' }}>
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          正在生成时间线...
        </div>
      )}

      {activeTab?.status === 'error' && (
        <div className="mb-3 px-4 py-3 rounded-lg border text-[13px]" style={{ borderColor: '#ef444480', background: '#ef444410', color: '#ef4444' }}>
          生成失败: {activeTab.error ?? '未知错误'}
        </div>
      )}

      {tabs.length > 0 && (
        <div className="flex-1 rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <NarrativeFlow nodes={displayData.nodes} edges={displayData.edges} branches={activeTab?.branches ?? []}
            status={activeTab?.status ?? 'idle'} onNodeClick={handleNodeClick} />
        </div>
      )}

      <NarrativeChat open={chatOpen} onClose={() => setChatOpen(false)} context={chatContext} />
    </div>
  )
}
