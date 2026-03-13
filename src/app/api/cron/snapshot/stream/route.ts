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
import type { EmailData, NarrativeForEmail, SignalItem } from '@/lib/email-template'

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

        // Step 3: AI select + classify + Context Engine
        if (resumeStep < 3) {
          logger.progress('3/5', 'AI 选取 + 上下文引擎...')
          try {
            const { data: topFacts } = await supabaseAdmin
              .from('atomic_facts')
              .select('id, content_zh, content_en, fact_type, tags, fact_date, source_url')
              .eq('week_number', weekNumber)
              .in('verification_status', ['verified', 'partially_verified'])
              .order('fact_date', { ascending: false })
              .limit(60)

            if (topFacts && topFacts.length > 0) {
              // Fetch active narrative threads with their last_week entries
              const { data: activeThreads } = await supabaseAdmin
                .from('narrative_threads')
                .select('id, topic, slug, total_weeks, key_entities')
                .in('status', ['active', 'dormant'])
                .order('last_updated_week', { ascending: false })
                .limit(10)

              // Compute previous week string using proper date arithmetic
              let prevWeek = ''
              const wMatch = weekNumber.match(/^(\d{4})-W(\d{2})$/)
              if (wMatch) {
                const yr = Number(wMatch[1])
                const wn = Number(wMatch[2])
                // Find Monday of current ISO week, then go back 7 days
                const jan4 = new Date(Date.UTC(yr, 0, 4))
                const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
                const monday = new Date(jan4)
                monday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (wn - 1) * 7)
                monday.setUTCDate(monday.getUTCDate() - 7) // Go back 1 week
                // Convert back to ISO week
                const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()))
                const dn = d.getUTCDay() || 7
                d.setUTCDate(d.getUTCDate() + 4 - dn)
                const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
                const pwn = Math.ceil((((d.getTime() - ys.getTime()) / 86400000) + 1) / 7)
                prevWeek = `${d.getUTCFullYear()}-W${String(pwn).padStart(2, '0')}`
              }

              // Fetch last week's entries for each thread
              const threadIds = (activeThreads ?? []).map(t => t.id)
              const { data: prevEntries } = threadIds.length > 0 && prevWeek
                ? await supabaseAdmin
                    .from('narrative_thread_entries')
                    .select('thread_id, summary, next_week_watch')
                    .eq('week_number', prevWeek)
                    .in('thread_id', threadIds)
                : { data: null }

              const prevEntryMap = new Map(
                (prevEntries ?? []).map(e => [e.thread_id, { summary: e.summary, next_week_watch: e.next_week_watch }])
              )

              // Build thread info with real last_week data
              const threadInfoLines = (activeThreads ?? []).map((t, i) => {
                const prev = prevEntryMap.get(t.id)
                const lastWeekText = prev ? prev.summary : '(无上周数据)'
                const watchText = prev?.next_week_watch ? ` | 关注: ${prev.next_week_watch}` : ''
                return `${i + 1}. ${t.topic} (第${t.total_weeks}周) — 上周: ${lastWeekText}${watchText}`
              })

              const factsText = topFacts
                .map((f, i) => `[${i}] [${f.fact_type}] ${f.content_zh || f.content_en} (${String(f.fact_date).split('T')[0]}) [tags: ${f.tags.join(', ')}]${f.source_url ? ` [url: ${f.source_url}]` : ''}`)
                .join('\n')

              // Phase A: AI 选取 + 分类
              const selectionResult = await callHaikuJSON<{
                one_liner: string
                market_line?: string
                narratives: Array<{
                  topic: string
                  week_count?: number
                  origin?: string
                  last_week: string
                  this_week: string
                  timeline?: string
                  fact_indices: number[]
                }>
                signals: Array<{
                  category: 'market_structure' | 'product' | 'onchain_data'
                  text: string
                  fact_index: number
                }>
              }>(
                `你是稳定币行业事实聚合工具。从以下本周事实中选取并组织周报内容。

已有叙事线索（含上周真实进展）:
${threadInfoLines.length > 0 ? threadInfoLines.join('\n') : '(暂无)'}

任务:
1. one_liner: 一句话概括本周（纯事实，如 "Circle S-1 修订提交; GENIUS Act 过委员会"）
2. market_line: 市值数据行（如 "USDC $60.2B (+2.1%) · USDT $144.1B (+0.8%)"），如果本周有市值数据
3. narratives: 2-3 条叙事追踪（优先匹配已有线索）
4. signals: 5 条独立事实信号，按 category 分类

叙事字段:
- topic: 主题名（如 "Circle IPO 进程"）
- week_count: 追踪第几周（首次=1）
- origin: 叙事起点（一句话，如 "2026.02.15 Circle 宣布启动 IPO 流程"），首次追踪必填
- last_week: 上周进展（直接复制上方叙事线索中的"上周"内容，首次写 "首次追踪"。禁止编造上周数据）
- this_week: 本周进展（1-2句事实）
- timeline: 关键时间节点（如 "SEC 反馈窗口 3.17 起"），没有则省略
- fact_indices: 事实编号数组

信号字段:
- category: "market_structure" | "product" | "onchain_data"
  - market_structure: IPO/并购/融资/监管里程碑
  - product: 产品发布/集成/合作
  - onchain_data: 市值/TVL/交易量变化
- text: 一行事实描述，含量化数据
- fact_index: 来源事实编号

绝对规则:
- 不做预测、不做评价、不说"值得关注"、不说"可能"
- 中英文之间加空格

输出严格 JSON:
{
  "one_liner": "...",
  "market_line": "...",
  "narratives": [...],
  "signals": [...]
}

本周事实 (共 ${topFacts.length} 条):
${factsText}`,
                { system: '稳定币事实聚合工具。输出严格JSON。不做预测不做评价。narratives 2-3条, signals 5条。', maxTokens: 3000 }
              )

              logger.log(`  选取完成: ${selectionResult.narratives?.length ?? 0} 叙事 + ${selectionResult.signals?.length ?? 0} 信号`, 'success')

              // Phase B: Context Engine — 为每条叙事和信号生成上下文
              logger.log('  上下文引擎启动...', 'info')

              const narrativesWithContext: NarrativeForEmail[] = []
              for (const n of (selectionResult.narratives ?? []).slice(0, 3)) {
                // 用叙事的 this_week 作为主要事实输入
                const primaryFact = n.fact_indices?.[0] != null ? topFacts[n.fact_indices[0]] : null
                const factTags = primaryFact ? (primaryFact.tags as string[]) : []
                const factDate = primaryFact ? String(primaryFact.fact_date).split('T')[0] : new Date().toISOString().split('T')[0]

                const ctxResult = await generateFactContext({
                  content: n.this_week,
                  tags: factTags,
                  fact_date: factDate,
                })

                narrativesWithContext.push({
                  topic: n.topic,
                  weekCount: n.week_count,
                  origin: n.origin,
                  last_week: n.last_week,
                  this_week: n.this_week,
                  timeline: n.timeline,
                  context: ctxResult.context_lines.length > 0 ? ctxResult.context_lines : undefined,
                })

                if (ctxResult.context_lines.length > 0) {
                  logger.log(`    "${n.topic}" → ${ctxResult.context_lines.length} 条上下文 (${ctxResult.confidence})`, 'success')
                } else {
                  logger.log(`    "${n.topic}" → 无上下文候选`, 'info')
                }
              }

              const signalsWithContext: (SignalItem & { source_url?: string })[] = []
              for (const s of (selectionResult.signals ?? []).slice(0, 5)) {
                const factRef = s.fact_index != null ? topFacts[s.fact_index] : null
                const factTags = factRef ? (factRef.tags as string[]) : []
                const factDate = factRef ? String(factRef.fact_date).split('T')[0] : new Date().toISOString().split('T')[0]

                const ctxResult = await generateFactContext({
                  content: s.text,
                  tags: factTags,
                  fact_date: factDate,
                })

                signalsWithContext.push({
                  category: s.category,
                  text: s.text,
                  context: ctxResult.context_lines[0], // 信号只取第一条上下文
                  source_url: factRef?.source_url ?? undefined,
                })
              }

              logger.log(`  上下文引擎完成`, 'success')

              // Phase 2F: Adversarial validation on free-text fields
              logger.log('  对抗验证...', 'info')
              try {
                const fieldsToCheck = [
                  { name: 'one_liner', value: selectionResult.one_liner },
                  ...narrativesWithContext.map((n, i) => ({ name: `narrative_${i}_this_week`, value: n.this_week })),
                ]
                const checks = await adversarialCheck(fieldsToCheck)
                let violations = 0
                for (const check of checks) {
                  if (check.violation && check.cleaned) {
                    violations++
                    if (check.field === 'one_liner') {
                      selectionResult.one_liner = check.cleaned
                    } else {
                      const match = check.field.match(/^narrative_(\d+)_this_week$/)
                      if (match) {
                        const idx = parseInt(match[1])
                        if (narrativesWithContext[idx]) {
                          narrativesWithContext[idx].this_week = check.cleaned
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

              // Assemble V12 format
              const narrativesWithFacts = narrativesWithContext.map((n, idx) => {
                const origNarr = (selectionResult.narratives ?? [])[idx]
                return {
                  ...n,
                  fact_indices: origNarr?.fact_indices,
                  facts: (origNarr?.fact_indices ?? [])
                    .map(fidx => topFacts[fidx])
                    .filter(Boolean)
                    .map(f => ({
                      content: f.content_zh || f.content_en,
                      date: String(f.fact_date).split('T')[0],
                      tags: f.tags,
                      source_url: f.source_url,
                    })),
                }
              })

              weeklySummaryDetailed = JSON.stringify({
                version: 'v12',
                oneLiner: selectionResult.one_liner,
                marketLine: selectionResult.market_line,
                narratives: narrativesWithFacts,
                signals: signalsWithContext,
              })

              logger.log(`  V11 周报数据组装完成`, 'success')
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
                weekDate: weekToDateRange(weekNumber),
                marketLine: parsed.marketLine,
                oneLiner: parsed.oneLiner ?? '',
                narratives: (parsed.narratives ?? []).slice(0, 3).map((n: NarrativeForEmail) => ({
                  topic: n.topic,
                  weekCount: n.weekCount,
                  origin: n.origin,
                  last_week: n.last_week,
                  this_week: n.this_week,
                  timeline: n.timeline,
                  context: n.context,
                })),
                signals: (parsed.signals ?? []).slice(0, 8).map((s: SignalItem) => ({
                  category: s.category,
                  text: s.text,
                  context: s.context,
                })),
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
