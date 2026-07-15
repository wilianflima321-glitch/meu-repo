/**
 * Letter bw — BYOK MoA hybrid clay ingest (Tripo / Luma / generic mesh-gen).
 * Fail-closed without BYOK or CostGuard reservation. No fake clay artifacts.
 * Provider debit always via CreativeBridge + CostGuard (Trava I).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  dispatchCreativeArtifact,
  type CreativeArtifactRequest,
  type CreativeProviderDispatch,
} from '@/lib/production/creative-artifact-bridge'
import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import { CREATIVE_WEIGHTED_TOKEN_ESTIMATES } from '@/lib/creative-provider-matrix'
import type { MeshQualityStageReceipt, RawMeshBuffer } from '@/lib/mesh-quality/types'
import type { TaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'

const log = createComponentLogger('clay-provider-adapters')

export const CLAY_PROVIDER_ADAPTERS_WIRED = true as const

export type ClayProviderId = 'tripo' | 'luma' | 'meshy' | 'generic-mesh-gen'

export interface ClayIngestRequest {
  prompt: string
  projectId: string
  userId: string
  provider: ClayProviderId
  planId?: string
  byokProfileId?: string
  usageBucketId?: string
  /** Optional OBJ text already fetched — skips live provider (tests / offline). */
  offlineObjText?: string
}

export interface ClayIngestResult {
  ok: boolean
  mesh?: RawMeshBuffer
  objText?: string
  provider: ClayProviderId
  artifactId?: string
  blockedReason?: string
  receipt: MeshQualityStageReceipt
  ledger?: TaskEvidenceLedger
}

/**
 * Parse a minimal OBJ (v + f) into RawMeshBuffer. Fail-closed on empty.
 */
export function parseObjToRawMesh(objText: string): RawMeshBuffer | null {
  const positions: number[] = []
  const faces: number[] = []
  const lines = objText.split(/\r?\n/)
  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith('v ')) {
      const parts = t.split(/\s+/)
      const x = Number(parts[1])
      const y = Number(parts[2])
      const z = Number(parts[3])
      if (![x, y, z].every(Number.isFinite)) continue
      positions.push(x, y, z)
    } else if (t.startsWith('f ')) {
      const parts = t.split(/\s+/).slice(1)
      const idxs = parts
        .map((p) => Number(p.split('/')[0]))
        .filter((n) => Number.isFinite(n) && n !== 0)
        .map((n) => (n < 0 ? positions.length / 3 + n : n - 1))
      if (idxs.length < 3) continue
      for (let i = 1; i + 1 < idxs.length; i++) {
        faces.push(idxs[0]!, idxs[i]!, idxs[i + 1]!)
      }
    }
  }
  if (positions.length < 9 || faces.length < 3) return null
  return {
    positions: new Float32Array(positions),
    indices: Uint32Array.from(faces),
  }
}

export function buildMinimalObjFixture(scale = 1): string {
  // Unit cube — enough for pipeline tests without inventing provider bytes
  const s = scale
  return [
    `v ${-s} ${-s} ${-s}`,
    `v ${s} ${-s} ${-s}`,
    `v ${s} ${s} ${-s}`,
    `v ${-s} ${s} ${-s}`,
    `v ${-s} ${-s} ${s}`,
    `v ${s} ${-s} ${s}`,
    `v ${s} ${s} ${s}`,
    `v ${-s} ${s} ${s}`,
    'f 1 2 3 4',
    'f 5 8 7 6',
    'f 1 5 6 2',
    'f 2 6 7 3',
    'f 3 7 8 4',
    'f 5 1 4 8',
  ].join('\n')
}

/**
 * Clay ingest through CreativeBridge. Without BYOK/credits → deny (Zero-UI).
 * Live Tripo/Luma HTTP is optional via `liveFetch`; default fail-closed unless
 * offlineObjText or liveFetch returns real OBJ.
 */
