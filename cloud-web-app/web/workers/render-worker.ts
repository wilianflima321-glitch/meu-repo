import { prisma } from '@/lib/db'
import queueManager, { QUEUE_NAMES } from '@/lib/queue-system'
import { createComponentLogger } from '@/lib/observability/logger'
import { VIEWPORT_RENDER_QUEUE_JOB_TYPE } from '@/lib/viewport/viewport-render-queue'
import type { QueueJobAdapter } from '@/lib/queue-system.types'

const log = createComponentLogger('workers.render-worker')

/**
 * Render Worker
 * Processa as filas de exportação e simula um Render Farm (FFMPEG/Blender)
 */
export async function startRenderWorker() {
  log.info('[RenderWorker] Starting Aethel Render Farm Worker...')

  await queueManager.registerWorker(
    QUEUE_NAMES.EXPORT,
    async (job: QueueJobAdapter) => {
      // Ignora jobs de outros tipos que possam estar na mesma fila (ex: export:project)
      if (job.name !== VIEWPORT_RENDER_QUEUE_JOB_TYPE) {
        log.info(`[RenderWorker] Skipping unknown job type: ${job.name}`)
        return
      }

      const jobId = String(job.id!)
      const payload = job.data as any

      log.info(`[RenderWorker] Picked up job ${jobId} for project ${payload.projectName}`)

      try {
        // Marca como em processamento no DB
        await prisma.renderJob.update({
          where: { id: jobId },
          data: { status: 'processing', progress: 0 }
        })

        // Simulação do Motor de Exportação FFMPEG
        // Em produção, isso iria despachar para FFMPEG local via sub-process
        // ou para Render Farm via API, monitorando stdout.
        const totalSteps = 10
        for (let i = 1; i <= totalSteps; i++) {
          // Espera 1 segundo por "frame" processado
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const progress = Math.floor((i / totalSteps) * 100)
          
          // Atualiza progresso
          if (typeof (job as any).updateProgress === 'function') {
            await (job as any).updateProgress(progress)
          }
          await prisma.renderJob.update({
            where: { id: jobId },
            data: { progress }
          })
          
          log.info(`[RenderWorker] Job ${jobId} rendering: ${progress}%`)
        }

        // Finaliza o Job
        const outputUrl = `https://cdn.aethel.io/renders/${jobId}.mp4`
        await prisma.renderJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            progress: 100,
            outputUrl,
            completedAt: new Date()
          }
        })

        log.info(`[RenderWorker] Job ${jobId} completed successfully. Output: ${outputUrl}`)
        return { success: true, outputUrl }

      } catch (error) {
        log.error(`[RenderWorker] Job ${jobId} failed:`, error)
        
        await prisma.renderJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown Render Error',
            completedAt: new Date()
          }
        })
        throw error
      }
    },
    2 // Concurrency: Quantos renders paralelos esta máquina aguenta
  )
}
