import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { capabilityResponse } from '@/lib/server/capability-response'
import { queueManager, type QueueJobSnapshot } from '@/lib/queue-system'

export const dynamic = 'force-dynamic'
const CAPABILITY = 'ADMIN_JOB_QUEUE'

type AdminJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused'
type AdminJobType = 'render' | 'build' | 'ai' | 'export' | 'import' | 'other'

type AdminJobItem = {
  id: string
  type: AdminJobType
  name: string
  status: AdminJobStatus
  progress: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  metadata?: Record<string, unknown>
  priority: number
  retries: number
  maxRetries: number
}

function mapStatus(state: string): AdminJobStatus {
  if (state === 'active') return 'running'
  if (state === 'completed') return 'completed'
  if (state === 'failed') return 'failed'
  if (state === 'paused') return 'paused'
  return 'pending'
}

function mapType(snapshot: QueueJobSnapshot): AdminJobType {
  if (snapshot.queueName.includes('aethel:ai')) return 'ai'
  if (snapshot.queueName.includes('aethel:export')) {
    if (snapshot.name.includes('render')) return 'render'
    if (snapshot.name.includes('export')) return 'export'
    return 'build'
  }
  if (snapshot.queueName.includes('aethel:asset')) return 'import'
  return 'other'
}

function toAdminJob(snapshot: QueueJobSnapshot): AdminJobItem {
  const payload = (snapshot.data || {}) as Record<string, unknown>
  const progressValue = typeof snapshot.progress === 'number'
    ? snapshot.progress
    : typeof (snapshot.progress as { percentage?: unknown })?.percentage === 'number'
      ? Number((snapshot.progress as { percentage?: number }).percentage ?? 0)
      : 0

  return {
    id: snapshot.id,
    type: mapType(snapshot),
    name: snapshot.name,
    status: mapStatus(snapshot.state),
    progress: Math.max(0, Math.min(100, progressValue)),
    createdAt: new Date(snapshot.timestamp || Date.now()).toISOString(),
    startedAt: snapshot.processedOn ? new Date(snapshot.processedOn).toISOString() : undefined,
    completedAt: snapshot.finishedOn ? new Date(snapshot.finishedOn).toISOString() : undefined,
    error: snapshot.failedReason,
    metadata: payload,
    priority: Number(payload.priority ?? 0),
    retries: snapshot.attemptsMade ?? 0,
    maxRetries: Number(payload.maxRetries ?? 3),
  }
}

const getHandler = async (_request: NextRequest) => {
  const available = await queueManager.isAvailable()
  if (!available) {
    return capabilityResponse({
      error: 'QUEUE_BACKEND_UNAVAILABLE',
      message: 'Queue backend is not configured.',
      status: 503,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
    })
  }

  const jobs = (await queueManager.listJobs(200)).map(toAdminJob)
  return NextResponse.json({
    jobs,
    capability: CAPABILITY,
    capabilityStatus: 'PARTIAL',
    message: 'Job queue loaded from runtime backend.',
    metadata: {
      total: jobs.length,
      pending: jobs.filter((job) => job.status === 'pending').length,
      running: jobs.filter((job) => job.status === 'running').length,
      completed: jobs.filter((job) => job.status === 'completed').length,
      failed: jobs.filter((job) => job.status === 'failed').length,
      paused: jobs.filter((job) => job.status === 'paused').length,
    },
  })
}

export const GET = withAdminAuth(getHandler, 'ops:dashboard:metrics')
