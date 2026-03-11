// SSE streaming endpoint for data collection with detailed progress
import {
  collectOnChainData,
  collectNews,
  collectCompanyData,
  collectProductUpdates,
  collectFunding,
  collectRegulatory,
} from '@/modules/collectors'

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
        { name: '新闻采集 (RSS + API)', key: 'news', fn: collectNews },
        { name: '公司数据 (SEC + Yahoo)', key: 'companies', fn: collectCompanyData },
        { name: '产品更新 (GitHub + Blog)', key: 'products', fn: collectProductUpdates },
        { name: '融资事件 (DeFiLlama)', key: 'funding', fn: collectFunding },
        { name: '监管动态 (SEC + Congress)', key: 'regulatory', fn: collectRegulatory },
      ]

      const results: Record<string, string> = {}
      const startTime = Date.now()

      send({ type: 'log', message: `开始数据采集，共 ${tasks.length} 个采集器`, level: 'info' })

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        send({ type: 'progress', step: `${i + 1}/${tasks.length}`, message: `正在执行: ${task.name}...` })

        const taskStart = Date.now()
        try {
          await task.fn()
          const elapsed = ((Date.now() - taskStart) / 1000).toFixed(1)
          results[task.key] = 'ok'
          send({ type: 'log', message: `${task.name} — 完成 (${elapsed}s)`, level: 'success' })
        } catch (err) {
          const elapsed = ((Date.now() - taskStart) / 1000).toFixed(1)
          results[task.key] = 'error'
          send({ type: 'log', message: `${task.name} — 失败 (${elapsed}s): ${err instanceof Error ? err.message : String(err)}`, level: 'error' })
        }
      }

      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const okCount = Object.values(results).filter(v => v === 'ok').length
      const errCount = Object.values(results).filter(v => v === 'error').length

      send({
        type: 'log',
        message: `采集完成 — 成功 ${okCount}/${tasks.length}，失败 ${errCount}，总耗时 ${totalElapsed}s`,
        level: errCount > 0 ? 'error' : 'success',
      })

      send({ type: 'done', results, duration_ms: Date.now() - startTime })
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
