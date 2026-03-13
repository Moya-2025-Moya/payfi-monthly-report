// SSE endpoint: auto-generate Top 3 narrative timelines for the week
// Each timeline: fact-based nodes + external search nodes + prediction nodes
// Stored in weekly_snapshots.snapshot_data.narratives

import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import { searchWeb } from '@/lib/web-search'
import { createPipelineLogger } from '@/lib/pipeline-logger'
import { verifyAdminToken } from '@/lib/admin-auth'
import type { AtomicFact } from '@/lib/types'

export const maxDuration = 300

function shiftWeekStr(week: string, delta: number): string {
  const [yearStr, wPart] = week.split('-W')
  const year = Number(yearStr)
  const num = Number(wPart) + delta
  if (num < 1) return `${year - 1}-W${String(52 + num).padStart(2, '0')}`
  if (num > 52) return `${year + 1}-W${String(num - 52).padStart(2, '0')}`
  return `${year}-W${String(num).padStart(2, '0')}`
}

// ─── Types ───

interface NarrativeTopic {
  label: string
  query: string
  key_entities: string[]
  continued_thread_id?: string   // if continuing an existing narrative_thread
  previous_summary?: string      // previous week's summary for context
}

interface ActiveThread {
  id: string
  topic: string
  slug: string
  total_weeks: number
  key_entities: string[]
  latestSummary: string
  latestNextWeekWatch: string | null
}

interface NarrativeNode {
  id: string
  date: string
  title: string
  description: string
  significance: 'high' | 'medium' | 'low'
  factIds: string[]
  entityNames: string[]
  sourceUrl?: string
  isExternal?: boolean
  externalUrl?: string
  isPrediction?: boolean
  branchId: string
}

interface NarrativeBranch {
  id: string
  label: string
  side: 'left' | 'right'
  color: string
}

interface NarrativeEdge {
  id: string
  source: string
  target: string
  label?: string
}

interface StoredNarrative {
  topic: string
  summary: string
  branches: NarrativeBranch[]
  nodes: NarrativeNode[]
  edges: NarrativeEdge[]
}

// ─── Fact retrieval ───

async function getFactsByQuery(query: string, keywords: string[]): Promise<AtomicFact[]> {
  const allFacts: AtomicFact[] = []
  const seen = new Set<string>()

  // Tag search
  for (const kw of keywords.slice(0, 5)) {
    const { data } = await supabaseAdmin
      .from('atomic_facts').select('*')
      .in('verification_status', ['verified', 'partially_verified'])
      .contains('tags', [kw.toLowerCase()])
      .order('fact_date', { ascending: true }).limit(40)
    for (const f of (data ?? []) as AtomicFact[]) {
      if (!seen.has(f.id)) { seen.add(f.id); allFacts.push(f) }
    }
  }

  // Content search — sanitize query to prevent Supabase filter injection
  const safeQuery = query.replace(/[%_,.()\n\r]/g, ' ').trim()
  const { data: contentSearch } = await supabaseAdmin
    .from('atomic_facts').select('*')
    .in('verification_status', ['verified', 'partially_verified'])
    .or(`content_zh.ilike.%${safeQuery}%,content_en.ilike.%${safeQuery}%`)
    .order('fact_date', { ascending: true }).limit(30)
  for (const f of (contentSearch ?? []) as AtomicFact[]) {
    if (!seen.has(f.id)) { seen.add(f.id); allFacts.push(f) }
  }

  allFacts.sort((a, b) => new Date(a.fact_date).getTime() - new Date(b.fact_date).getTime())
  return allFacts
}

// ─── Step 1: Discover Top 3 topics ───

