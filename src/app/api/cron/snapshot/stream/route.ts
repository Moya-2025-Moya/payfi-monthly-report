// SSE streaming endpoint for snapshot generation with detailed progress
// Logs are persisted to pipeline_runs for page refresh recovery
// Supports checkpoint+resume: saves progress after each major step
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { getDensityAnomalies } from '@/modules/knowledge/density'
import { callHaikuJSON } from '@/lib/ai-client'
import { createPipelineLogger } from '@/lib/pipeline-logger'
import { generateEmailHTML, weekToDateRange, weekToMondayDate } from '@/lib/email-template'
import { saveCheckpoint, loadCheckpoint, clearCheckpoints } from '@/lib/pipeline-checkpoint'
import { saveWeeklySnapshot } from '@/lib/weekly-data'

export const maxDuration = 120

const PIPELINE_NAME = 'snapshot'

export async function GET() {
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
        logger.log(`从检查点恢复: 步骤 ${resumeStep} (${checkpoint!.step_name}) 已完成，继续后续步骤`, 'info')
        send({ type: 'resume', fromStep: resumeStep, stepName: checkpoint!.step_name })
      } else {
        send({ type: 'fresh_start' })
      }

      logger.log(`开始生成周报快照: ${weekNumber}`, 'info')

      try {
        // --- Intermediate state variables (restored from checkpoint or computed) ---
        let totalFacts: number = (cpData.totalFacts as number) ?? 0
        let highCount: number = (cpData.highCount as number) ?? 0
        let mediumCount: number = (cpData.mediumCount as number) ?? 0
        let lowCount: number = (cpData.lowCount as number) ?? 0
        let rejectedCount: number = (cpData.rejectedCount as number) ?? 0
        let newEntities: number = (cpData.newEntities as number) ?? 0
        let activeEntities: number = (cpData.activeEntities as number) ?? 0
        let crossWeekConflicts: number = (cpData.crossWeekConflicts as number) ?? 0
        let topAnomalies: string[] = (cpData.topAnomalies as string[]) ?? []
        let weeklySummarySimple: string | null = (cpData.weeklySummarySimple as string) ?? null
        let weeklySummaryDetailed: string | null = (cpData.weeklySummaryDetailed as string) ?? null

        // Step 1: Count facts
        if (resumeStep < 1) {
          logger.progress('1/8', '统计本周事实数据...')
          const { count } = await supabaseAdmin
            .from('atomic_facts')
            .select('id', { count: 'exact', head: true })
            .eq('week_number', weekNumber)
          totalFacts = count ?? 0
          logger.log(`  总事实数: ${totalFacts}`, 'info')

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 1, step_name: '统计本周事实数据',
            data: { totalFacts },
          })
        } else {
          logger.log('  步骤 1 (统计事实) 已从检查点恢复', 'info')
        }

        // Step 2: Confidence breakdown
        if (resumeStep < 2) {
          logger.progress('2/8', '统计置信度分布...')
          const { count: hc } = await supabaseAdmin
            .from('atomic_facts').select('id', { count: 'exact', head: true })
            .eq('week_number', weekNumber).eq('confidence', 'high')
          const { count: mc } = await supabaseAdmin
            .from('atomic_facts').select('id', { count: 'exact', head: true })
            .eq('week_number', weekNumber).eq('confidence', 'medium')
          const { count: lc } = await supabaseAdmin
            .from('atomic_facts').select('id', { count: 'exact', head: true })
            .eq('week_number', weekNumber).eq('confidence', 'low')
          const { count: rc } = await supabaseAdmin
            .from('atomic_facts').select('id', { count: 'exact', head: true })
            .eq('week_number', weekNumber).eq('verification_status', 'rejected')
          highCount = hc ?? 0
          mediumCount = mc ?? 0
          lowCount = lc ?? 0
          rejectedCount = rc ?? 0
          logger.log(`  高可信: ${highCount}，中可信: ${mediumCount}，低可信: ${lowCount}，拒绝: ${rejectedCount}`, 'info')

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 2, step_name: '统计置信度分布',
            data: { totalFacts, highCount, mediumCount, lowCount, rejectedCount },
          })
        } else {
          logger.log('  步骤 2 (置信度分布) 已从检查点恢复', 'info')
        }

        // Step 3: Entity stats
        if (resumeStep < 3) {
          logger.progress('3/8', '统计实体数据...')
          const weekMatch = weekNumber.match(/^(\d{4})-W(\d{2})$/)
          if (weekMatch) {
            const year = parseInt(weekMatch[1], 10)
            const week = parseInt(weekMatch[2], 10)
            const jan4 = new Date(Date.UTC(year, 0, 4))
            const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
            const monday = new Date(jan4)
            monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (week - 1) * 7)
            const weekEnd = new Date(monday)
            weekEnd.setDate(weekEnd.getDate() + 7)

            const { count: ne } = await supabaseAdmin.from('entities')
              .select('id', { count: 'exact', head: true })
              .gte('created_at', monday.toISOString()).lt('created_at', weekEnd.toISOString())
            newEntities = ne ?? 0

            const { data: activeRows } = await supabaseAdmin
              .from('fact_entities')
              .select('entity_id, atomic_facts!inner(week_number)')
              .eq('atomic_facts.week_number', weekNumber)
            activeEntities = new Set((activeRows ?? []).map(r => r.entity_id as string)).size
          }
          logger.log(`  新增实体: ${newEntities}，活跃实体: ${activeEntities}`, 'info')

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 3, step_name: '统计实体数据',
            data: { totalFacts, highCount, mediumCount, lowCount, rejectedCount, newEntities, activeEntities },
          })
        } else {
          logger.log('  步骤 3 (实体统计) 已从检查点恢复', 'info')
        }

        // Step 4: Cross-week contradiction detection
        if (resumeStep < 4) {
          logger.progress('4/8', '跨周矛盾检测...')
          const weekMatch = weekNumber.match(/^(\d{4})-W(\d{2})$/)
          try {
            // Fetch this week's verified facts
            const { data: thisWeekFacts } = await supabaseAdmin
              .from('atomic_facts')
              .select('id, content_zh, content_en, tags, fact_date, metric_value, metric_unit, metric_name, v5_result')
              .eq('week_number', weekNumber)
              .in('verification_status', ['verified', 'partially_verified'])
              .limit(100)

            // Compute 4-weeks-ago date from weekNumber
            let fourWeeksAgoDate: string | null = null
            let startOfThisWeekDate: string | null = null
            if (weekMatch) {
              const year = parseInt(weekMatch[1], 10)
              const week = parseInt(weekMatch[2], 10)
              const jan4 = new Date(Date.UTC(year, 0, 4))
              const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
              const thisMonday = new Date(jan4)
              thisMonday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (week - 1) * 7)
              startOfThisWeekDate = thisMonday.toISOString().split('T')[0]
              const fourWeeksBack = new Date(thisMonday)
              fourWeeksBack.setUTCDate(fourWeeksBack.getUTCDate() - 28)
              fourWeeksAgoDate = fourWeeksBack.toISOString().split('T')[0]
            }

            if (thisWeekFacts && thisWeekFacts.length > 0 && fourWeeksAgoDate && startOfThisWeekDate) {
              // Fetch historical facts from the past 4 weeks
              const { data: historicalFacts } = await supabaseAdmin
                .from('atomic_facts')
                .select('id, content_zh, content_en, tags, fact_date, metric_value, metric_unit, metric_name, week_number')
                .in('verification_status', ['verified', 'partially_verified'])
                .lt('fact_date', startOfThisWeekDate)
                .gte('fact_date', fourWeeksAgoDate)
                .limit(200)

              if (historicalFacts && historicalFacts.length > 0) {
                // Group historical facts by tags for efficient overlap matching
                const historicalByTag = new Map<string, typeof historicalFacts>()
                for (const hf of historicalFacts) {
                  for (const tag of (hf.tags as string[]) ?? []) {
                    const tagLower = tag.toLowerCase()
                    if (!historicalByTag.has(tagLower)) historicalByTag.set(tagLower, [])
                    historicalByTag.get(tagLower)!.push(hf)
                  }
                }

                // For each new fact, find overlapping historical facts by shared tags
                const pairsToCheck: Array<{
                  newFact: (typeof thisWeekFacts)[number]
                  overlapping: typeof historicalFacts
                }> = []

                for (const nf of thisWeekFacts) {
                  const overlapping = new Map<string, (typeof historicalFacts)[number]>()
                  for (const tag of (nf.tags as string[]) ?? []) {
                    const matches = historicalByTag.get(tag.toLowerCase())
                    if (matches) {
                      for (const m of matches) overlapping.set(m.id, m)
                    }
                  }
                  if (overlapping.size > 0) {
                    pairsToCheck.push({ newFact: nf, overlapping: [...overlapping.values()] })
                  }
                }

                logger.log(`  待检测对: ${pairsToCheck.length} 组新事实有历史重叠`, 'info')

                // Process in batches to limit AI calls
                for (let b = 0; b < pairsToCheck.length; b += 5) {
                  const batch = pairsToCheck.slice(b, b + 5)
                  const batchInput = batch.map((pair, i) => {
                    const newContent = pair.newFact.content_zh || pair.newFact.content_en
                    const historicalContent = pair.overlapping
                      .slice(0, 5) // limit per-fact comparisons
                      .map((h, j) => `  H${j}: ${h.content_zh || h.content_en} (${String(h.fact_date).split('T')[0]}, week ${h.week_number})`)
                      .join('\n')
                    return `[${i}] NEW: ${newContent} (${String(pair.newFact.fact_date).split('T')[0]})\nHISTORICAL:\n${historicalContent}`
                  }).join('\n\n')

                  try {
                    const result = await callHaikuJSON<{
                      contradictions: Array<{
                        index: number
                        has_contradiction: boolean
                        detail: string | null
                      }>
                    }>(
                      `你是稳定币行业分析师。检测以下新事实与历史事实之间是否存在真正的矛盾。

注意：
- 正常的数值变化（如市值增长/下降）不是矛盾，除非新事实声称的变化方向与实际数据相反
- 政策立场转变、前后说法不一致才是矛盾
- 同一事件的不同数字报道（如融资金额不一致）是矛盾
- 仅标记真正的矛盾，不标记正常进展

对每组判断：
- index: 组编号
- has_contradiction: 是否存在矛盾
- detail: 如有矛盾，用中文简述（一句话），引用新旧事实对比。无矛盾则 null

输出 JSON: { "contradictions": [...] }

${batchInput}`,
                      { system: '稳定币分析师。输出严格JSON。仅标记真正矛盾，不标记正常市场变化。', maxTokens: 1500 }
                    )

                    // Update v5_result for facts with detected contradictions
                    for (const c of result.contradictions ?? []) {
                      if (c.has_contradiction && c.detail && c.index >= 0 && c.index < batch.length) {
                        const factId = batch[c.index].newFact.id
                        const existingV5 = batch[c.index].newFact.v5_result as { temporal_status?: string; conflict_detail?: string } | null
                        // Only update if not already marked as conflict (don't overwrite intra-week checks)
                        if (!existingV5 || existingV5.temporal_status !== 'conflict') {
                          await supabaseAdmin
                            .from('atomic_facts')
                            .update({
                              v5_result: {
                                temporal_status: 'conflict',
                                conflict_detail: c.detail,
                              },
                            })
                            .eq('id', factId)
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

            logger.log(`  跨周矛盾检测完成: 发现 ${crossWeekConflicts} 个矛盾`, crossWeekConflicts > 0 ? 'success' : 'info')
          } catch (err) {
            logger.log(`  跨周矛盾检测失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
          }

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 4, step_name: '跨周矛盾检测',
            data: { totalFacts, highCount, mediumCount, lowCount, rejectedCount, newEntities, activeEntities, crossWeekConflicts },
          })
        } else {
          logger.log('  步骤 4 (跨周矛盾检测) 已从检查点恢复', 'info')
        }

        // Step 5: Density anomalies
        if (resumeStep < 5) {
          logger.progress('5/8', '检测信息密度异常...')
          try {
            const anomalies = await getDensityAnomalies(weekNumber)
            topAnomalies = anomalies.slice(0, 5).map(a => a.topic)
            logger.log(`  密度异常: ${anomalies.length} 个 (显示前5)`, 'info')
          } catch {
            logger.log('  密度异常检测跳过', 'info')
          }

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 5, step_name: '检测信息密度异常',
            data: { totalFacts, highCount, mediumCount, lowCount, rejectedCount, newEntities, activeEntities, crossWeekConflicts, topAnomalies },
          })
        } else {
          logger.log('  步骤 5 (密度异常) 已从检查点恢复', 'info')
        }

        // Step 6-7: AI generates weekly report — narrative-driven framework
        // Design: 3 narratives (with grouped news) + 10 standalone news items
        // Method: 2-phase — Phase A selects & classifies, Phase B generates per-item summaries
        if (resumeStep < 7) {
          logger.progress('6/9', 'AI 选取本周重要新闻...')
          try {
            const { data: topFacts } = await supabaseAdmin
              .from('atomic_facts')
              .select('id, content_zh, content_en, fact_type, tags, fact_date, source_url')
              .eq('week_number', weekNumber)
              .in('verification_status', ['verified', 'partially_verified'])
              .order('fact_date', { ascending: false })
              .limit(60)

            if (topFacts && topFacts.length > 0) {
              // Read existing narrative threads for classification
              const { data: activeThreads } = await supabaseAdmin
                .from('narrative_threads')
                .select('id, topic, slug')
                .in('status', ['active', 'dormant'])
                .order('last_updated_week', { ascending: false })
                .limit(10)
              const threadTopics = (activeThreads ?? []).map(t => t.topic.replace(/[#\n\r`]/g, ' ').slice(0, 200))

              const factsText = topFacts
                .map((f: { id: string; content_zh: string; content_en: string; fact_type: string; tags: string[]; fact_date: string; source_url: string | null }, i: number) =>
                  `[${i}] [${f.fact_type}] ${f.content_zh || f.content_en} (${String(f.fact_date).split('T')[0]}) [tags: ${f.tags.join(', ')}]${f.source_url ? ` [url: ${f.source_url}]` : ''}`)
                .join('\n')

              // Phase A: Select top news and classify into narratives vs standalone
              logger.log('  Phase A: AI 选取+分类...', 'info')
              const selectionResult = await callHaikuJSON<{
                narratives: Array<{
                  topic: string
                  last_week: string
                  this_week: string
                  next_week_watch: string
                  fact_indices: number[]
                }>
                standalone_indices: number[]
              }>(
                `你是稳定币行业分析师。从以下本周事实中，选出最重要的新闻并分类。

已有叙事线索（如果匹配就归入）:
${threadTopics.length > 0 ? threadTopics.map((t, i) => `${i + 1}. ${t}`).join('\n') : '(暂无已有叙事线索)'}

任务：
1. 从事实中识别 2-3 条叙事线索（优先匹配已有线索，也可创建新线索）
2. 每条叙事归入相关的事实（通过 fact_indices 引用事实编号）
3. 另外选出 10 条不属于任何叙事的独立重要新闻（通过 standalone_indices）
4. 同一事实不要同时出现在叙事和独立新闻中
5. 独立新闻严格去重，同一事件只保留一条

叙事要求：
- topic: 叙事主题名（简短，如"Circle IPO 进程"、"美国稳定币立法"）
- last_week: 上周该叙事的进展（1句话客观陈述，如不确定写"首次追踪"）
- this_week: 本周该叙事的关键进展（1-2句话客观陈述）
- next_week_watch: 下周具体关注事件（1句话，如"SEC 对 S-1 修订版的反馈窗口期截止"），不要写模糊的"关注动态"
- fact_indices: 归入该叙事的事实编号数组

规则：中英文之间加空格。叙事描述只陈述事实，不做预测或评价。

输出严格 JSON，不要 markdown：
{
  "narratives": [
    { "topic": "...", "last_week": "...", "this_week": "...", "next_week_watch": "...", "fact_indices": [0, 3, 7] }
  ],
  "standalone_indices": [1, 2, 4, 5, 6, 8, 9, 10, 11, 12]
}

本周事实 (共 ${topFacts.length} 条):
${factsText}`,
                { system: '你是稳定币行业分析师。输出严格 JSON。narratives 2-3条，standalone_indices 目标10条（不足则有多少输出多少）。', maxTokens: 2048 }
              )

              logger.log(`  选取完成: ${selectionResult.narratives?.length ?? 0} 条叙事, ${selectionResult.standalone_indices?.length ?? 0} 条独立新闻`, 'info')

              // Phase B: Generate per-item summaries for standalone news
              logger.progress('7/9', 'AI 逐条生成新闻摘要...')
              const standaloneIndices = (selectionResult.standalone_indices ?? []).slice(0, 12)
              interface NewsItemResult {
                date: string; simple_zh: string; simple_en: string
                background_zh: string; background_en: string
                what_happened_zh: string; what_happened_en: string
                insight_zh: string; insight_en: string
                source_url: string | null; tags: string[]
              }
              const newsItems: NewsItemResult[] = []

              // Process in batches of 3 for speed
              for (let b = 0; b < standaloneIndices.length; b += 3) {
                const batch = standaloneIndices.slice(b, b + 3)
                const batchFacts = batch
                  .map(idx => topFacts[idx])
                  .filter(Boolean)

                if (batchFacts.length === 0) continue

                logger.log(`  摘要: ${Math.min(b + 3, standaloneIndices.length)}/${standaloneIndices.length}`, 'progress')

                try {
                  const batchInput = batchFacts
                    .map((f, i) => `[${i}] ${f.content_zh || f.content_en} (${String(f.fact_date).split('T')[0]}) [tags: ${f.tags.join(', ')}]${f.source_url ? ` [url: ${f.source_url}]` : ''}`)
                    .join('\n')

                  const batchResult = await callHaikuJSON<{ items: NewsItemResult[] }>(
                    `为以下 ${batchFacts.length} 条稳定币行业事实各生成一条新闻摘要。

每条输出：
- date: YYYY.MM.DD
- simple_zh/simple_en: 一句话简报（中/英），格式 "YYYY.MM.DD, [主体] [动作+关键指标]"
- background_zh/background_en: 主体背景（1句，中/英）— 客观描述该公司/机构是什么
- what_happened_zh/what_happened_en: 发生了什么（1-2句含量化信息，中/英）— 纯事实陈述
- insight_zh/insight_en: 行业意义（1句，中/英）— 客观说明该事件在行业中的位置和关联，不做预测或主观评价
- source_url: 从 [url:] 提取的完整URL，没有则null
- tags: 标签数组

规则：
- 中英文之间加空格（如 "Circle 提交 S-1"）
- 不做预测，不说"可能"、"预计"
- insight 只说客观关联（如"这是首家稳定币发行方 IPO"），不说"值得关注"、"意义重大"

输出 JSON: { "items": [...] }，items 数量必须等于 ${batchFacts.length}。

事实:
${batchInput}`,
                    { system: '稳定币分析师。输出严格JSON，无markdown。不做预测，不给主观评价。中英文之间加空格。', maxTokens: 3000 }
                  )

                  if (batchResult.items) {
                    for (const item of batchResult.items) {
                      // Rule-based validation
                      if (item.simple_zh && item.date) {
                        newsItems.push(item)
                      }
                    }
                  }
                } catch (err) {
                  logger.log(`  批次 ${b / 3 + 1} 生成失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
                  // Continue with other batches — this batch's items are skipped
                }
              }

              logger.log(`  新闻摘要生成完成: ${newsItems.length} 条`, newsItems.length >= 5 ? 'success' : 'error')

              // Quality gate: rule-based validation + deduplication
              const seenTitles = new Set<string>()
              const validatedItems: NewsItemResult[] = []
              for (const item of newsItems) {
                // Required fields check
                if (!item.simple_zh || !item.date || !item.what_happened_zh) continue
                // Dedup: skip if title too similar (first 30 chars match)
                const key = item.simple_zh.slice(0, 30)
                if (seenTitles.has(key)) continue
                seenTitles.add(key)
                // Date sanity: should start with year
                if (!/^\d{4}/.test(item.date)) continue
                validatedItems.push(item)
              }
              if (validatedItems.length < newsItems.length) {
                logger.log(`  质量检查: ${newsItems.length} → ${validatedItems.length} 条（移除 ${newsItems.length - validatedItems.length} 条不合格）`, 'info')
              }

              // Phase C: Assemble final output
              if (validatedItems.length > 0 || (selectionResult.narratives?.length ?? 0) > 0) {
                // Build narrative summaries for snapshot
                const narrativeSummaries = (selectionResult.narratives ?? []).map(n => ({
                  topic: n.topic,
                  last_week: n.last_week,
                  this_week: n.this_week,
                  next_week_watch: n.next_week_watch,
                  fact_indices: n.fact_indices,
                  // Include the actual fact content for each narrative
                  facts: n.fact_indices
                    .map(idx => topFacts[idx])
                    .filter(Boolean)
                    .map(f => ({
                      content: f.content_zh || f.content_en,
                      date: String(f.fact_date).split('T')[0],
                      tags: f.tags,
                    })),
                }))

                weeklySummarySimple = 'Weekly Stablecoin News Update:\n' +
                  validatedItems.slice(0, 10).map((item, i) => `${i + 1}. ${item.simple_en}`).join('\n\n')

                weeklySummaryDetailed = JSON.stringify({
                  news: validatedItems.slice(0, 10),
                  narratives: narrativeSummaries,
                })

                logger.log(`  周报组装完成: ${narrativeSummaries.length} 叙事 + ${Math.min(validatedItems.length, 10)} 新闻`, 'success')
              } else {
                logger.log('  内容不足，周报生成失败', 'error')
              }
            } else {
              logger.log('  本周无事实，跳过摘要生成', 'info')
            }
          } catch (err) {
            logger.log(`  AI 摘要生成失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
          }

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 7, step_name: 'AI 新闻摘要生成',
            data: {
              totalFacts, highCount, mediumCount, lowCount, rejectedCount,
              newEntities, activeEntities, crossWeekConflicts, topAnomalies,
              weeklySummarySimple, weeklySummaryDetailed,
            },
          })
        } else {
          logger.log('  步骤 6-7 (AI 新闻生成) 已从检查点恢复', 'info')
        }

        // Step 8: Save snapshot via data access layer (merge with existing data to preserve narratives etc.)
        if (resumeStep < 8) {
          logger.progress('8/9', '保存快照到数据库...')

          await saveWeeklySnapshot(weekNumber, {
            total_facts: totalFacts,
            new_facts: totalFacts,
            high_confidence: highCount,
            medium_confidence: mediumCount,
            low_confidence: lowCount,
            rejected: rejectedCount,
            new_entities: newEntities,
            active_entities: activeEntities,
            new_contradictions: crossWeekConflicts,
            resolved_contradictions: 0,
            blind_spot_changes: [],
            top_density_anomalies: topAnomalies,
            weekly_summary: weeklySummarySimple,
            weekly_summary_detailed: weeklySummaryDetailed,
          })

          logger.log(`快照已保存: ${weekNumber}`, 'success')

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 8, step_name: '保存快照到数据库',
            data: {
              totalFacts, highCount, mediumCount, lowCount, rejectedCount,
              newEntities, activeEntities, crossWeekConflicts, topAnomalies,
              weeklySummarySimple, weeklySummaryDetailed,
            },
          })
        } else {
          logger.log('  步骤 8 (保存快照) 已从检查点恢复', 'info')
        }

        // Step 9: Generate email report and write to reports table
        if (resumeStep < 9) {
          logger.progress('9/9', '生成邮件报告...')

          try {
            // Parse the new narrative-driven format from weekly_summary_detailed
            let emailNewsItems: { date: string; simple_zh: string; background_zh: string; what_happened_zh: string; insight_zh: string; tags: string[] }[] = []
            let emailNarratives: { topic: string; summary: string; nodes: { date: string; title: string; description: string; isPrediction?: boolean }[] }[] = []

            if (weeklySummaryDetailed) {
              try {
                const parsed = JSON.parse(weeklySummaryDetailed)
                // New format: { news: [...], narratives: [...] }
                if (parsed.news && Array.isArray(parsed.news)) {
                  emailNewsItems = parsed.news
                } else if (Array.isArray(parsed)) {
                  // Legacy format: direct array of items
                  emailNewsItems = parsed
                }

                // Convert narrative summaries to email format
                if (parsed.narratives && Array.isArray(parsed.narratives)) {
                  emailNarratives = parsed.narratives.map((n: { topic: string; this_week: string; last_week?: string; next_week_watch?: string; facts?: { content: string; date: string }[] }) => ({
                    topic: n.topic,
                    summary: n.this_week,
                    lastWeekSummary: n.last_week !== '首次追踪' ? n.last_week : undefined,
                    nextWeekWatch: n.next_week_watch,
                    nodes: (n.facts ?? []).map((f: { content: string; date: string }) => ({
                      date: f.date,
                      title: f.content,
                      description: '',
                    })),
                  }))
                }
              } catch { /* ignore parse error */ }
            }

            // Fallback: get narratives from existing snapshot data (legacy pipeline)
            if (emailNarratives.length === 0) {
              const { getWeeklyNarratives } = await import('@/lib/weekly-data')
              const storedNarratives = await getWeeklyNarratives(weekNumber)
              emailNarratives = storedNarratives.slice(0, 3).map(n => ({
                topic: n.topic,
                summary: n.summary,
                nodes: n.nodes.map(nd => ({ date: nd.date, title: nd.title, description: nd.description, isPrediction: nd.isPrediction })),
              }))
            }

            if (emailNewsItems.length > 0) {
              const emailHTML = generateEmailHTML({
                weekDate: weekToDateRange(weekNumber),
                weekNumber,
                newsItems: emailNewsItems.slice(0, 10),
                narratives: emailNarratives.slice(0, 3),
                totalFacts: totalFacts,
                highConfidence: highCount,
                mediumConfidence: mediumCount,
              })

              const reportDate = weekToMondayDate(weekNumber)
              const { error: reportError } = await supabaseAdmin
                .from('reports')
                .upsert({
                  date: reportDate,
                  subject: `StablePulse Weekly | ${weekToDateRange(weekNumber)}`,
                  content: emailHTML,
                }, { onConflict: 'date' })

              if (reportError) {
                logger.log(`  邮件报告写入失败: ${reportError.message}`, 'error')
              } else {
                logger.log(`  邮件报告已写入 reports 表: ${reportDate}`, 'success')
              }
            } else {
              logger.log('  无摘要数据，跳过邮件报告生成', 'info')
            }
          } catch (err) {
            logger.log(`  邮件报告生成失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
          }
        } else {
          logger.log('  步骤 9 (邮件报告) 已从检查点恢复', 'info')
        }

        // --- Clear checkpoint on successful completion ---
        await clearCheckpoints(PIPELINE_NAME, weekNumber)
        logger.log('检查点已清除（流水线完成）', 'info')

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
