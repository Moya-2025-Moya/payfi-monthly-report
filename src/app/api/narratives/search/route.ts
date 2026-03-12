// SSE endpoint: generate branched narrative timeline from atomic_facts + web search
import { readFileSync } from 'fs'
import { join } from 'path'
import { supabaseAdmin } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import { searchWeb } from '@/lib/web-search'
import type { AtomicFact } from '@/lib/types'

export const maxDuration = 120

// ─── Types ───

interface AIBranch {
  id: string; label: string; side: 'left' | 'right'; color: string
}

interface AIEvent {
  date: string; title: string; description: string
  significance: 'high' | 'medium' | 'low'
  source_indices: number[]; branch_id: string; entity_names: string[]
}

interface AIMultiPartyEvent {
  date: string; title: string; description: string
  significance: 'high' | 'medium' | 'low'
  source_indices: number[]
  participants: { name: string; role: string }[]
}

interface AIConnection {
  from_event_index: number; to_event_index: number; label: string
}

interface AIWebSearchQuery {
  branch_id: string; query: string
}

interface AIResponse {
  summary: string
  branch_dimension_used: string
  branches: AIBranch[]
  events: AIEvent[]
  multi_party_events: AIMultiPartyEvent[]
  connections: AIConnection[]
  web_search_queries?: AIWebSearchQuery[]
}

// ─── Fact retrieval ───

async function findEntityByName(query: string): Promise<{ id: string; name: string } | null> {
  const { data: exact } = await supabaseAdmin
    .from('entities').select('id, name').ilike('name', query).limit(1)
  if (exact?.length) return exact[0] as { id: string; name: string }

  const { data: fuzzy } = await supabaseAdmin
    .from('entities').select('id, name').ilike('name', `%${query}%`).limit(1)
  if (fuzzy?.length) return fuzzy[0] as { id: string; name: string }

  return null
}

async function getFactsByEntity(entityId: string): Promise<AtomicFact[]> {
  const { data: links } = await supabaseAdmin
    .from('fact_entities').select('fact_id').eq('entity_id', entityId)
  if (!links?.length) return []

  const { data } = await supabaseAdmin
    .from('atomic_facts').select('*')
    .in('id', links.map((l: { fact_id: string }) => l.fact_id))
    .in('verification_status', ['verified', 'partially_verified'])
    .order('fact_date', { ascending: true }).limit(80)

  return (data ?? []) as AtomicFact[]
}

async function getFactsByNarrative(query: string): Promise<AtomicFact[]> {
  const keywords = query.split(/\s+/).filter(k => k.length >= 2)
  const allFacts: AtomicFact[] = []
  const seen = new Set<string>()

  // Tag-based search (most precise)
  for (const kw of keywords.slice(0, 3)) {
    const lower = kw.toLowerCase()
    const { data } = await supabaseAdmin
      .from('atomic_facts').select('*')
      .in('verification_status', ['verified', 'partially_verified'])
      .contains('tags', [lower])
      .order('fact_date', { ascending: true }).limit(40)

    for (const f of (data ?? []) as AtomicFact[]) {
      if (!seen.has(f.id)) { seen.add(f.id); allFacts.push(f) }
    }
  }

  // Content search (broader, but capped)
  const { data: contentSearch } = await supabaseAdmin
    .from('atomic_facts').select('*')
    .in('verification_status', ['verified', 'partially_verified'])
    .or(`content_zh.ilike.%${query}%,content_en.ilike.%${query}%`)
    .order('fact_date', { ascending: true }).limit(30)

  for (const f of (contentSearch ?? []) as AtomicFact[]) {
    if (!seen.has(f.id)) { seen.add(f.id); allFacts.push(f) }
  }

  allFacts.sort((a, b) => new Date(a.fact_date).getTime() - new Date(b.fact_date).getTime())
  return allFacts
}

