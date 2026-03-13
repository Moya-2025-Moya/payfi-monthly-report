// SSE streaming endpoint for snapshot generation — V10
// Produces: oneLiner, headlines, narratives (with context), signals (by event type)
// AI boundary: ZERO judgment, ZERO predictions. Pure facts + comparable data + timelines.
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'
import { createPipelineLogger } from '@/lib/pipeline-logger'
import { generateEmailHTML, weekToDateRange, weekToMondayDate } from '@/lib/email-template'
import { saveCheckpoint, loadCheckpoint, clearCheckpoints } from '@/lib/pipeline-checkpoint'
import { saveWeeklySnapshot } from '@/lib/weekly-data'
import type { EmailData } from '@/lib/email-template'

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

        // Step 3: AI — Select 8 items (3 narratives + 5 standalone signals) + generate context
        if (resumeStep < 3) {
          logger.progress('3/5', 'AI 选取本周重点...')
          try {
            const { data: topFacts } = await supabaseAdmin
              .from('atomic_facts')
              .select('id, content_zh, content_en, fact_type, tags, fact_date, source_url')
              .eq('week_number', weekNumber)
              .in('verification_status', ['verified', 'partially_verified'])
              .order('fact_date', { ascending: false })
              .limit(60)

            if (topFacts && topFacts.length > 0) {
              // Read existing narrative threads
              const { data: activeThreads } = await supabaseAdmin
                .from('narrative_threads')
                .select('id, topic, slug')
                .in('status', ['active', 'dormant'])
                .order('last_updated_week', { ascending: false })
                .limit(10)
              const threadTopics = (activeThreads ?? []).map(t => t.topic.replace(/[#\n\r`]/g, ' ').slice(0, 200))

              const factsText = topFacts
                .map((f, i) => `[${i}] [${f.fact_type}] ${f.content_zh || f.content_en} (${String(f.fact_date).split('T')[0]}) [tags: ${f.tags.join(', ')}]${f.source_url ? ` [url: ${f.source_url}]` : ''}`)
                .join('\n')

              // Phase A: Select + classify + generate context
              const selectionResult = await callHaikuJSON<{
                one_liner: string
                headlines: string[]
                narratives: Array<{
                  topic: string
                  week_count?: number
                  last_week: string
                  this_week: string
                  timeline?: string
                  comparable?: string
                  fact_indices: number[]
                }>
                signals: Array<{
                  category: 'milestone' | 'product' | 'data'
                  text: string
                  fact_index: number
                }>
              }>(
                `你是稳定币行业事实聚合工具。从以下本周事实中选取并组织周报内容。

已有叙事线索:
${threadTopics.length > 0 ? threadTopics.map((t, i) => `${i + 1}. ${t}`).join('\n') : '(暂无)'}

任务:
1. one_liner: 一句话概括本周（纯事实，不做评价。如 "Circle S-1 修订提交; GENIUS Act 过委员会"）
2. headlines: 3 条标题（按事件类型排序: 里程碑 > 产品/合作 > 数据）
3. narratives: 2-3 条叙事追踪（优先匹配已有线索）
4. signals: 5 条独立事实信号，按 category 分类

叙事字段:
- topic: 主题名（如 "Circle IPO 进程"）
- week_count: 追踪第几周（首次=1）
- last_week: 上周进展（1句事实，首次写 "首次追踪"）
- this_week: 本周进展（1-2句事实）
- timeline: 关键时间节点（如 "SEC 反馈窗口 3.17 起"），没有则省略
- comparable: 可比参考数据（如 "Coinbase S-1→IPO 用时 5 个月 (2020.12-2021.04), 当时 USDC 市值 $25B"），没有则省略
- fact_indices: 事实编号数组

信号字段:
- category: "milestone" | "product" | "data"
  - milestone: 首次、突破、监管里程碑
  - product: 产品发布、合作、合并
  - data: 数值变化（市值、TVL、用户量等）
- text: 一行事实描述，含量化数据（如 "Ethena USDe TVL 突破 $5B (历史最大偏离 -0.8%, 2025.04)"）
- fact_index: 来源事实编号

绝对规则:
- 不做预测、不做评价、不说"值得关注"、不说"可能"
- timeline 和 comparable 只写可验证的事实数据
- 中英文之间加空格

输出严格 JSON:
{
  "one_liner": "...",
  "headlines": ["...", "...", "..."],
  "narratives": [...],
  "signals": [...]
}

本周事实 (共 ${topFacts.length} 条):
${factsText}`,
                { system: '稳定币事实聚合工具。输出严格JSON。不做预测不做评价。narratives 2-3条, signals 5条。', maxTokens: 3000 }
              )

              logger.log(`  选取完成: ${selectionResult.narratives?.length ?? 0} 叙事 + ${selectionResult.signals?.length ?? 0} 信号`, 'success')

              // Assemble V10 format
              const narrativesWithFacts = (selectionResult.narratives ?? []).map(n => ({
                topic: n.topic,
                weekCount: n.week_count,
                last_week: n.last_week,
                this_week: n.this_week,
                timeline: n.timeline,
                comparable: n.comparable,
                fact_indices: n.fact_indices,
                facts: n.fact_indices
                  .map(idx => topFacts[idx])
                  .filter(Boolean)
                  .map(f => ({
                    content: f.content_zh || f.content_en,
                    date: String(f.fact_date).split('T')[0],
                    tags: f.tags,
                    source_url: f.source_url,
                  })),
              }))

              weeklySummaryDetailed = JSON.stringify({
                oneLiner: selectionResult.one_liner,
                headlines: selectionResult.headlines ?? [],
                narratives: narrativesWithFacts,
                signals: (selectionResult.signals ?? []).map(s => ({
                  category: s.category,
                  text: s.text,
                  source_url: s.fact_index != null ? topFacts[s.fact_index]?.source_url : undefined,
                })),
              })

              logger.log(`  V10 周报数据组装完成`, 'success')
            } else {
              logger.log('  本周无事实，跳过', 'info')
            }
          } catch (err) {
            logger.log(`  AI 选取失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
          }

          await saveCheckpoint({
            pipeline: PIPELINE_NAME, week_number: weekNumber, step: 3, step_name: 'AI 选取',
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
                weekNumber,
                weekDate: weekToDateRange(weekNumber),
                oneLiner: parsed.oneLiner ?? '',
                headlines: parsed.headlines ?? [],
                narratives: (parsed.narratives ?? []).slice(0, 3).map((n: { topic: string; weekCount?: number; last_week: string; this_week: string; timeline?: string; comparable?: string }) => ({
                  topic: n.topic,
                  weekCount: n.weekCount,
                  last_week: n.last_week,
                  this_week: n.this_week,
                  timeline: n.timeline,
                  comparable: n.comparable,
                })),
                signals: (parsed.signals ?? []).slice(0, 8),
                totalFacts,
                verifiedCount: highCount + mediumCount,
                crossVerifiedCount: crossWeekConflicts,
              }

              const emailHTML = generateEmailHTML(emailData)
              const reportDate = weekToMondayDate(weekNumber)

              const { error: reportError } = await supabaseAdmin
                .from('reports')
                .upsert({
                  date: reportDate,
                  subject: `StablePulse W${weekNumber.split('-W')[1]} | ${weekToDateRange(weekNumber)}`,
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
