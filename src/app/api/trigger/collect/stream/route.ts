// SSE streaming endpoint for data collection with detailed progress
import {
  collectOnChainData,
  collectNews,
  collectCompanyData,
  collectProductUpdates,
  collectFunding,
  collectRegulatory,
  collectTweets,
} from '@/modules/collectors'
import type { CollectorResult } from '@/modules/collectors'

export const maxDuration = 300

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const tasks = [
        { name: '链上数据 (DeFiLlama)', key: 'on-chain', fn: collectOnChainData },
        { name: '新闻采集 (14个RSS源)', key: 'news', fn: collectNews },
        { name: '公司数据 (SEC + Yahoo)', key: 'companies', fn: collectCompanyData },
        { name: '产品更新 (GitHub + Blog)', key: 'products', fn: collectProductUpdates },
        { name: '融资事件 (DeFiLlama)', key: 'funding', fn: collectFunding },
        { name: '监管动态 (SEC + Congress)', key: 'regulatory', fn: collectRegulatory },
      ]

      const results: Record<string, { status: string; count: number }> = {}
      const startTime = Date.now()
      let totalItems = 0

      send({ type: 'log', message: `开始数据采集，共 ${tasks.length} 个采集器`, level: 'info' })

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        send({ type: 'progress', step: `${i + 1}/${tasks.length}`, message: `正在执行: ${task.name}...` })

        const taskStart = Date.now()
        try {
          const rawResult = await task.fn()
          const elapsed = ((Date.now() - taskStart) / 1000).toFixed(1)

          // Support both number and CollectorResult return types
          let count: number
          let breakdown: CollectorResult['breakdown'] | undefined
          if (typeof rawResult === 'number') {
            count = rawResult
          } else {
            count = rawResult.total
            breakdown = rawResult.breakdown
          }

          results[task.key] = { status: 'ok', count }
          totalItems += count
          send({
            type: 'log',
            message: `${task.name} — 完成，采集 ${count} 条数据 (${elapsed}s)`,
            level: 'success',
          })

          // Show per-source breakdown
          if (breakdown && breakdown.length > 0) {
            const nonZero = breakdown.filter(b => b.count > 0)
            const zero = breakdown.filter(b => b.count === 0)
            for (const b of nonZero) {
              send({ type: 'log', message: `    ${b.source}: ${b.count} 条`, level: 'info' })
            }
            if (zero.length > 0) {
              send({ type: 'log', message: `    无数据: ${zero.map(b => b.source).join(', ')}`, level: 'info' })
            }
          }
        } catch (err) {
          const elapsed = ((Date.now() - taskStart) / 1000).toFixed(1)
          results[task.key] = { status: 'error', count: 0 }
          send({
            type: 'log',
            message: `${task.name} — 失败 (${elapsed}s): ${err instanceof Error ? err.message : String(err)}`,
            level: 'error',
          })
        }
      }

      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const okCount = Object.values(results).filter(v => v.status === 'ok').length
      const errCount = Object.values(results).filter(v => v.status === 'error').length

      // Summary with per-collector counts
      send({ type: 'log', message: '─── 采集汇总 ───', level: 'info' })
      for (const task of tasks) {
        const r = results[task.key]
        if (r) {
          const icon = r.status === 'ok' ? '✓' : '✗'
          send({ type: 'log', message: `  ${icon} ${task.name}: ${r.count} 条`, level: r.status === 'ok' ? 'success' : 'error' })
        }
      }

      send({
        type: 'log',
        message: `采集完成 — 成功 ${okCount}/${tasks.length}，失败 ${errCount}，共采集 ${totalItems} 条数据，总耗时 ${totalElapsed}s`,
        level: errCount > 0 ? 'error' : 'success',
      })

      send({ type: 'done', results, totalItems, duration_ms: Date.now() - startTime })
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