async function getEntityNamesForFacts(factIds: string[]): Promise<Map<string, string[]>> {
  if (factIds.length === 0) return new Map()

  const { data } = await supabaseAdmin
    .from('fact_entities')
    .select('fact_id, entities(name)')
    .in('fact_id', factIds)

  const map = new Map<string, string[]>()
  for (const row of (data ?? []) as unknown as Array<{ fact_id: string; entities: { name: string } | { name: string }[] | null }>) {
    const entities = row.entities
    if (!entities) continue
    const names = Array.isArray(entities) ? entities.map(e => e.name) : [entities.name]
    for (const name of names) {
      if (name) {
        const existing = map.get(row.fact_id) ?? []
        existing.push(name)
        map.set(row.fact_id, existing)
      }
    }
  }
  return map
}

// ─── Prompt ───

const PROMPT_TEMPLATE = readFileSync(
  join(process.cwd(), 'src/config/prompts/narrative-timeline.md'),
  'utf-8'
)

function buildFactsText(facts: AtomicFact[], entityMap: Map<string, string[]>): string {
  return facts.map((f, i) => {
    const date = String(f.fact_date).split('T')[0]
    const content = f.content_zh || f.content_en
    const entities = entityMap.get(f.id)?.join(', ') ?? ''
    return `[${i}] ${date} | ${content} | tags: ${f.tags.join(', ')}${entities ? ` | entities: ${entities}` : ''}`
  }).join('\n')
}

// ─── Web search enrichment ───

const MAX_EXTERNAL_PER_BRANCH = 3

interface ExternalEvent {
  date: string
  title: string
  description: string
  branchId: string
  url: string
}

async function fetchExternalEvents(
  searchQueries: AIWebSearchQuery[],
  existingTitles: Set<string>
): Promise<ExternalEvent[]> {
  const results: ExternalEvent[] = []

  for (const sq of searchQueries) {
    const webResults = await searchWeb(sq.query, 5)
    let count = 0

    for (const r of webResults) {
      if (count >= MAX_EXTERNAL_PER_BRANCH) break

      // Skip if title too similar to existing internal events
      const titleLower = r.title.toLowerCase()
      let isDuplicate = false
      for (const existing of existingTitles) {
        if (titleLower.includes(existing.toLowerCase()) || existing.toLowerCase().includes(titleLower)) {
          isDuplicate = true
          break
        }
      }
      if (isDuplicate) continue

      // Extract approximate date from search result
      const dateStr = r.date ?? new Date().toISOString().split('T')[0]

      results.push({
        date: dateStr,
        title: r.title.length > 60 ? r.title.slice(0, 57) + '...' : r.title,
        description: r.description.length > 120 ? r.description.slice(0, 117) + '...' : r.description,
        branchId: sq.branch_id,
        url: r.url,
      })
      count++
    }
  }

  return results
}