async function fetchActiveThreads(): Promise<ActiveThread[]> {
  const { data: threads } = await supabaseAdmin
    .from('narrative_threads')
    .select('id, topic, slug, total_weeks, key_entities')
    .eq('status', 'active')
    .order('last_updated_week', { ascending: false })
    .limit(10)

  if (!threads || threads.length === 0) return []

  const activeThreads: ActiveThread[] = []
  for (const t of threads) {
    // Fetch the latest entry for this thread
    const { data: entry } = await supabaseAdmin
      .from('narrative_thread_entries')
      .select('summary, next_week_watch')
      .eq('thread_id', t.id)
      .order('week_number', { ascending: false })
      .limit(1)
      .single()

    activeThreads.push({
      id: t.id,
      topic: t.topic,
      slug: t.slug,
      total_weeks: t.total_weeks,
      key_entities: t.key_entities ?? [],
      latestSummary: entry?.summary ?? '',
      latestNextWeekWatch: entry?.next_week_watch ?? null,
    })
  }
  return activeThreads
}

async function discoverTopics(weekNumber: string): Promise<NarrativeTopic[]> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: facts } = await supabaseAdmin
    .from('atomic_facts')
    .select('content_zh, content_en, tags, fact_date')
    .in('verification_status', ['verified', 'partially_verified'])
    .gte('fact_date', fourteenDaysAgo)
    .order('fact_date', { ascending: false })
    .limit(200)

  if (!facts || facts.length === 0) return []

  const factsText = facts.map((f: Record<string, unknown>, i: number) => {
    const content = (f.content_zh || f.content_en || '') as string
    const tags = (f.tags as string[])?.join(', ') ?? ''
    return `[${i}] ${content.slice(0, 200)} | tags: ${tags}`
  }).join('\n')

  // Fetch active threads for incremental continuity
  const activeThreads = await fetchActiveThreads()

  const activeThreadsSection = activeThreads.length > 0
    ? `## 当前活跃叙事线索（优先延续）
${activeThreads.map(t => `- 「${t.topic}」(已追踪 ${t.total_weeks} 周，ID: ${t.id}): ${t.latestSummary.slice(0, 150)}${t.latestNextWeekWatch ? `\n  下周关注: ${t.latestNextWeekWatch}` : ''}`).join('\n')}

`
    : ''

  const continuityInstruction = activeThreads.length > 0
    ? `5. 优先延续上面的活跃叙事线索（如果有新事实支持），也可以引入新线索替换不再活跃的
6. 对于延续的线索，continued_thread_id 必须填写对应的 ID；新线索留空`
    : ''

  const jsonExample = activeThreads.length > 0
    ? `[
  {
    "label": "叙事标题（中文）",
    "query": "用于检索事实的关键词（可中可英）",
    "key_entities": ["实体1", "实体2"],
    "continued_thread_id": "填写已有线索ID（如延续），或空字符串（如新线索）"
  }
]`
    : `[
  {
    "label": "叙事标题（中文）",
    "query": "用于检索事实的关键词（可中可英）",
    "key_entities": ["实体1", "实体2"]
  }
]`

  const rawTopics = await callHaikuJSON<Array<{
    label: string
    query: string
    key_entities: string[]
    continued_thread_id?: string
  }>>(
    `你是稳定币行业分析师。以下是本周的事实列表${activeThreads.length > 0 ? '和当前活跃的叙事线索' : ''}。

${activeThreadsSection}## 本周事实列表（共 ${facts.length} 条）
${factsText}

任务：选择本周最重要的 2-3 个叙事。

要求：
1. 输出 2-3 个叙事，按重要性排序（事实密度不足 3 条时，宁可输出 2 个而非硬凑）
2. 每个叙事要有足够的事实密度（至少 3 条相关事实）
3. 优先选择：监管进展、重大融资/IPO、产品发布、行业格局变化
4. 叙事之间不要重叠
${continuityInstruction}

输出严格 JSON 数组:
${jsonExample}`,
    { system: '输出严格 JSON 数组，2-3 个元素。' }
  )

  // Enrich topics with previous summary for continued threads
  const threadMap = new Map(activeThreads.map(t => [t.id, t]))
  return rawTopics.map(t => {
    const topic: NarrativeTopic = {
      label: t.label,
      query: t.query,
      key_entities: t.key_entities,
    }
    const threadId = t.continued_thread_id
    if (threadId && threadMap.has(threadId)) {
      const thread = threadMap.get(threadId)!
      topic.continued_thread_id = threadId
      topic.previous_summary = thread.latestSummary
    }
    return topic
  })
}

