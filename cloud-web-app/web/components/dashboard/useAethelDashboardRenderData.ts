'use client'

import { useCallback, useMemo } from 'react'
import type { RenderJob } from './RenderProgress'

export function useAethelDashboardRenderData(renders: any[], queueJobs: any[]) {
  const renderJobs = useMemo<RenderJob[]>(() => {
    return renders.map((render, index) => {
      const totalFrames = render.totalFrames && render.totalFrames > 0 ? render.totalFrames : 1
      const currentFrame = render.currentFrame && render.currentFrame > 0 ? render.currentFrame : 0
      const statusMap: Record<string, RenderJob['status']> = {
        pending: 'queued',
        rendering: 'rendering',
        complete: 'completed',
        failed: 'failed',
        cancelled: 'cancelled',
      }

      return {
        id: render.jobId,
        name: render.message || `RenderizaÃ§Ã£o ${index + 1}`,
        type: totalFrames > 1 ? 'sequence' : 'image',
        status: statusMap[render.status] || 'queued',
        progress: render.progress ?? 0,
        currentFrame,
        totalFrames,
        estimatedTimeRemaining: render.eta,
        output: render.output,
        error: render.error,
        resolution: { width: 1920, height: 1080 },
        samples: render.totalSamples ?? 0,
        engine: 'cycles',
        peakMemory: render.memory,
        frames: [],
      }
    })
  }, [renders])

  const exportJobs = useMemo(() => {
    return queueJobs.filter(job => job.type.toLowerCase().includes('export'))
  }, [queueJobs])

  const formatBytes = useCallback((bytes: number) => {
    if (!Number.isFinite(bytes)) return '-'
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(2)} GB`
  }, [])

  const formatCurrency = useCallback((value: number, currency: string) => {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(value)
    } catch {
      return `${currency} ${value.toFixed(2)}`
    }
  }, [])

  return { renderJobs, exportJobs, formatBytes, formatCurrency }
}
