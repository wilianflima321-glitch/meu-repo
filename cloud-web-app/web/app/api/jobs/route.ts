/**
 * AETHEL ENGINE - Jobs Queue API
 *
 * Real queue-backed endpoint.
 * - GET: list jobs from BullMQ queues
 * - POST: enqueue a job in mapped queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import {
  QUEUE_NAMES,
  queueManager,
  type JobType as QueueJobType,
  type QueueJobSnapshot,
} from '@/lib/queue-system';
import type {
  RuntimeExecutionSafety,
  RuntimeExecutionTarget,
  RuntimeExecutionRoute,
} from '@/lib/device/runtime-execution-router';
import type {
  RuntimeLanePlacement,
  RuntimeWorkLane,
} from '@/lib/device/runtime-lane-scheduler';
import { createComponentLogger } from '@/lib/observability/logger';

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
const VALID_JOB_TYPES = ['build', 'render', 'export', 'import', 'compress', 'upload'] as const;
type JobType = (typeof VALID_JOB_TYPES)[number];
type JobRuntimeRouteMetadata = Pick<
  RuntimeExecutionRoute,
  | 'lane'
  | 'canStart'
  | 'target'
  | 'preferredPlacement'
  | 'safety'
  | 'requiresConfirmation'
  | 'reason'
  | 'label'
  | 'detail'
>;

interface ApiJob {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  runtimeRoute: JobRuntimeRouteMetadata;
  runtimeTarget: RuntimeExecutionTarget;
}

const log = createComponentLogger('api/jobs/route');

const JOB_TYPE_TO_RUNTIME_LANE: Record<JobType, RuntimeWorkLane> = {
  build: 'build-export',
  render: 'viewport-render',
  export: 'build-export',
  import: 'file-sync',
  compress: 'build-export',
  upload: 'file-sync',
};

const DEFAULT_TARGET_BY_LANE: Record<RuntimeWorkLane, RuntimeLanePlacement> = {
  'ai-agents': 'cloud-sandbox',
  'browser-operator': 'cloud-sandbox',
  'viewport-render': 'cloud-sandbox',
  'build-export': 'cloud-sandbox',
  'memory-indexing': 'cloud-sandbox',
  'file-sync': 'cloud-sandbox',
};

const RUNTIME_TARGETS = new Set<RuntimeExecutionTarget>([
  'local-main-safe',
  'local-worker',
  'local-native',
  'cloud-sandbox',
  'held',
]);

const RUNTIME_PLACEMENTS = new Set<RuntimeLanePlacement>([
  'local-main-safe',
  'local-worker',
  'local-native',
  'cloud-sandbox',
]);

const RUNTIME_SAFETIES = new Set<RuntimeExecutionSafety>([
  'ready',
  'needs-confirmation',
  'held',
  'fallback',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJobType(value: unknown): value is JobType {
  return typeof value === 'string' && (VALID_JOB_TYPES as readonly string[]).includes(value);
}

function isRuntimeTarget(value: unknown): value is RuntimeExecutionTarget {
  return typeof value === 'string' && RUNTIME_TARGETS.has(value as RuntimeExecutionTarget);
}

function isRuntimePlacement(value: unknown): value is RuntimeLanePlacement {
  return typeof value === 'string' && RUNTIME_PLACEMENTS.has(value as RuntimeLanePlacement);
}

function isRuntimeSafety(value: unknown): value is RuntimeExecutionSafety {
  return typeof value === 'string' && RUNTIME_SAFETIES.has(value as RuntimeExecutionSafety);
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  return isRecord(value) ? { ...value } : {};
}

function formatRuntimeValue(value: string): string {
  return value.replace(/-/g, ' ');
}

function getProgressPercentage(progress: unknown): number {
  if (typeof progress === 'number') return progress;
  if (isRecord(progress) && typeof progress.percentage === 'number') return progress.percentage;
  return 0;
}

function getErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

function sanitizeRuntimeRoute(
  value: unknown,
  lane: RuntimeWorkLane
): JobRuntimeRouteMetadata {
  const defaultTarget = DEFAULT_TARGET_BY_LANE[lane];
  const fallbackRoute: JobRuntimeRouteMetadata = {
    lane,
    canStart: true,
    target: defaultTarget,
    preferredPlacement: defaultTarget,
    safety: 'fallback',
    requiresConfirmation: false,
    reason: `No client runtime route was provided; ${formatRuntimeValue(lane)} will use ${formatRuntimeValue(defaultTarget)} isolation.`,
    label: `${formatRuntimeValue(lane)} -> ${formatRuntimeValue(defaultTarget)}`,
    detail:
      'The job was accepted with a conservative server-side execution target so heavy work does not block the user interface.',
  };

  if (!isRecord(value)) return fallbackRoute;

  const target = isRuntimeTarget(value.target) ? value.target : fallbackRoute.target;
  const preferredPlacement = isRuntimePlacement(value.preferredPlacement)
    ? value.preferredPlacement
    : target === 'held'
      ? fallbackRoute.preferredPlacement
      : target;
  const safety = isRuntimeSafety(value.safety)
    ? value.safety
    : target === 'held'
      ? 'held'
      : fallbackRoute.safety;
  const reason =
    typeof value.reason === 'string' && value.reason.trim().length > 0
      ? value.reason
      : fallbackRoute.reason;
  const label =
    typeof value.label === 'string' && value.label.trim().length > 0
      ? value.label
      : `${formatRuntimeValue(lane)} -> ${formatRuntimeValue(target)}`;
  const detail =
    typeof value.detail === 'string' && value.detail.trim().length > 0
      ? value.detail
      : fallbackRoute.detail;

  return {
    lane,
    canStart: target !== 'held' && value.canStart !== false,
    target,
    preferredPlacement,
    safety,
    requiresConfirmation:
      typeof value.requiresConfirmation === 'boolean'
        ? value.requiresConfirmation
        : safety === 'needs-confirmation',
    reason,
    label,
    detail,
  };
}

function shouldHoldRuntimeRoute(route: JobRuntimeRouteMetadata): boolean {
  return !route.canStart || route.target === 'held' || route.safety === 'held';
}

function mapStatus(state: string): JobStatus {
  if (state === 'active') return 'processing';
  if (state === 'completed') return 'completed';
  if (state === 'failed') return 'failed';
  return 'queued';
}

function mapType(jobName: string): JobType {
  if (jobName === 'render:viewport') return 'render';
  if (jobName.startsWith('asset:')) return 'import';
  if (jobName === 'export:project' || jobName === 'export:game') return 'export';
  if (jobName.startsWith('ai:')) return 'build';
  return 'build';
}

function toApiJob(snapshot: QueueJobSnapshot): ApiJob {
  const payload = (snapshot.data || {}) as Record<string, unknown>;
  const type = mapType(snapshot.name);
  const metadata = normalizeMetadata(payload.metadata);
  const runtimeRoute = sanitizeRuntimeRoute(
    payload.runtimeRoute ?? metadata.runtimeRoute,
    JOB_TYPE_TO_RUNTIME_LANE[type]
  );

  return {
    id: snapshot.id,
    type,
    status: mapStatus(snapshot.state),
    progress: Math.max(0, Math.min(100, getProgressPercentage(snapshot.progress))),
    projectId: typeof payload.projectId === 'string' ? payload.projectId : undefined,
    projectName: typeof payload.projectName === 'string' ? payload.projectName : undefined,
    createdAt: new Date(snapshot.timestamp || Date.now()).toISOString(),
    startedAt: snapshot.processedOn ? new Date(snapshot.processedOn).toISOString() : undefined,
    completedAt: snapshot.finishedOn ? new Date(snapshot.finishedOn).toISOString() : undefined,
    error: snapshot.failedReason,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    runtimeRoute,
    runtimeTarget: runtimeRoute.target,
  };
}

function mapJobTypeToQueue(type: JobType): { queueName: string; jobType: QueueJobType; priority?: number } {
  switch (type) {
    case 'build':
    case 'export':
      return { queueName: QUEUE_NAMES.EXPORT, jobType: 'export:project', priority: 5 };
    case 'render':
      return { queueName: QUEUE_NAMES.EXPORT, jobType: 'render:viewport', priority: 6 };
    case 'import':
    case 'compress':
    case 'upload':
      return { queueName: QUEUE_NAMES.ASSET, jobType: 'asset:process', priority: 3 };
    default:
      return { queueName: QUEUE_NAMES.EXPORT, jobType: 'export:project', priority: 1 };
  }
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized';
}

function isAuthNotConfigured(error: unknown): boolean {
  return error instanceof Error && getErrorCode(error) === 'AUTH_NOT_CONFIGURED';
}

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, rawLimit)) : 50;

    const available = await queueManager.isAvailable();
    if (!available) {
      return NextResponse.json(
        {
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          message: 'Queue backend is not configured. Install/configure Redis + BullMQ.',
        },
        { status: 503 }
      );
    }

    let jobs = (await queueManager.listJobs(limit)).map(toApiJob);
    if (status && status !== 'all') {
      jobs = jobs.filter((job) => job.status === status);
    }
    if (type && type !== 'all') {
      jobs = jobs.filter((job) => job.type === type);
    }

    const stats = {
      total: jobs.length,
      queued: jobs.filter((job) => job.status === 'queued').length,
      processing: jobs.filter((job) => job.status === 'processing').length,
      completed: jobs.filter((job) => job.status === 'completed').length,
      failed: jobs.filter((job) => job.status === 'failed').length,
    };

    return NextResponse.json({
      jobs,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isAuthNotConfigured(error)) {
      return NextResponse.json(
        { error: 'AUTH_NOT_CONFIGURED', message: 'Set JWT_SECRET to enable protected APIs.' },
        { status: 503 }
      );
    }
    log.error('Failed to list jobs', error);
    return NextResponse.json(
      { error: 'Failed to list jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const body = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json(
        { error: 'Payload invalido' },
        { status: 400 }
      );
    }

    const { type } = body;
    if (!isJobType(type)) {
      return NextResponse.json(
        { error: `Tipo invalido. Use: ${VALID_JOB_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const projectId = typeof body.projectId === 'string' ? body.projectId : undefined;
    const projectName = typeof body.projectName === 'string' ? body.projectName : undefined;

    const metadata = normalizeMetadata(body.metadata);
    const runtimeRoute = sanitizeRuntimeRoute(
      body.runtimeRoute ?? metadata.runtimeRoute,
      JOB_TYPE_TO_RUNTIME_LANE[type]
    );

    if (shouldHoldRuntimeRoute(runtimeRoute)) {
      return NextResponse.json(
        {
          error: 'RUNTIME_ROUTE_HELD',
          message: runtimeRoute.reason,
          runtimeRoute,
        },
        { status: 409 }
      );
    }

    const enrichedMetadata = {
      ...metadata,
      runtimeRoute,
    };

    const available = await queueManager.isAvailable();
    if (!available) {
      return NextResponse.json(
        {
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          message: 'Queue backend is not configured. Cannot enqueue jobs.',
        },
        { status: 503 }
      );
    }

    const queueConfig = mapJobTypeToQueue(type);
    const queued = await queueManager.addJob(
      queueConfig.queueName,
      queueConfig.jobType,
      {
        projectId,
        projectName,
        metadata: enrichedMetadata,
        runtimeRoute,
        runtimeTarget: runtimeRoute.target,
        requestedBy: user.userId,
        requestedAt: new Date().toISOString(),
      },
      {
        priority: queueConfig.priority,
      }
    );

    if (!queued) {
      return NextResponse.json(
        {
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          message: 'Queue backend is not available to accept jobs.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Job enfileirado com sucesso',
        job: {
          id: String(queued.id),
          type,
          status: 'queued',
          progress: 0,
          projectId,
          projectName,
          createdAt: new Date().toISOString(),
          metadata: enrichedMetadata,
          runtimeRoute,
          runtimeTarget: runtimeRoute.target,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isAuthNotConfigured(error)) {
      return NextResponse.json(
        { error: 'AUTH_NOT_CONFIGURED', message: 'Set JWT_SECRET to enable protected APIs.' },
        { status: 503 }
      );
    }
    log.error('Failed to create job', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
