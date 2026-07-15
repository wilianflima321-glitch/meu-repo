import type { SurfaceCheck } from './status.types'

export const STATUS_REFRESH_INTERVAL_MS = 30_000

export const SURFACE_CHECKS: SurfaceCheck[] = [
  { id: 'runtime', name: 'Runtime base', endpoint: '/api/health/live', required: true },
  { id: 'readiness', name: 'Application status', endpoint: '/api/health/ready', required: true },
  { id: 'ai', name: 'AI providers', endpoint: '/api/health/ai' },
  { id: 'database', name: 'Database', endpoint: '/api/health/db', required: true },
  { id: 'cache', name: 'Cache / rate limiting', endpoint: '/api/health/cache' },
  { id: 'storage', name: 'Asset storage', endpoint: '/api/health/storage' },
  { id: 'stripe', name: 'Gateway Stripe', endpoint: '/api/health/stripe' },
  { id: 'billing', name: 'Billing runtime', endpoint: '/api/health/billing' },
]

export const TRUST_EXPLAINERS = [
  { title: 'Live', detail: 'No artificial rolling uptime or operational greenwashing.' },
  { title: 'Impact', detail: 'Technical checks are translated into customer impact.' },
  { title: 'Limits', detail: 'What is not published is marked as missing, not hidden.' },
]

export const STATUS_TRUTHS = [
  'Operational means the endpoint responded and the payload reported real availability.',
  'Partial means a check responds, but still depends on configuration, credentials, or incomplete coverage.',
  'Blocked means a public failure or unavailable mandatory dependency.',
  'No decorative timeline: when reliable public history is missing, this page states the gap openly.',
]

export const STATUS_LIMITS = [
  'We do not yet publish rolling uptime for 7, 30, or 90 days.',
  'There is not yet a complete public archive of resolved incidents.',
  'L4 evidence remains a separate track: it depends on real production receipts, not only these public checks.',
  'This page covers public checks and commercial status, not every internal telemetry signal.',
]

export const INCIDENT_GRAMMAR = [
  {
    eyebrow: 'Sev 1',
    title: 'Public blocker',
    detail: 'Used when the app, status, or a mandatory database check fails and customer impact may be immediate.',
  },
  {
    eyebrow: 'Sev 2',
    title: 'Degraded capability',
    detail: 'Used when the base responds, but checkout, AI, cache, or storage still cannot support the full promised experience.',
  },
  {
    eyebrow: 'Sev 3',
    title: 'Incomplete coverage',
    detail: 'Used for public visibility gaps: missing history, SLA, or deeper production receipts.',
  },
]
