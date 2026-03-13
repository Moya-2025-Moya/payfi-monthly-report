// SSE streaming endpoint for snapshot generation — V11
// Pipeline: stats → contradiction → AI select → context engine → save → email
// AI boundary: 零意见 — 结构化事实对比允许，预测/评价禁止
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import { createPipelineLogger } from '@/lib/pipeline-logger'
import { generateEmailHTML, weekToDateRange, weekToMondayDate } from '@/lib/email-template'
import { saveCheckpoint, loadCheckpoint, clearCheckpoints } from '@/lib/pipeline-checkpoint'
import { saveWeeklySnapshot } from '@/lib/weekly-data'
import { generateFactContext } from '@/lib/context-engine'
import { adversarialCheck } from '@/lib/adversarial-check'
import { growKnowledgeBase } from '@/lib/knowledge-growth'
import { verifyAdminToken } from '@/lib/admin-auth'
import { shiftWeek } from '@/lib/week-utils'
import type { EmailData, NarrativeForEmail, SignalItem, BriefItem } from '@/lib/email-template'

export const maxDuration = 120

const PIPELINE_NAME = 'snapshot'

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const logger = await createPipelineLogger('snapshot', send)
      send({ type: 'init', runId: logger.runId })

      const weekNumber = getCurrentWeekNumber()

      // --- Load checkpoint ---
      const checkpoint = await loadCheckpoint(PIPELINE_NAME, weekNumber)
      const resumeStep = checkpoint?.step ?? 0
      const cpData = checkpoint?.data ?? {}

      if (resumeStep > 0) {
        logger.log(`从检查点恢复: 步骤 ${resumeStep}`, 'info')
        send({ type: 'resume', fromStep: resumeStep })
      }

      logger.log(`开始生成周报快照: ${weekNumber}`, 'info')

      try {
        // --- Intermediate state ---
        let totalFacts: number = (cpData.totalFacts as number) ?? 0
        let highCount: number = (cpData.highCount as number) ?? 0
        let mediumCount: number = (cpData.mediumCount as number) ?? 0
        let lowCount: number = (cpData.lowCount as number) ?? 0
        let rejectedCount: number = (cpData.rejectedCount as number) ?? 0
        let crossWeekConflicts: number = (cpData.crossWeekConflicts as number) ?? 0
        let weeklySummaryDetailed: string | null = (cpData.weeklySummaryDetailed as string) ?? null

        // Step 1: Count facts + confidence
        if (resumeStep < 1) {
          logger.progress('1/5', '统计本周事实数据...')
          const [{ count: total }, { count: hc }, { count: mc }, { count: lc }, { count: rc }] = await Promise.all([
            supabaseAdmin.from('atomic_facts').select('id', { count: 'exact', head: true }).eq('week_number', weekNumber),
            supabaseAdmin.from('atomic_facts').select('id', { count: 'exact', head: true }).eq('week_number', weekNumber).eq('confidence', 'high'),
            supabaseAdmin.from('atomic_facts').select('id', { count: 'exact', head: true }).eq('week_number', weekNumber).eq('confidence', 'medium'),
            supabaseAdmin.from('atomic_facts').select('id', { count: 'exact', head: true }).eq('week_number', weekNumber).eq('confidence', 'low'),
            supabaseAdmin.from('atomic_facts').select('id', { count: 'exact', head: true }).eq('week_number', weekNumber).eq('verification_status', 'rejected'),
          ])
          totalFacts = total ?? 0
          highCount = hc ?? 0
          mediumCount = mc ?? 0
          lowCount = lc ?? 0
          rejectedCount = rc ?? 0
          logger.log(`  事实: ${totalFacts} (高${highCount} 中${mediumCount} 低${lowCount} 拒${rejectedCount})`, 'info')

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 1, step_name: '统计事实',
            data: { totalFacts, highCount, mediumCount, lowCount, rejectedCount },
          })
        }

        // Step 2: Cross-week contradiction detection
        if (resumeStep < 2) {
          logger.progress('2/5', '跨周矛盾检测...')
          try {
            const { data: thisWeekFacts } = await supabaseAdmin
              .from('atomic_facts')
              .select('id, content_zh, content_en, tags, fact_date, metric_value, metric_unit, metric_name, v5_result')
              .eq('week_number', weekNumber)
              .in('verification_status', ['verified', 'partially_verified'])
              .limit(100)

            const weekMatch = weekNumber.match(/^(\d{4})-W(\d{2})$/)
            if (thisWeekFacts && thisWeekFacts.length > 0 && weekMatch) {
              const year = parseInt(weekMatch[1], 10)
              const week = parseInt(weekMatch[2], 10)
              const jan4 = new Date(Date.UTC(year, 0, 4))
              const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
              const thisMonday = new Date(jan4)
              thisMonday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (week - 1) * 7)
              const startOfThisWeekDate = thisMonday.toISOString().split('T')[0]
              const fourWeeksBack = new Date(thisMonday)
              fourWeeksBack.setUTCDate(fourWeeksBack.getUTCDate() - 28)
              const fourWeeksAgoDate = fourWeeksBack.toISOString().split('T')[0]

              const { data: historicalFacts } = await supabaseAdmin
                .from('atomic_facts')
                .select('id, content_zh, content_en, tags, fact_date, metric_value, metric_unit, metric_name, week_number')
                .in('verification_status', ['verified', 'partially_verified'])
                .lt('fact_date', startOfThisWeekDate)
                .gte('fact_date', fourWeeksAgoDate)
                .limit(200)

              if (historicalFacts && historicalFacts.length > 0) {
                const historicalByTag = new Map<string, typeof historicalFacts>()
                for (const hf of historicalFacts) {
                  for (const tag of (hf.tags as string[]) ?? []) {
                    const tagLower = tag.toLowerCase()
                    if (!historicalByTag.has(tagLower)) historicalByTag.set(tagLower, [])
                    historicalByTag.get(tagLower)!.push(hf)
                  }
                }

                const pairsToCheck: Array<{ newFact: (typeof thisWeekFacts)[number]; overlapping: typeof historicalFacts }> = []
                for (const nf of thisWeekFacts) {
                  const overlapping = new Map<string, (typeof historicalFacts)[number]>()
                  for (const tag of (nf.tags as string[]) ?? []) {
                    const matches = historicalByTag.get(tag.toLowerCase())
                    if (matches) { for (const m of matches) overlapping.set(m.id, m) }
                  }
                  if (overlapping.size > 0) pairsToCheck.push({ newFact: nf, overlapping: [...overlapping.values()] })
                }

                for (let b = 0; b < pairsToCheck.length; b += 5) {
                  const batch = pairsToCheck.slice(b, b + 5)
                  const batchInput = batch.map((pair, i) => {
                    const newContent = pair.newFact.content_zh || pair.newFact.content_en
                    const historicalContent = pair.overlapping.slice(0, 5)
                      .map((h, j) => `  H${j}: ${h.content_zh || h.content_en} (${String(h.fact_date).split('T')[0]})`)
                      .join('\n')
                    return `[${i}] NEW: ${newContent} (${String(pair.newFact.fact_date).split('T')[0]})\nHISTORICAL:\n${historicalContent}`
                  }).join('\n\n')

                  try {
                    const result = await callHaikuJSON<{
                      contradictions: Array<{ index: number; has_contradiction: boolean; detail: string | null }>
                    }>(
                      `检测以下新事实与历史事实之间是否存在真正的矛盾。仅标记真正矛盾（前后说法不一致、数字报道不一致），不标记正常变化。
输出 JSON: { "contradictions": [{ "index": 0, "has_contradiction": false, "detail": null }] }

${batchInput}`,
                      { system: '稳定币分析师。输出严格JSON。仅标记真正矛盾。', maxTokens: 1500 }
                    )
                    for (const c of result.contradictions ?? []) {
                      if (c.has_contradiction && c.detail && c.index >= 0 && c.index < batch.length) {
                        const factId = batch[c.index].newFact.id
                        const existingV5 = batch[c.index].newFact.v5_result as { temporal_status?: string } | null
                        if (!existingV5 || existingV5.temporal_status !== 'conflict') {
                          await supabaseAdmin.from('atomic_facts').update({
                            v5_result: { temporal_status: 'conflict', conflict_detail: c.detail },
                          }).eq('id', factId)
                          crossWeekConflicts++
                        }
                      }
                    }
                  } catch (err) {
                    logger.log(`  矛盾检测批次失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
                  }
                }
              }
            }
            logger.log(`  矛盾检测完成: ${crossWeekConflicts} 个`, crossWeekConflicts > 0 ? 'success' : 'info')
          } catch (err) {
            logger.log(`  矛盾检测失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
          }

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 2, step_name: '矛盾检测',
            data: { totalFacts, highCount, mediumCount, lowCount, rejectedCount, crossWeekConflicts },
          })
        }

        // Step 3: Read narrative timeline data + AI one_liner/signals + Context Engine
        if (resumeStep < 3) {
          logger.progress('3/5', '读取叙事 + AI 信号 + 上下文引擎...')
          try {
            const { data: topFacts } = await supabaseAdmin
              .from('atomic_facts')
              .select('id, content_zh, content_en, fact_type, tags, fact_date, source_url')
              .eq('week_number', weekNumber)
              .in('verification_status', ['verified', 'partially_verified'])
              .order('fact_date', { ascending: false })
              .limit(60)

            if (topFacts && topFacts.length > 0) {
              // Read stored narratives from Narrative Pipeline (already in snapshot_data)
              const { data: existingSnapshot } = await supabaseAdmin
                .from('weekly_snapshots')
                .select('snapshot_data')
                .eq('week_number', weekNumber)
                .single()

              interface StoredNode {
                id: string; date: string; title: string; description: string
                significance: 'high' | 'medium' | 'low'
                factIds: string[]; entityNames: string[]
                sourceUrl?: string; isExternal?: boolean; externalUrl?: string
                isPrediction?: boolean; isConfirmedEvent?: boolean; branchId: string
              }
              interface StoredNarrative {
                topic: string; summary: string
                nodes: StoredNode[]
                branches: Array<{ id: string; label: string; side: string; color: string }>
                edges: Array<{ id: string; source: string; target: string; label?: string }>
              }

              const storedNarratives = ((existingSnapshot?.snapshot_data as Record<string, unknown>)?.narratives ?? []) as StoredNarrative[]
              const hasRichNarratives = storedNarratives.length > 0 && storedNarratives[0]?.nodes?.length > 0

              logger.log(`  叙事数据: ${hasRichNarratives ? `${storedNarratives.length} 条 (来自 Narrative Pipeline)` : '无，将使用 AI 生成'}`, 'info')

              // Fetch thread week counts
              const { data: activeThreads } = await supabaseAdmin
                .from('narrative_threads')
                .select('topic, total_weeks')
                .in('status', ['active', 'dormant'])
                .order('last_updated_week', { ascending: false })
                .limit(10)
              const weekCountMap = new Map((activeThreads ?? []).map(t => [t.topic, t.total_weeks as number]))

              // Generate one_liner, market_line, signals via AI (narratives come from stored data)
              const factsText = topFacts
                .map((f, i) => `[${i}] [${f.fact_type}] ${f.content_zh || f.content_en} (${String(f.fact_date).split('T')[0]}) [tags: ${f.tags.join(', ')}]${f.source_url ? ` [url: ${f.source_url}]` : ''}`)
                .join('\n')

              const narrativeSummaries = hasRichNarratives
                ? storedNarratives.map(n => `「${n.topic}」: ${n.summary}`).join('\n')
                : ''

              const selectionResult = await callHaikuJSON<{
                one_liner: string
                market_line?: string
                signals: Array<{
                  category: 'market_structure' | 'product' | 'onchain_data' | 'regulatory' | 'funding'
                  text: string
                  fact_index: number
                }>
                briefs: Array<{
                  text: string
                  fact_index: number
                }>
              }>(
                `你是稳定币行业事实聚合工具。从以下本周事实中选取周报摘要、信号和快讯。

${narrativeSummaries ? `本周叙事（已由专门系统生成）:\n${narrativeSummaries}\n` : ''}
任务:
1. one_liner: 一句话概括本周（纯事实，如 "Circle S-1 修订提交; GENIUS Act 过委员会"）${narrativeSummaries ? '，参考上方叙事摘要' : ''}
2. market_line: 市值数据行（如 "USDC $60.2B (+2.1%) · USDT $144.1B (+0.8%)"），如果本周有市值数据
3. signals: 5 条独立事实信号，按 category 分类（不要与叙事重叠）
4. briefs: 5-10 条零散快讯，覆盖信号和叙事未涵盖的其他有价值事实，一句话概括

信号字段:
- category: "market_structure" | "product" | "onchain_data" | "regulatory" | "funding"
- text: 一行事实描述，含量化数据
- fact_index: 来源事实编号

快讯字段:
- text: 一句话事实（不要与 signals 或叙事重叠）
- fact_index: 来源事实编号

绝对规则: 不做预测、不做评价、中英文之间加空格

输出严格 JSON:
{ "one_liner": "...", "market_line": "...", "signals": [...], "briefs": [...] }

本周事实 (共 ${topFacts.length} 条):
${factsText}`,
                { system: '稳定币事实聚合工具。输出严格JSON。不做预测不做评价。signals 5条，briefs 5-10条。', maxTokens: 3000 }
              )

              logger.log(`  AI 选取完成: ${selectionResult.signals?.length ?? 0} 信号, ${selectionResult.briefs?.length ?? 0} 快讯`, 'success')

              // Build v13 narratives from stored rich data
              interface V13Event {
                date: string; title: string; description: string
                significance: 'high' | 'medium' | 'low'
                isExternal?: boolean; externalUrl?: string; sourceUrl?: string
              }
              interface V13Upcoming {
                date: string; title: string; description: string
                type: 'confirmed' | 'prediction'; source?: string
              }
              interface V13Narrative {
                topic: string; summary: string; weekCount?: number
                events: V13Event[]; upcoming: V13Upcoming[]
                context?: Array<{ event: string; detail: string; current_entity?: string; current_value?: string; delta_label?: string }>
                facts?: Array<{ content: string; date: string; tags?: string[]; source_url?: string }>
                last_week?: string; origin?: string
              }

              const v13Narratives: V13Narrative[] = []

              // Fetch previous week's narrative summaries from narrative_thread_entries (canonical source)
              const prevWeek = shiftWeek(weekNumber, -1)
              const prevNarrativeMap = new Map<string, string>()
              try {
                const { data: prevEntries } = await supabaseAdmin
                  .from('narrative_thread_entries')
                  .select('thread_id, summary')
                  .eq('week_number', prevWeek)
                if (prevEntries && prevEntries.length > 0) {
                  // Map thread_id → topic via narrative_threads
                  const threadIds = prevEntries.map(e => e.thread_id)
                  const { data: threadTopics } = await supabaseAdmin
                    .from('narrative_threads')
                    .select('id, topic')
                    .in('id', threadIds)
                  if (threadTopics) {
                    const topicMap = new Map(threadTopics.map(t => [t.id, t.topic]))
                    for (const e of prevEntries) {
                      const topic = topicMap.get(e.thread_id)
                      if (topic && e.summary) prevNarrativeMap.set(topic, e.summary)
                    }
                  }
                }
              } catch (err) {
                logger.log(`  上周叙事查询跳过 (${prevWeek}): ${err instanceof Error ? err.message : 'no data'}`, 'info')
              }

              // Fetch narrative thread origins (first entry summary) for multi-week narratives
              const originMap = new Map<string, string>()
              try {
                const { data: threads } = await supabaseAdmin
                  .from('narrative_threads')
                  .select('id, topic, first_seen_week, total_weeks')
                  .in('status', ['active', 'dormant'])
                  .gt('total_weeks', 1)
                  .limit(10)
                if (threads && threads.length > 0) {
                  const threadIds = threads.map(t => t.id)
                  const { data: firstEntries } = await supabaseAdmin
                    .from('narrative_thread_entries')
                    .select('thread_id, summary, week_number')
                    .in('thread_id', threadIds)
                    .order('week_number', { ascending: true })
                  if (firstEntries) {
                    // Group by thread_id, take the earliest entry
                    const firstByThread = new Map<string, string>()
                    for (const e of firstEntries) {
                      if (!firstByThread.has(e.thread_id)) firstByThread.set(e.thread_id, e.summary)
                    }
                    for (const t of threads) {
                      const origin = firstByThread.get(t.id)
                      if (origin) originMap.set(t.topic, origin)
                    }
                  }
                }
              } catch {
                // Thread origins unavailable — skip
              }

              if (hasRichNarratives) {
                // Context Engine on each narrative
                logger.log('  上下文引擎启动...', 'info')

                for (const sn of storedNarratives.slice(0, 3)) {
                  // Split nodes into timeline events vs forward-looking
                  const timelineEvents: V13Event[] = []
                  const upcoming: V13Upcoming[] = []

                  for (const node of sn.nodes) {
                    if (node.isPrediction) {
                      upcoming.push({
                        date: node.date, title: node.title, description: node.description,
                        type: 'prediction',
                      })
                    } else if (node.isConfirmedEvent) {
                      upcoming.push({
                        date: node.date, title: node.title, description: node.description,
                        type: 'confirmed', source: node.sourceUrl,
                      })
                    } else {
                      timelineEvents.push({
                        date: node.date, title: node.title, description: node.description,
                        significance: node.significance,
                        isExternal: node.isExternal, externalUrl: node.externalUrl,
                        sourceUrl: node.sourceUrl,
                      })
                    }
                  }

                  // Collect fact details for this narrative
                  const factIds = sn.nodes.flatMap(n => n.factIds).filter(Boolean)
                  const narrativeFacts = factIds.length > 0
                    ? topFacts.filter(f => factIds.includes(f.id)).map(f => ({
                        content: f.content_zh || f.content_en,
                        date: String(f.fact_date).split('T')[0],
                        tags: f.tags as string[],
                        source_url: f.source_url,
                      }))
                    : []

                  // Context engine on narrative summary
                  const highNodes = sn.nodes.filter(n => n.significance === 'high' && !n.isPrediction && !n.isConfirmedEvent)
                  const ctxInput = highNodes.length > 0 ? highNodes.map(n => n.title).join('; ') : sn.summary
                  const ctxTags = [...new Set(sn.nodes.flatMap(n => n.entityNames).filter(Boolean))]

                  let contextItems: Array<{ event: string; detail: string; current_entity?: string; current_value?: string; delta_label?: string }> | undefined
                  try {
                    const ctxResult = await generateFactContext({
                      content: ctxInput,
                      tags: ctxTags.slice(0, 5),
                      fact_date: new Date().toISOString().split('T')[0],
                    })
                    if (ctxResult.comparisons.length > 0) {
                      contextItems = ctxResult.comparisons.map(c => ({
                        event: c.reference_event,
                        detail: `${c.metric_label} ${c.metric_value} (${c.date_range})`,
                        current_entity: c.current_entity,
                        current_value: c.current_value,
                        delta_label: c.delta_label,
                      }))
                      logger.log(`    "${sn.topic}" → ${ctxResult.comparisons.length} 条上下文`, 'success')
                    } else {
                      logger.log(`    "${sn.topic}" → 无上下文候选`, 'info')
                    }
                  } catch {
                    logger.log(`    "${sn.topic}" → 上下文生成失败`, 'info')
                  }

                  v13Narratives.push({
                    topic: sn.topic,
                    summary: sn.summary,
                    weekCount: weekCountMap.get(sn.topic) ?? 1,
                    events: timelineEvents,
                    upcoming,
                    context: contextItems,
                    facts: narrativeFacts,
                    last_week: prevNarrativeMap.get(sn.topic),
                    origin: originMap.get(sn.topic),
                  })
                }
              }

              // Signals with context
              const signalsWithContext: (SignalItem & { source_url?: string })[] = []
              for (const s of (selectionResult.signals ?? []).slice(0, 5)) {
                const factRef = s.fact_index != null && s.fact_index >= 0 && s.fact_index < topFacts.length ? topFacts[s.fact_index] : null
                const factTags = factRef ? (factRef.tags as string[]) : []
                const factDate = factRef ? String(factRef.fact_date).split('T')[0] : new Date().toISOString().split('T')[0]

                const ctxResult = await generateFactContext({
                  content: s.text,
                  tags: factTags,
                  fact_date: factDate,
                })

                const firstComp = ctxResult.comparisons[0]
                signalsWithContext.push({
                  category: s.category,
                  text: s.text,
                  context: ctxResult.context_lines[0],
                  structured_context: firstComp ? {
                    event: firstComp.reference_event,
                    detail: `${firstComp.metric_label} ${firstComp.metric_value} (${firstComp.date_range})`,
                    current_entity: firstComp.current_entity,
                    current_value: firstComp.current_value,
                    delta_label: firstComp.delta_label,
                  } : undefined,
                  source_url: factRef?.source_url ?? undefined,
                })
              }

              logger.log(`  上下文引擎完成`, 'success')

              // Adversarial validation
              logger.log('  对抗验证...', 'info')
              try {
                const fieldsToCheck = [
                  { name: 'one_liner', value: selectionResult.one_liner },
                  ...v13Narratives.map((n, i) => ({ name: `narrative_${i}_summary`, value: n.summary })),
                ]
                const checks = await adversarialCheck(fieldsToCheck)
                let violations = 0
                for (const check of checks) {
                  if (check.violation && check.cleaned) {
                    violations++
                    if (check.field === 'one_liner') {
                      selectionResult.one_liner = check.cleaned
                    } else {
                      const match = check.field.match(/^narrative_(\d+)_summary$/)
                      if (match) {
                        const idx = parseInt(match[1])
                        if (v13Narratives[idx]) {
                          v13Narratives[idx].summary = check.cleaned
                        }
                      }
                    }
                    logger.log(`    ${check.field}: ${check.violation} → 已重写`, 'info')
                  }
                }
                logger.log(`  对抗验证完成: ${violations} 条违规已修正`, violations > 0 ? 'success' : 'info')
              } catch (err) {
                logger.log(`  对抗验证跳过: ${err instanceof Error ? err.message : String(err)}`, 'info')
              }

              // Build briefs with dates from source facts
              const briefItems: BriefItem[] = (selectionResult.briefs ?? []).slice(0, 10).map(b => {
                const factRef = b.fact_index != null && b.fact_index >= 0 && b.fact_index < topFacts.length ? topFacts[b.fact_index] : null
                return {
                  text: b.text,
                  date: factRef ? String(factRef.fact_date).split('T')[0].slice(5) : undefined, // MM-DD
                }
              })

              // Assemble V15 format
              weeklySummaryDetailed = JSON.stringify({
                version: 'v15',
                oneLiner: selectionResult.one_liner,
                marketLine: selectionResult.market_line,
                narratives: v13Narratives,
                signals: signalsWithContext,
                briefs: briefItems,
                sourceCount: new Set(topFacts.map((f: { source_url?: string }) => f.source_url).filter(Boolean)).size || totalFacts,
              })

              logger.log(`  V13 周报数据组装完成`, 'success')
            } else {
              logger.log('  本周无事实，跳过', 'info')
            }
          } catch (err) {
            logger.log(`  AI 选取/上下文失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
          }

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 3, step_name: 'AI 选取+上下文',
            data: { totalFacts, highCount, mediumCount, lowCount, rejectedCount, crossWeekConflicts, weeklySummaryDetailed },
          })
        }

        // Step 4: Save snapshot
        if (resumeStep < 4) {
          logger.progress('4/5', '保存快照到数据库...')

          await saveWeeklySnapshot(weekNumber, {
            total_facts: totalFacts,
            new_facts: totalFacts,
            high_confidence: highCount,
            medium_confidence: mediumCount,
            low_confidence: lowCount,
            rejected: rejectedCount,
            new_entities: 0,
            active_entities: 0,
            new_contradictions: crossWeekConflicts,
            resolved_contradictions: 0,
            blind_spot_changes: [],
            top_density_anomalies: [],
            weekly_summary: null,
            weekly_summary_detailed: weeklySummaryDetailed,
          })

          logger.log(`快照已保存: ${weekNumber}`, 'success')

          // Phase 2E: Self-growing knowledge base
          try {
            const kbAdded = await growKnowledgeBase(weekNumber)
            if (kbAdded > 0) {
              logger.log(`  知识库自增长: +${kbAdded} 条参考事件`, 'success')
            }
          } catch (err) {
            logger.log(`  知识库增长跳过: ${err instanceof Error ? err.message : String(err)}`, 'info')
          }

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 4, step_name: '保存快照',
            data: { totalFacts, highCount, mediumCount, lowCount, rejectedCount, crossWeekConflicts, weeklySummaryDetailed },
          })
        }

        // Step 5: Generate email report
        if (resumeStep < 5) {
          logger.progress('5/5', '生成邮件报告...')

          try {
            if (weeklySummaryDetailed) {
              const parsed = JSON.parse(weeklySummaryDetailed)
              const emailData: EmailData = {
                weekLabel: weekToDateRange(weekNumber),
                marketLine: parsed.marketLine,
                oneLiner: parsed.oneLiner ?? '',
                narratives: (parsed.narratives ?? []).slice(0, 3).map((n: { topic: string; summary: string; weekCount?: number; upcoming?: Array<{ date: string; title: string }>; events?: Array<{ title: string; description?: string; significance?: string }>; context?: Array<{ event: string; detail: string; current_entity?: string; current_value?: string; delta_label?: string }>; last_week?: string; origin?: string }) => {
                  // Transform V13Narrative → NarrativeForEmail
                  const upcoming = (n.upcoming ?? [])
                  const nextWatch = upcoming.length > 0
                    ? upcoming.map(u => `${u.date}: ${u.title}`).join('; ')
                    : undefined
                  // Extract this_week from highest-significance event title (specific fact),
                  // NOT the AI summary (which is a generic narrative overview)
                  const events = n.events ?? []
                  const highEvent = events.find(e => e.significance === 'high')
                  const thisWeekText = highEvent
                    ? highEvent.title + (highEvent.description && highEvent.description !== highEvent.title ? ` — ${highEvent.description}` : '')
                    : n.summary  // fallback to summary only if no high-significance event

                  return {
                    topic: n.topic,
                    weekCount: n.weekCount,
                    origin: n.origin,
                    last_week: n.last_week,
                    this_week: thisWeekText,
                    next_week_watch: nextWatch,
                    context: n.context,
                  } as NarrativeForEmail
                }),
                signals: (parsed.signals ?? []).slice(0, 8).map((s: SignalItem & { source_url?: string }) => ({
                  category: s.category,
                  text: s.text,
                  context: s.context,
                  structured_context: s.structured_context,
                  source_url: s.source_url,
                })),
                briefs: (parsed.briefs ?? []).slice(0, 10) as BriefItem[],
                stats: {
                  factCount: totalFacts,
                  verifiedCount: highCount + mediumCount,
                  sourceCount: parsed.sourceCount ?? totalFacts,
                },
              }

              const emailHTML = generateEmailHTML(emailData)
              const reportDate = weekToMondayDate(weekNumber)

              const { error: reportError } = await supabaseAdmin
                .from('reports')
                .upsert({
                  date: reportDate,
                  subject: `StablePulse | ${weekToDateRange(weekNumber)}`,
                  content: emailHTML,
                }, { onConflict: 'date' })

              if (reportError) {
                logger.log(`  邮件报告写入失败: ${reportError.message}`, 'error')
              } else {
                logger.log(`  邮件报告已写入: ${reportDate}`, 'success')
              }
            } else {
              logger.log('  无数据，跳过邮件生成', 'info')
            }
          } catch (err) {
            logger.log(`  邮件生成失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
          }
        }

        await clearCheckpoints(PIPELINE_NAME, weekNumber)
        logger.log('检查点已清除', 'info')
        await logger.done({ message: '周报快照生成完成' })
      } catch (err) {
        await logger.fail(`快照生成失败: ${err instanceof Error ? err.message : String(err)}`)
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