// ─── Step 2: Generate timeline from facts ───

interface AITimelineResult {
  summary: string
  branches: NarrativeBranch[]
  events: Array<{
    date: string; title: string; description: string
    significance: 'high' | 'medium' | 'low'
    source_indices: number[]; branch_id: string; entity_names: string[]
  }>
  connections: Array<{ from_event_index: number; to_event_index: number; label: string }>
  gap_queries: string[] // queries to fill timeline gaps
}

// Sanitize user-facing strings before interpolation into prompts
function sanitizeForPrompt(input: string, maxLen = 200): string {
  return input.replace(/[#\n\r`]/g, ' ').slice(0, maxLen).trim()
}

async function generateTimeline(topic: NarrativeTopic, facts: AtomicFact[]): Promise<AITimelineResult> {
  const factsText = facts.map((f, i) => {
    const date = String(f.fact_date).split('T')[0]
    const content = f.content_zh || f.content_en
    return `[${i}] ${date} | ${content} | tags: ${f.tags.join(', ')}`
  }).join('\n')

  const safeLabel = sanitizeForPrompt(topic.label)

  const previousContext = topic.previous_summary
    ? `## 上期叙事摘要（延续线索）
这是一个已追踪的叙事线索，以下是上一期的摘要，请在此基础上延续：
${topic.previous_summary}

请确保本期 summary 与上期衔接，体现叙事的发展和变化。

`
    : ''

  return callHaikuJSON<AITimelineResult>(
    `你是稳定币行业叙事分析师。为「${safeLabel}」生成结构化时间线。

${previousContext}## 相关性铁律（最重要）
只保留与「${safeLabel}」**直接相关**的事实：
- ✅ 直接提到该主题/实体/政策
- ✅ 是该主题因果链上的事件
- ❌ 仅仅因为在同一行业就算相关
- ❌ 不同实体的独立行动，与该主题无因果关系
如果只有 3 条真正相关，就只输出 3 个事件。**宁缺勿滥。**

## 事实列表（共 ${facts.length} 条）
${factsText}

## 输出要求
1. summary: 2-3 句概括（中文）${topic.previous_summary ? '，注意体现与上期的衔接和进展' : ''}
2. branches: 2-3 条分支（按实体/阵营分），每条: id, label, side (left/right), color
3. events: 按实际相关事实数量输出节点（不要硬凑），每个:
   - date (ISO), title (中文简短), description (中文1-2句)
   - significance: high/medium/low
   - source_indices: 引用的事实索引（必须指向真正使用的事实）
   - branch_id, entity_names
4. connections: 跨分支关联 (0-3条)
5. gap_queries: 2-4 个英文搜索词，用于搜索 fact base 中缺失的、能让时间线更完整的外部信息

规则:
- 中文输出，中英文之间加空格（如 "Circle 提交 S-1"）
- 按时间正序
- 合并同一天同一主题的事实
- 不做预测，不给主观评价

输出严格 JSON。`,
    { system: '稳定币行业叙事分析师。输出严格 JSON。' }
  )
}

// ─── Step 3: Search external and generate prediction nodes ───

interface ExternalAndPredictions {
  external_events: Array<{
    date: string; title: string; description: string
    branch_id: string; source_url: string
  }>
  predictions: Array<{
    title: string; description: string; branch_id: string
  }>
}

async function enrichWithExternal(
  topic: NarrativeTopic,
  gapQueries: string[],
  existingTitles: Set<string>,
  branches: NarrativeBranch[],
): Promise<ExternalAndPredictions> {
  // Search both Brave + Google for each gap query
  const allResults: Array<{ title: string; url: string; description: string; date: string | null }> = []
  for (const q of gapQueries) {
    const results = await searchWeb(q, 5)
    allResults.push(...results)
  }

  // Deduplicate against existing timeline titles
  const filtered = allResults.filter(r => {
    const titleLower = r.title.toLowerCase()
    for (const existing of existingTitles) {
      if (titleLower.includes(existing.toLowerCase()) || existing.toLowerCase().includes(titleLower)) return false
    }
    return true
  }).slice(0, 10) // cap at 10

  if (filtered.length === 0) {
    return { external_events: [], predictions: [] }
  }

  // Let AI select relevant ones and generate predictions
  const externalText = filtered.map((r, i) =>
    `[${i}] ${r.title} | ${r.description.slice(0, 150)} | url: ${r.url}${r.date ? ` | date: ${r.date}` : ''}`
  ).join('\n')

  const branchIds = branches.map(b => b.id)

  const safeLabel = sanitizeForPrompt(topic.label)
  return callHaikuJSON<ExternalAndPredictions>(
    `你是稳定币行业分析师。以下是关于「${safeLabel}」的外部搜索结果。

## 已有时间线分支
${branches.map(b => `- ${b.id}: ${b.label}`).join('\n')}

## 外部搜索结果
${externalText}

## 任务
1. 从搜索结果中选出 3-6 条与「${safeLabel}」直接相关的事件，作为 external_events
2. 基于整条时间线（fact base + 外部），生成 2-3 个**可证伪的具体预测**作为 predictions

## predictions 要求（重要）
predictions 必须是可以在未来验证对错的具体预测，不是模糊的"关注方向"。
- ✅ "Circle 将在 2026 年 Q2 完成 IPO" — 可证伪
- ✅ "GENIUS Act 将在 2026 年 6 月前通过参议院投票" — 可证伪
- ❌ "后续关注: Circle IPO 进展" — 这是 watchlist 不是预测
- ❌ "后续关注: 稳定币监管动态" — 太模糊

## 输出格式
{
  "external_events": [
    {
      "date": "2026-03-10",
      "title": "事件标题（中文简短）",
      "description": "1句话描述（中文）",
      "branch_id": "${branchIds[0] || 'branch_1'}",
      "source_url": "https://..."
    }
  ],
  "predictions": [
    {
      "title": "具体预测内容（中文）",
      "description": "预测依据（1句话中文）",
      "branch_id": "${branchIds[0] || 'branch_1'}"
    }
  ]
}

规则:
- external_events 必须有 source_url（从搜索结果的 url 中取）
- date: 如果搜索结果没有提供日期，使用当天日期并在 title 中标注"(日期估计)"
- branch_id 必须是已有分支之一: ${branchIds.join(', ')}
- 只选与主题直接相关的结果，不要硬凑
- 中文输出，中英文之间加空格`,
    { system: '输出严格 JSON。中英文之间加空格。' }
  )
}

// ─── Main SSE route ───

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const logger = await createPipelineLogger('narrative', send)
      send({ type: 'init', runId: logger.runId })

      const weekNumber = getCurrentWeekNumber()
      logger.log(`开始生成叙事时间线: ${weekNumber}`, 'info')

      try {
        // Step 1: Discover top 3 topics
        logger.progress('1/4', '发现本周 Top 3 热门叙事...')
        const topics = await discoverTopics(weekNumber)
        if (topics.length === 0) {
          logger.log('未发现热门叙事（事实不足）', 'error')
          await logger.fail('事实不足，无法生成叙事时间线')
          controller.close()
          return
        }
        for (const t of topics) {
          const contTag = t.continued_thread_id ? ' [延续]' : ' [新]'
          logger.log(`  叙事${contTag}: ${t.label} (${t.key_entities.join(', ')})`, 'info')
        }

        const narratives: StoredNarrative[] = []

        // Step 2-3: For each topic, generate timeline + enrich
        for (let ti = 0; ti < topics.length; ti++) {
          const topic = topics[ti]
          logger.progress(`${ti + 2}/4`, `生成时间线: ${topic.label}...`)

          // Get facts
          const keywords = [...topic.key_entities, ...topic.query.split(/\s+/)]
          const facts = await getFactsByQuery(topic.query, keywords)
          logger.log(`  找到 ${facts.length} 条相关事实`, 'info')

          if (facts.length < 2) {
            logger.log(`  事实不足，跳过`, 'info')
            continue
          }

          // Generate timeline from facts
          const timeline = await generateTimeline(topic, facts)
          if (!timeline?.events?.length) {
            logger.log(`  AI 未返回有效事件，跳过`, 'info')
            continue
          }
          const timelineBranches = timeline.branches ?? []
          logger.log(`  AI 生成 ${timeline.events.length} 个节点, ${timelineBranches.length} 个分支`, 'info')

          // Build internal nodes
          const nodes: NarrativeNode[] = []
          const edges: NarrativeEdge[] = []
          let nodeIdx = 0

          const existingTitles = new Set<string>()

          for (const event of timeline.events) {
            const factIds = (event.source_indices ?? [])
              .filter(i => i >= 0 && i < facts.length)
              .map(i => facts[i].id)
            const sourceUrl = factIds.length > 0
              ? facts[event.source_indices?.[0] ?? 0]?.source_url
              : undefined

            existingTitles.add(event.title)

            nodes.push({
              id: `node-${nodeIdx}`,
              date: event.date,
              title: event.title,
              description: event.description,
              significance: event.significance,
              factIds,
              entityNames: event.entity_names ?? [],
              sourceUrl: sourceUrl ?? undefined,
              branchId: event.branch_id,
            })
            nodeIdx++
          }

          // Sequential edges within branches
          const branchNodes = new Map<string, string[]>()
          for (const n of nodes) {
            const list = branchNodes.get(n.branchId) ?? []
            list.push(n.id)
            branchNodes.set(n.branchId, list)
          }
          let edgeIdx = 0
          for (const [, nodeIds] of branchNodes) {
            for (let i = 0; i < nodeIds.length - 1; i++) {
              edges.push({ id: `edge-${edgeIdx++}`, source: nodeIds[i], target: nodeIds[i + 1] })
            }
          }

          // Cross-branch connections
          for (const conn of timeline.connections ?? []) {
            const fromId = `node-${conn.from_event_index}`
            const toId = `node-${conn.to_event_index}`
            if (nodes.some(n => n.id === fromId) && nodes.some(n => n.id === toId)) {
              edges.push({ id: `cross-${edgeIdx++}`, source: fromId, target: toId, label: conn.label })
            }
          }

          // External search enrichment
          logger.log(`  搜索外部补充信息...`, 'info')
          const gapQueries = (timeline.gap_queries ?? []).filter(q => typeof q === 'string' && q.trim().length > 0)
          if (gapQueries.length > 0) {
            try {
              const enrichment = await enrichWithExternal(topic, gapQueries, existingTitles, timelineBranches)

              for (const ext of enrichment.external_events) {
                nodes.push({
                  id: `ext-${nodeIdx}`,
                  date: ext.date,
                  title: ext.title,
                  description: ext.description,
                  significance: 'low',
                  factIds: [],
                  entityNames: [],
                  isExternal: true,
                  externalUrl: ext.source_url,
                  branchId: ext.branch_id,
                })
                nodeIdx++
              }
              logger.log(`  添加 ${enrichment.external_events.length} 个外部节点`, 'info')

              // Prediction nodes
              for (const pred of enrichment.predictions) {
                nodes.push({
                  id: `pred-${nodeIdx}`,
                  date: new Date().toISOString().split('T')[0], // today
                  title: pred.title,
                  description: pred.description,
                  significance: 'medium',
                  factIds: [],
                  entityNames: [],
                  isPrediction: true,
                  branchId: pred.branch_id,
                })
                nodeIdx++
              }
              logger.log(`  添加 ${enrichment.predictions.length} 个关注方向`, 'info')
            } catch (err) {
              logger.log(`  外部搜索失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
            }
          }

          // Sort nodes by date
          nodes.sort((a, b) => {
            if (a.isPrediction && !b.isPrediction) return 1
            if (!a.isPrediction && b.isPrediction) return -1
            return a.date.localeCompare(b.date)
          })

          narratives.push({
            topic: topic.label,
            summary: timeline.summary,
            branches: timelineBranches,
            nodes,
            edges,
          })
        }

        // Step 4: Save to weekly_snapshots
        logger.progress('4/5', '保存叙事时间线到快照...')

        // Read existing snapshot and merge
        const { data: existing } = await supabaseAdmin
          .from('weekly_snapshots')
          .select('snapshot_data')
          .eq('week_number', weekNumber)
          .single()

        const snapshotData = (existing?.snapshot_data ?? {}) as Record<string, unknown>
        snapshotData.narratives = narratives

        const { error } = await supabaseAdmin
          .from('weekly_snapshots')
          .upsert({
            week_number: weekNumber,
            snapshot_data: snapshotData,
            generated_at: new Date().toISOString(),
          }, { onConflict: 'week_number' })

        if (error) throw new Error(`保存失败: ${error.message}`)

        logger.log(`已保存 ${narratives.length} 条叙事时间线`, 'success')

        // Step 5: Write to narrative_threads + narrative_thread_entries for cross-week tracking
        logger.progress('5/5', '持久化叙事线索...')

        for (let ni = 0; ni < narratives.length; ni++) {
          const narrative = narratives[ni]
          const correspondingTopic = topics[ni] as NarrativeTopic | undefined
          const slug = narrative.topic
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .slice(0, 60)

          // Collect all entity names from nodes
          const allEntities = [...new Set(narrative.nodes.flatMap(n => n.entityNames))]
          // Collect all fact IDs
          const allFactIds = [...new Set(narrative.nodes.flatMap(n => n.factIds).filter(Boolean))]
          // Key developments from high significance nodes
          const keyDevelopments = narrative.nodes
            .filter(n => n.significance === 'high' && !n.isPrediction && !n.isExternal)
            .map(n => n.title)
          // Next week watch from prediction nodes
          const nextWeekWatch = narrative.nodes
            .filter(n => n.isPrediction)
            .map(n => n.title)
            .join('；') || null

          try {
            let threadId = ''
            let isContinuation = false

            // Check if this topic is a continuation of an existing thread
            if (correspondingTopic?.continued_thread_id) {
              const { data: existingThread } = await supabaseAdmin
                .from('narrative_threads')
                .select('id, total_weeks')
                .eq('id', correspondingTopic.continued_thread_id)
                .single()

              if (existingThread) {
                threadId = existingThread.id
                isContinuation = true
                await supabaseAdmin
                  .from('narrative_threads')
                  .update({
                    topic: narrative.topic, // update topic label in case AI refined it
                    last_updated_week: weekNumber,
                    total_weeks: existingThread.total_weeks + 1,
                    key_entities: allEntities.slice(0, 10),
                    status: 'active',
                  })
                  .eq('id', threadId)
              }
            }

            // Fallback: slug-based matching (for threads not identified by AI but matching by slug)
            if (!isContinuation) {
              const { data: threadData } = await supabaseAdmin
                .from('narrative_threads')
                .select('id, total_weeks')
                .eq('slug', slug)
                .single()

              if (threadData) {
                // Update existing thread found by slug
                threadId = threadData.id
                isContinuation = true
                await supabaseAdmin
                  .from('narrative_threads')
                  .update({
                    last_updated_week: weekNumber,
                    total_weeks: threadData.total_weeks + 1,
                    key_entities: allEntities.slice(0, 10),
                    status: 'active',
                  })
                  .eq('id', threadId)
              } else {
                // Insert new thread
                const { data: newThread } = await supabaseAdmin
                  .from('narrative_threads')
                  .insert({
                    topic: narrative.topic,
                    slug,
                    status: 'active',
                    first_seen_week: weekNumber,
                    last_updated_week: weekNumber,
                    total_weeks: 1,
                    key_entities: allEntities.slice(0, 10),
                    tags: allEntities.map(e => e.toLowerCase()).slice(0, 10),
                  })
                  .select('id')
                  .single()
                threadId = newThread?.id ?? ''
              }
            }

            if (threadId) {
              // Upsert entry for this week
              await supabaseAdmin
                .from('narrative_thread_entries')
                .upsert({
                  thread_id: threadId,
                  week_number: weekNumber,
                  summary: narrative.summary,
                  key_developments: keyDevelopments,
                  next_week_watch: nextWeekWatch,
                  fact_ids: allFactIds,
                  node_count: narrative.nodes.filter(n => !n.isPrediction).length,
                  significance: narrative.nodes.some(n => n.significance === 'high') ? 'high' : 'medium',
                }, { onConflict: 'thread_id,week_number' })
            }

            logger.log(`  线索持久化: ${narrative.topic} (${isContinuation ? '延续' : '新建'})`, 'info')
          } catch (threadErr) {
            logger.log(`  线索持久化失败: ${narrative.topic} — ${threadErr instanceof Error ? threadErr.message : String(threadErr)}`, 'error')
          }
        }

        // Write prediction nodes to narrative_predictions table (Direction B)
        for (const narrative of narratives) {
          const predNodes = narrative.nodes.filter(n => n.isPrediction)
          for (const pred of predNodes) {
            try {
              await supabaseAdmin
                .from('narrative_predictions')
                .insert({
                  narrative_topic: narrative.topic,
                  week_number: weekNumber,
                  title: pred.title,
                  description: pred.description,
                  watched: false,
                  status: 'pending',
                })
              logger.log(`  预测写入: ${pred.title.slice(0, 40)}...`, 'info')
            } catch { /* ignore duplicates */ }
          }
        }

        // Auto-review previous week's predictions against this week's facts
        const prevWeek = shiftWeekStr(weekNumber, -1)
        try {
          const { data: prevPredictions } = await supabaseAdmin
            .from('narrative_predictions')
            .select('*')
            .eq('week_number', prevWeek)
            .eq('status', 'pending')

          if (prevPredictions && prevPredictions.length > 0) {
            // Get this week's fact summaries for review context
            const thisWeekFactSummary = narratives.map(n => n.summary).join(' ')

            for (const pred of prevPredictions) {
              // Simple keyword match to determine if prediction materialized
              const keywords = pred.title.replace(/^后续关注[：:]\s*/, '').split(/[，、\s]+/).filter(Boolean)
              const matched = keywords.some((kw: string) => thisWeekFactSummary.includes(kw))

              await supabaseAdmin
                .from('narrative_predictions')
                .update({
                  status: matched ? 'confirmed' : 'ongoing',
                  review_note: matched ? `本周叙事中出现相关进展` : '尚未观察到明确进展',
                  reviewed_week: weekNumber,
                })
                .eq('id', pred.id)
            }
            logger.log(`  自动回顾上周 ${prevPredictions.length} 条预测`, 'info')
          }
        } catch { /* ignore */ }

        // Mark threads not updated this week as dormant (if last updated > 3 weeks ago)
        try {
          const threeWeeksAgo = shiftWeekStr(weekNumber, -3)
          await supabaseAdmin
            .from('narrative_threads')
            .update({ status: 'dormant' })
            .eq('status', 'active')
            .lt('last_updated_week', threeWeeksAgo)
          logger.log('  已标记休眠线索', 'info')
        } catch { /* ignore */ }

        await logger.done({ message: `叙事时间线生成完成: ${narratives.map(n => n.topic).join(', ')}` })
      } catch (err) {
        await logger.fail(`叙事生成失败: ${err instanceof Error ? err.message : String(err)}`)
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
