import {
  AETHEL_TOOLCHAIN_LANES,
  buildAethelToolchainDependencyMatrix,
  type AethelToolchainDependencyMatrix,
  type AethelToolchainLaneId,
} from '@/lib/runtime/runtime-toolchain-dependency-map'
import { STUDIO_LOCAL_CONTRACT_VERSION } from '@/lib/runtime/runtime-contracts-bridge'

export interface AethelToolchainEnvironmentReadiness {
  aiProviderConfigured: boolean
  objectStorageConfigured: boolean
  pixelStreamConfigured: boolean
  stripeConfigured: boolean
  sentryConfigured: boolean
  configuredServiceIds: string[]
  missingServiceIds: string[]
}

export interface AethelToolchainReadinessSnapshotInput {
  laneIds?: AethelToolchainLaneId[]
  env?: Record<string, string | undefined>
  installedNativeToolIds?: string[]
  availablePackageIds?: string[]
  approvedHumanProcessIds?: string[]
  generatedAt?: string
}

export interface AethelToolchainReadinessSnapshot {
  version: 1
  contractVersion: number
  generatedAt: string
  capability: 'AETHEL_RUNTIME_TOOLCHAIN_READINESS'
  capabilityStatus: 'available' | 'held'
  laneCount: number
  readyLaneCount: number
  heldLaneCount: number
  blockedLaneCount: number
  environment: AethelToolchainEnvironmentReadiness
  matrix: AethelToolchainDependencyMatrix
  nextAction: string
}

const ALL_LANE_IDS = new Set(AETHEL_TOOLCHAIN_LANES.map((lane) => lane.id))

function hasAnyEnv(env: Record<string, string | undefined>, keys: string[]): boolean {
  return keys.some((key) => Boolean(env[key]?.trim()))
}

function splitCsv(value: string | undefined): string[] {
  if (!value) return []
  return Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)))
}

export function coerceAethelToolchainLaneIds(value: string | string[] | null | undefined): AethelToolchainLaneId[] | undefined {
  const raw = Array.isArray(value) ? value.join(',') : value
  const laneIds = splitCsv(raw ?? undefined).filter((lane): lane is AethelToolchainLaneId => ALL_LANE_IDS.has(lane as AethelToolchainLaneId))
  return laneIds.length > 0 ? laneIds : undefined
}

export function detectAethelToolchainEnvironment(env: Record<string, string | undefined> = process.env): AethelToolchainEnvironmentReadiness {
  const aiProviderConfigured = hasAnyEnv(env, [
    'OPENAI_API_KEY',
    'OPENROUTER_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_API_KEY',
    'GROQ_API_KEY',
    'OLLAMA_BASE_URL',
    'OLLAMA_URL',
  ])
  const objectStorageConfigured =
    (hasAnyEnv(env, ['AWS_ACCESS_KEY_ID', 'S3_ACCESS_KEY_ID']) &&
      hasAnyEnv(env, ['AWS_SECRET_ACCESS_KEY', 'S3_SECRET_ACCESS_KEY']) &&
      hasAnyEnv(env, ['S3_BUCKET', 'AWS_S3_BUCKET'])) ||
    (hasAnyEnv(env, ['S3_ENDPOINT']) && hasAnyEnv(env, ['MINIO_ROOT_USER']) && hasAnyEnv(env, ['MINIO_ROOT_PASSWORD']))
  const pixelStreamConfigured = hasAnyEnv(env, ['NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL', 'AETHEL_PIXEL_STREAM_URL'])
  const stripeConfigured = hasAnyEnv(env, ['STRIPE_SECRET_KEY'])
  const sentryConfigured = hasAnyEnv(env, ['SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN'])
  const configuredServiceIds = [
    ...(aiProviderConfigured ? ['ai-provider'] : []),
    ...(objectStorageConfigured ? ['object-storage'] : []),
    ...(pixelStreamConfigured ? ['pixel-stream-url'] : []),
    ...(stripeConfigured ? ['stripe'] : []),
    ...(sentryConfigured ? ['@sentry/nextjs'] : []),
  ]
  const missingServiceIds = ['ai-provider', 'object-storage', 'pixel-stream-url'].filter((service) => !configuredServiceIds.includes(service))

  return {
    aiProviderConfigured,
    objectStorageConfigured,
    pixelStreamConfigured,
    stripeConfigured,
    sentryConfigured,
    configuredServiceIds,
    missingServiceIds,
  }
}

export function buildAethelToolchainReadinessSnapshot(
  input: AethelToolchainReadinessSnapshotInput = {}
): AethelToolchainReadinessSnapshot {
  const runtimeEnv = input.env ?? process.env
  const environment = detectAethelToolchainEnvironment(runtimeEnv)
  const installedNativeToolIds = input.installedNativeToolIds ?? splitCsv(runtimeEnv.AETHEL_RUNTIME_TOOL_IDS)
  const approvedHumanProcessIds = input.approvedHumanProcessIds ?? splitCsv(runtimeEnv.AETHEL_APPROVED_PROCESS_IDS)
  const matrix = buildAethelToolchainDependencyMatrix({
    laneIds: input.laneIds,
    installedNativeToolIds,
    configuredServiceIds: environment.configuredServiceIds,
    availablePackageIds: input.availablePackageIds,
    approvedHumanProcessIds,
  })
  const readyLaneCount = matrix.lanes.filter((lane) => lane.status === 'ready').length
  const heldLaneCount = matrix.lanes.filter((lane) => lane.status === 'held').length
  const blockedLaneCount = matrix.lanes.filter((lane) => lane.status === 'blocked').length
  const capabilityStatus = blockedLaneCount === 0 && heldLaneCount === 0 ? 'available' : 'held'

  return {
    version: 1,
    contractVersion: STUDIO_LOCAL_CONTRACT_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    capability: 'AETHEL_RUNTIME_TOOLCHAIN_READINESS',
    capabilityStatus,
    laneCount: matrix.lanes.length,
    readyLaneCount,
    heldLaneCount,
    blockedLaneCount,
    environment,
    matrix,
    nextAction:
      capabilityStatus === 'available'
        ? 'Selected toolchain lanes are ready; continue with execution evidence, cost checks, and human review gates.'
        : matrix.nextAction,
  }
}