// ─── SSE Route ───

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('query') ?? ''
  const branchDim = url.searchParams.get('branch') ?? 'auto'
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        if (!query) {
          send({ type: 'error', message: '请输入查询主题' })
          controller.close()
          return
        }

        send({ type: 'status', message: '正在检索相关事实...' })

        // Retrieve facts
        const entity = await findEntityByName(query)
        let facts: AtomicFact[] = []

        if (entity) {
          facts = await getFactsByEntity(entity.id)
          const narrativeFacts = await getFactsByNarrative(query)
          const seen = new Set(facts.map(f => f.id))
          for (const f of narrativeFacts) {
            if (!seen.has(f.id)) { facts.push(f); seen.add(f.id) }
          }
        } else {
          facts = await getFactsByNarrative(query)
        }

        if (facts.length === 0) {
          send({ type: 'status', message: '未找到相关事实' })
          send({ type: 'meta', summary: `未找到与「${query}」相关的已验证事实。`, branches: [], totalFacts: 0, branchDimension: branchDim })
          send({ type: 'done' })
          controller.close()
          return
        }

        send({ type: 'status', message: `找到 ${facts.length} 条候选事实，AI 正在筛选并生成时间线...` })

        const entityMap = await getEntityNamesForFacts(facts.map(f => f.id))
        const factsText = buildFactsText(facts, entityMap)
        const prompt = PROMPT_TEMPLATE
          .replace('{subject}', query)
          .replace('{branch_dimension}', branchDim)
          .replace('{fact_count}', String(facts.length))
          .replace('{facts_text}', factsText)

        // Call AI
        const aiResult = await callHaikuJSON<AIResponse>(prompt)
        const branches = aiResult.branches ?? []

        // ── Emit internal events ──
        let nodeIndex = 0
        const internalTitles = new Set<string>()

        for (const event of aiResult.events ?? []) {
          const factIds = (event.source_indices ?? [])
            .filter(i => i >= 0 && i < facts.length)
            .map(i => facts[i].id)

          const sourceUrl = factIds.length > 0
            ? facts[(event.source_indices?.[0] ?? 0)]?.source_url
            : undefined

          internalTitles.add(event.title)

          send({
            type: 'node',
            node: {
              id: `node-${nodeIndex}`,
              type: 'narrative',
              position: { x: 0, y: 0 },
              data: {
                date: event.date,
                title: event.title,
                description: event.description,
                significance: event.significance,
                factIds,
                branchId: event.branch_id,
                entityNames: event.entity_names ?? [],
                sourceUrl,
                isExternal: false,
              },
            },
          })
          nodeIndex++
        }

        // Emit multi-party events
        for (const mpe of aiResult.multi_party_events ?? []) {
          const factIds = (mpe.source_indices ?? [])
            .filter(i => i >= 0 && i < facts.length)
            .map(i => facts[i].id)

          internalTitles.add(mpe.title)

          send({
            type: 'merged_node',
            node: {
              id: `merged-${nodeIndex}`,
              type: 'merged',
              position: { x: 0, y: 0 },
              data: {
                date: mpe.date,
                title: mpe.title,
                description: mpe.description,
                significance: mpe.significance,
                factIds,
                branchId: 'center',
                entityNames: mpe.participants.map(p => p.name),
                participants: mpe.participants,
                isMerged: true,
                isExternal: false,
              },
            },
          })
          nodeIndex++
        }

        // ── Emit edges ──
        const branchNodeIds = new Map<string, string[]>()
        for (let i = 0; i < (aiResult.events?.length ?? 0); i++) {
          const bid = aiResult.events[i].branch_id
          const list = branchNodeIds.get(bid) ?? []
          list.push(`node-${i}`)
          branchNodeIds.set(bid, list)
        }

        let edgeIndex = 0
        for (const [, nodeIds] of branchNodeIds) {
          for (let i = 0; i < nodeIds.length - 1; i++) {
            send({
              type: 'edge',
              edge: {
                id: `edge-${edgeIndex++}`,
                source: nodeIds[i],
                target: nodeIds[i + 1],
                type: 'smoothstep',
              },
            })
          }
        }

        for (const conn of aiResult.connections ?? []) {
          const totalEvents = aiResult.events?.length ?? 0
          const fromId = conn.from_event_index < totalEvents
            ? `node-${conn.from_event_index}`
            : `merged-${conn.from_event_index}`
          const toId = conn.to_event_index < totalEvents
            ? `node-${conn.to_event_index}`
            : `merged-${conn.to_event_index}`

          send({
            type: 'edge',
            edge: { id: `cross-${edgeIndex++}`, source: fromId, target: toId, label: conn.label },
          })
        }

        // ── Emit metadata (before external search so UI renders immediately) ──
        send({
          type: 'meta',
          summary: aiResult.summary,
          branches,
          totalFacts: facts.length,
          branchDimension: aiResult.branch_dimension_used ?? branchDim,
        })

        // ── External web search enrichment ──
        const searchQueries = aiResult.web_search_queries ?? []
        if (searchQueries.length > 0) {
          send({ type: 'status', message: '正在搜索网上补充信息...' })

          const externalEvents = await fetchExternalEvents(searchQueries, internalTitles)

          for (const ext of externalEvents) {
            send({
              type: 'node',
              node: {
                id: `ext-${nodeIndex}`,
                type: 'narrative',
                position: { x: 0, y: 0 },
                data: {
                  date: ext.date,
                  title: ext.title,
                  description: ext.description,
                  significance: 'low' as const,
                  factIds: [],
                  branchId: ext.branchId,
                  entityNames: [],
                  isExternal: true,
                  externalUrl: ext.url,
                },
              },
            })
            nodeIndex++
          }
        }

        send({ type: 'done' })
      } catch (err) {
        send({ type: 'error', message: `生成失败: ${err instanceof Error ? err.message : String(err)}` })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
