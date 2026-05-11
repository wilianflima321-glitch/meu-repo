import { createComponentLogger } from '../../lib/observability/logger'
import { registerViewportRenderWorker } from '../../lib/workers/viewport-render-worker'

const logger = createComponentLogger('server.workers.viewport-render-worker')

async function main() {
  const concurrency = Math.max(1, Number.parseInt(process.env.VIEWPORT_RENDER_WORKER_CONCURRENCY || '2', 10))
  const worker = await registerViewportRenderWorker({ concurrency })

  if (!worker) {
    logger.warn('viewport_render_worker.not_registered', {
      reason: 'Queue backend unavailable. The process will stay alive only if another supervisor restarts it.',
    })
    return
  }

  logger.info('viewport_render_worker.started', {
    concurrency,
    rendererConfigured: Boolean(process.env.AETHEL_RENDER_BACKEND_ENDPOINT || process.env.AETHEL_RENDER_BACKEND_BASE_URL),
  })

  const shutdown = async (signal: string) => {
    logger.info('viewport_render_worker.shutdown', { signal })
    await worker.close()
    process.exit(0)
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((error) => {
  logger.error('viewport_render_worker.fatal', error)
  process.exit(1)
})