export async function ingestClayMesh(input: {
  request: ClayIngestRequest
  adapter: CostGuardLedgerAdapter
  ledger?: TaskEvidenceLedger
  /**
   * Optional live provider. Must return non-empty OBJ or throw.
   * Never invent clay when unset — fail-closed.
   */
  liveFetch?: (provider: ClayProviderId, prompt: string) => Promise<{ objText: string; taskId: string }>
}): Promise<ClayIngestResult> {
  const weight = CREATIVE_WEIGHTED_TOKEN_ESTIMATES.model3dStandard
  const req = input.request

  if (req.offlineObjText) {
    const mesh = parseObjToRawMesh(req.offlineObjText)
    if (!mesh) {
      return failClosed(req.provider, 'Offline OBJ parse empty — Law XVI no empty success')
    }
    // Still go through CostGuard when not a pure unit fixture path — caller chooses.
    // For offline fixtures used in tests, use dispatch with a noop-cost provider.
  }

  const providerDispatch: CreativeProviderDispatch = async () => {
    let objText = req.offlineObjText
    let taskId = `offline-${req.provider}`

    if (!objText) {
      if (!input.liveFetch) {
        throw new Error('CLAY_PROVIDER_UNAVAILABLE')
      }
      const live = await input.liveFetch(req.provider, req.prompt)
      objText = live.objText
      taskId = live.taskId
    }

    const mesh = parseObjToRawMesh(objText)
    if (!mesh) {
      return {
        artifactId: '',
        provider: req.provider,
        costUsd: 0,
        actualTokenWeight: 0,
        empty: true,
      }
    }

    return {
      artifactId: taskId,
      provider: req.provider,
      costUsd: 0,
      actualTokenWeight: weight,
      empty: false,
      previewUrl: undefined,
    }
  }

  const creativeRequest: CreativeArtifactRequest = {
    domain: 'mesh',
    prompt: req.prompt,
    projectId: req.projectId,
    userId: req.userId,
    costGuard: {
      byokProfileId: req.byokProfileId,
      usageBucketId: req.usageBucketId,
      estimatedTokenWeight: weight,
      planId: req.planId ?? 'pro',
    },
    requiresFusionWrite: false,
  }

  try {
    const { result, ledger } = await dispatchCreativeArtifact({
      request: creativeRequest,
      adapter: input.adapter,
      provider: providerDispatch,
      ledger: input.ledger,
    })

    if (!result.success) {
      log.info('Clay ingest denied or empty', {
        provider: req.provider,
        reason: result.blockedReason,
      })
      return failClosed(
        req.provider,
        result.blockedReason ?? 'Clay ingest empty — settle:0',
        ledger,
      )
    }

    const objText = req.offlineObjText ?? (await resolveObjAfterDispatch(req, input.liveFetch))
    const mesh = objText ? parseObjToRawMesh(objText) : null
    if (!mesh) {
      return failClosed(req.provider, 'Clay OBJ missing after dispatch', ledger)
    }

    return {
      ok: true,
      mesh,
      objText,
      provider: req.provider,
      artifactId: result.artifactId,
      ledger,
      receipt: {
        stage: 'clay-ingest',
        status: 'closed',
        evidence: [`provider:${req.provider}`, 'creative-bridge', 'cost-guard', 'obj-clay'],
        metrics: {
          artifactId: result.artifactId,
          triangles: Math.floor(mesh.indices.length / 3),
        },
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'clay_ingest_failed'
    log.info('Clay ingest fail-closed', { provider: req.provider, msg })
    return failClosed(req.provider, msg)
  }
}

async function resolveObjAfterDispatch(
  req: ClayIngestRequest,
  liveFetch?: ClayIngestRequest extends never
    ? never
    : (provider: ClayProviderId, prompt: string) => Promise<{ objText: string; taskId: string }>,
): Promise<string | undefined> {
  if (req.offlineObjText) return req.offlineObjText
  if (!liveFetch) return undefined
  const live = await liveFetch(req.provider, req.prompt)
  return live.objText
}

function failClosed(
  provider: ClayProviderId,
  reason: string,
  ledger?: TaskEvidenceLedger,
): ClayIngestResult {
  return {
    ok: false,
    provider,
    blockedReason: reason,
    ledger,
    receipt: {
      stage: 'clay-ingest',
      status: 'rejected',
      evidence: ['fail-closed', 'zero-ui'],
      heldReason: reason,
    },
  }
}

/**
 * Build a Tripo/Luma/Meshy live fetch using env keys — returns null if missing.
 * Prompt-only submit+poll is not inlined here (CostGuard hold risk).
 * Letter bx: use `runLiveClayPollIntoQualityPipeline` / `resolveLiveClayMesh` with taskId
 * from `/api/ai/3d/generate` (or webhook). Optional `resolveFromTask` injects the poll path.
 */
export function createEnvClayLiveFetch(
  env: {
    TRIPO_API_KEY?: string
    LUMA_API_KEY?: string
    MESHY_API_KEY?: string
  },
  opts?: {
    /**
     * When set, liveFetch may resolve an existing job id embedded in the prompt
     * as `task:<id>` — otherwise fail-closed (no invented clay).
     */
    resolveFromTask?: (
      provider: ClayProviderId,
      taskId: string,
    ) => Promise<{ objText: string; taskId: string }>
  },
): ((provider: ClayProviderId, prompt: string) => Promise<{ objText: string; taskId: string }>) | null {
  const hasAny = Boolean(env.TRIPO_API_KEY || env.LUMA_API_KEY || env.MESHY_API_KEY)
  if (!hasAny) return null

  return async (provider, prompt) => {
    const keyOk =
      (provider === 'tripo' && env.TRIPO_API_KEY) ||
      (provider === 'luma' && env.LUMA_API_KEY) ||
      (provider === 'meshy' && env.MESHY_API_KEY) ||
      (provider === 'generic-mesh-gen' && hasAny)
    if (!keyOk) {
      throw new Error(`BYOK_MISSING_FOR_${provider.toUpperCase()}`)
    }

    const taskMatch = /^task:([A-Za-z0-9_-]+)\s*$/.exec(prompt.trim())
    if (taskMatch && opts?.resolveFromTask) {
      return opts.resolveFromTask(provider, taskMatch[1]!)
    }

    throw new Error(
      'CLAY_LIVE_POLL_NEEDS_TASK — POST /api/ai/3d/generate then runLiveClayPollIntoQualityPipeline({ clayJob }); no invented clay',
    )
  }
}
