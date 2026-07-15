/**
 * Letter bx — Live clay job poll / webhook-ready client (Tripo · Meshy · Luma).
 * Poll → download OBJ/GLB → RawMeshBuffer → game-ready conveyor.
 * Fail-closed without BYOK keys. Never invent mesh bytes. Zero-UI.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  parseObjToRawMesh,
  type ClayProviderId,
} from '@/lib/mesh-quality/clay-provider-adapters'
import type { MeshQualityStageReceipt, RawMeshBuffer } from '@/lib/mesh-quality/types'

const log = createComponentLogger('clay-live-poll')

/** Honesty: real poll/download/parse path shipped (mocked fetch OK in CI). */
export const LIVE_CLAY_POLL_WIRED = true as const
export const LIVE_CLAY_POLL_LETTER = 'bx' as const

export type ClayJobLifecycle = 'queued' | 'processing' | 'completed' | 'failed'

export interface ClayJobPollResult {
  status: ClayJobLifecycle
  progress?: number
  /** Preferred download URL (OBJ preferred over GLB when both exist). */
  modelUrl?: string
  objUrl?: string
  glbUrl?: string
  error?: string
  provider: ClayProviderId
  taskId: string
}

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<{
  ok: boolean
  status: number
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
  json(): Promise<unknown>
  headers: { get(name: string): string | null }
}>

export interface ClayProviderPollClient {
  provider: ClayProviderId
  pollJob(taskId: string): Promise<ClayJobPollResult>
  /** Normalize provider webhook / callback body — null if unrecognized. */
  fromWebhookPayload(body: unknown, taskIdHint?: string): ClayJobPollResult | null
}

export interface ClayPollClientKeys {
  TRIPO_API_KEY?: string
  LUMA_API_KEY?: string
  MESHY_API_KEY?: string
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null
}

function pickString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  }
  return undefined
}

function preferModelUrl(objUrl?: string, glbUrl?: string, fallback?: string): string | undefined {
  return objUrl ?? glbUrl ?? fallback
}

export function createMeshyPollClient(input: {
  apiKey: string
  fetchImpl?: FetchLike
}): ClayProviderPollClient {
  const fetchImpl = input.fetchImpl ?? (globalThis.fetch as FetchLike)
  const provider: ClayProviderId = 'meshy'

  const normalize = (taskId: string, raw: Record<string, unknown>): ClayJobPollResult => {
    const statusRaw = String(raw.status ?? '').toUpperCase()
    const urls = asRecord(raw.model_urls) ?? {}
    const objUrl = pickString(urls.obj)
    const glbUrl = pickString(urls.glb, raw.model_url)
    if (statusRaw === 'SUCCEEDED' || statusRaw === 'SUCCESS' || statusRaw === 'COMPLETED') {
      return {
        provider,
        taskId,
        status: 'completed',
        progress: 100,
        objUrl,
        glbUrl,
        modelUrl: preferModelUrl(objUrl, glbUrl),
      }
    }
    if (statusRaw === 'FAILED' || statusRaw === 'ERROR' || statusRaw === 'CANCELED') {
      const errObj = asRecord(raw.task_error)
      return {
        provider,
        taskId,
        status: 'failed',
        error: pickString(errObj?.message, raw.error, 'meshy_job_failed'),
      }
    }
    return {
      provider,
      taskId,
      status: statusRaw === 'PENDING' || statusRaw === 'QUEUED' ? 'queued' : 'processing',
      progress: typeof raw.progress === 'number' ? raw.progress : 0,
    }
  }

  return {
    provider,
    async pollJob(taskId) {
      const response = await fetchImpl(`https://api.meshy.ai/v2/text-to-3d/${taskId}`, {
        headers: { Authorization: `Bearer ${input.apiKey}` },
      })
      if (!response.ok) {
        return {
          provider,
          taskId,
          status: 'failed',
          error: `meshy_http_${response.status}`,
        }
      }
      const raw = asRecord(await response.json())
      if (!raw) {
        return { provider, taskId, status: 'failed', error: 'meshy_invalid_json' }
      }
      return normalize(taskId, raw)
    },
    fromWebhookPayload(body, taskIdHint) {
      const raw = asRecord(body)
      if (!raw) return null
      const taskId = pickString(raw.id, raw.task_id, raw.taskId, taskIdHint)
      if (!taskId) return null
      return normalize(taskId, raw)
    },
  }
}

export function createTripoPollClient(input: {
  apiKey: string
  fetchImpl?: FetchLike
}): ClayProviderPollClient {
  const fetchImpl = input.fetchImpl ?? (globalThis.fetch as FetchLike)
  const provider: ClayProviderId = 'tripo'

  const normalize = (taskId: string, payload: Record<string, unknown>): ClayJobPollResult => {
    const data = asRecord(payload.data) ?? payload
    const statusRaw = String(data.status ?? '').toLowerCase()
    const output = asRecord(data.output) ?? {}
    const objUrl = pickString(output.obj, output.model_obj, output.pbr_model_obj)
    const glbUrl = pickString(output.model, output.pbr_model, output.base_model, output.glb)
    if (statusRaw === 'success' || statusRaw === 'succeeded' || statusRaw === 'completed') {
      return {
        provider,
        taskId,
        status: 'completed',
        progress: 100,
        objUrl,
        glbUrl,
        modelUrl: preferModelUrl(objUrl, glbUrl),
      }
    }
    if (statusRaw === 'failed' || statusRaw === 'error' || statusRaw === 'cancelled') {
      return {
        provider,
        taskId,
        status: 'failed',
        error: pickString(data.message, data.error, payload.message, 'tripo_job_failed'),
      }
    }
    return {
      provider,
      taskId,
      status: statusRaw === 'queued' || statusRaw === 'pending' ? 'queued' : 'processing',
      progress: typeof data.progress === 'number' ? data.progress : 0,
    }
  }

  return {
    provider,
    async pollJob(taskId) {
      const response = await fetchImpl(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
        headers: { Authorization: `Bearer ${input.apiKey}` },
      })
      if (!response.ok) {
        return {
          provider,
          taskId,
          status: 'failed',
          error: `tripo_http_${response.status}`,
        }
      }
      const raw = asRecord(await response.json())
      if (!raw) {
        return { provider, taskId, status: 'failed', error: 'tripo_invalid_json' }
      }
      return normalize(taskId, raw)
    },
    fromWebhookPayload(body, taskIdHint) {
      const raw = asRecord(body)
      if (!raw) return null
      const data = asRecord(raw.data) ?? raw
      const taskId = pickString(data.task_id, data.taskId, raw.task_id, raw.taskId, taskIdHint)
      if (!taskId) return null
      return normalize(taskId, raw)
    },
  }
}

export function createLumaPollClient(input: {
  apiKey: string
  fetchImpl?: FetchLike
}): ClayProviderPollClient {
  const fetchImpl = input.fetchImpl ?? (globalThis.fetch as FetchLike)
  const provider: ClayProviderId = 'luma'

  const normalize = (taskId: string, raw: Record<string, unknown>): ClayJobPollResult => {
    const statusRaw = String(raw.state ?? raw.status ?? '').toLowerCase()
    const assets = asRecord(raw.assets) ?? {}
    const objUrl = pickString(assets.obj, raw.obj_url, raw.objUrl)
    const glbUrl = pickString(assets.glb, assets.mesh, raw.model_url, raw.modelUrl)
    const video = asRecord(raw.video)
    const meshUrl = pickString(objUrl, glbUrl, assets.scene, raw.download_url, video?.url)
    if (
      statusRaw === 'completed' ||
      statusRaw === 'succeeded' ||
      statusRaw === 'success' ||
      statusRaw === 'done'
    ) {
      return {
        provider,
        taskId,
        status: 'completed',
        progress: 100,
        objUrl,
        glbUrl,
        modelUrl: preferModelUrl(objUrl, glbUrl, meshUrl),
      }
    }
    if (
      statusRaw === 'failed' ||
      statusRaw === 'error' ||
      statusRaw === 'cancelled' ||
      statusRaw === 'canceled'
    ) {
      return {
        provider,
        taskId,
        status: 'failed',
        error: pickString(raw.failure_reason, raw.error, raw.message, 'luma_job_failed'),
      }
    }
    return {
      provider,
      taskId,
      status: statusRaw === 'queued' || statusRaw === 'pending' ? 'queued' : 'processing',
      progress: typeof raw.progress === 'number' ? raw.progress : undefined,
    }
  }

  return {
    provider,
    async pollJob(taskId) {
      // Dream Machine generation status — webhook-ready same shape via fromWebhookPayload.
      const response = await fetchImpl(
        `https://api.lumalabs.ai/dream-machine/v1/generations/${taskId}`,
        { headers: { Authorization: `Bearer ${input.apiKey}` } },
      )
      if (!response.ok) {
        return {
          provider,
          taskId,
          status: 'failed',
          error: `luma_http_${response.status}`,
        }
      }
      const raw = asRecord(await response.json())
      if (!raw) {
        return { provider, taskId, status: 'failed', error: 'luma_invalid_json' }
      }
      return normalize(taskId, raw)
    },
    fromWebhookPayload(body, taskIdHint) {
      const raw = asRecord(body)
      if (!raw) return null
      const taskId = pickString(raw.id, raw.generation_id, raw.task_id, raw.taskId, taskIdHint)
      if (!taskId) return null
      return normalize(taskId, raw)
    },
  }
}

/** Build poll client for a clay provider — null when BYOK key missing (fail-closed). */
export function createClayPollClient(
  provider: ClayProviderId,
  keys: ClayPollClientKeys,
  fetchImpl?: FetchLike,
): ClayProviderPollClient | null {
  if (provider === 'meshy' || provider === 'generic-mesh-gen') {
    if (!keys.MESHY_API_KEY && provider === 'meshy') return null
    if (provider === 'generic-mesh-gen') {
      // Prefer first available MoA clay key
      if (keys.MESHY_API_KEY) return createMeshyPollClient({ apiKey: keys.MESHY_API_KEY, fetchImpl })
      if (keys.TRIPO_API_KEY) return createTripoPollClient({ apiKey: keys.TRIPO_API_KEY, fetchImpl })
      if (keys.LUMA_API_KEY) return createLumaPollClient({ apiKey: keys.LUMA_API_KEY, fetchImpl })
      return null
    }
    return createMeshyPollClient({ apiKey: keys.MESHY_API_KEY!, fetchImpl })
  }
  if (provider === 'tripo') {
    if (!keys.TRIPO_API_KEY) return null
    return createTripoPollClient({ apiKey: keys.TRIPO_API_KEY, fetchImpl })
  }
  if (provider === 'luma') {
    if (!keys.LUMA_API_KEY) return null
    return createLumaPollClient({ apiKey: keys.LUMA_API_KEY, fetchImpl })
  }
  return null
}

export interface PollClayJobUntilReadyInput {
  client: ClayProviderPollClient
  taskId: string
  maxAttempts?: number
  intervalMs?: number
  sleep?: (ms: number) => Promise<void>
  /** Optional webhook body — skips HTTP when it already reports terminal status. */
  webhookPayload?: unknown
}

export type PollClayJobUntilReadyResult =
  | { ok: true; poll: ClayJobPollResult; attempts: number }
  | { ok: false; blockedReason: string; poll?: ClayJobPollResult; attempts: number }

export async function pollClayJobUntilReady(
  input: PollClayJobUntilReadyInput,
): Promise<PollClayJobUntilReadyResult> {
  const maxAttempts = Math.max(1, input.maxAttempts ?? 60)
  const intervalMs = Math.max(0, input.intervalMs ?? 0)
  const sleep =
    input.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))

  if (input.webhookPayload !== undefined) {
    const fromHook = input.client.fromWebhookPayload(input.webhookPayload, input.taskId)
    if (fromHook?.status === 'completed') {
      return { ok: true, poll: fromHook, attempts: 0 }
    }
    if (fromHook?.status === 'failed') {
      return {
        ok: false,
        blockedReason: fromHook.error ?? 'clay_job_failed',
        poll: fromHook,
        attempts: 0,
      }
    }
  }

  let last: ClayJobPollResult | undefined
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await input.client.pollJob(input.taskId)
    if (last.status === 'completed') {
      return { ok: true, poll: last, attempts: attempt }
    }
    if (last.status === 'failed') {
      return {
        ok: false,
        blockedReason: last.error ?? 'clay_job_failed',
        poll: last,
        attempts: attempt,
      }
    }
    if (attempt < maxAttempts && intervalMs > 0) {
      await sleep(intervalMs)
    }
  }

  return {
    ok: false,
    blockedReason: 'clay_poll_timeout',
    poll: last,
    attempts: maxAttempts,
  }
}

/**
 * Minimal GLB → RawMeshBuffer (POSITION + indices). Fail-closed on empty/malformed.
 * No Three.js dependency — CI-safe.
 */
export function parseGlbToRawMesh(bytes: Uint8Array): RawMeshBuffer | null {
  if (bytes.byteLength < 20) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const magic = view.getUint32(0, true)
  // glTF little-endian magic 0x46546C67 = 'glTF'
  if (magic !== 0x46546c67) return null
  const version = view.getUint32(4, true)
  if (version !== 2) return null
  const totalLength = view.getUint32(8, true)
  if (totalLength > bytes.byteLength) return null

  let offset = 12
  let json: Record<string, unknown> | null = null
  let bin: Uint8Array | null = null

  while (offset + 8 <= bytes.byteLength) {
    const chunkLength = view.getUint32(offset, true)
    const chunkType = view.getUint32(offset + 4, true)
    offset += 8
    if (offset + chunkLength > bytes.byteLength) return null
    const chunk = bytes.subarray(offset, offset + chunkLength)
    offset += chunkLength
    if (chunkType === 0x4e4f534a) {
      // JSON
      try {
        json = asRecord(JSON.parse(new TextDecoder().decode(chunk)))
      } catch {
        return null
      }
    } else if (chunkType === 0x004e4942) {
      bin = chunk
    }
  }

  if (!json || !bin) return null
  const accessors = Array.isArray(json.accessors) ? json.accessors : []
  const bufferViews = Array.isArray(json.bufferViews) ? json.bufferViews : []
  const meshes = Array.isArray(json.meshes) ? json.meshes : []
  if (meshes.length === 0) return null

  const positions: number[] = []
  const indices: number[] = []
  let vertexBase = 0

  const readAccessor = (
    accessorIndex: number,
  ): { values: number[]; count: number; componentCount: number } | null => {
    const accessor = asRecord(accessors[accessorIndex])
    if (!accessor) return null
    const bvIndex = accessor.bufferView
    if (typeof bvIndex !== 'number') return null
    const bv = asRecord(bufferViews[bvIndex])
    if (!bv) return null
    const byteOffset =
      (typeof bv.byteOffset === 'number' ? bv.byteOffset : 0) +
      (typeof accessor.byteOffset === 'number' ? accessor.byteOffset : 0)
    const count = typeof accessor.count === 'number' ? accessor.count : 0
    const componentType = typeof accessor.componentType === 'number' ? accessor.componentType : 0
    const type = String(accessor.type ?? '')
    const componentCount =
      type === 'SCALAR' ? 1 : type === 'VEC2' ? 2 : type === 'VEC3' ? 3 : type === 'VEC4' ? 4 : 0
    if (count <= 0 || componentCount <= 0) return null
    const strideHint = typeof bv.byteStride === 'number' ? bv.byteStride : 0
    const values: number[] = []
    const binView = new DataView(bin!.buffer, bin!.byteOffset, bin!.byteLength)

    for (let i = 0; i < count; i++) {
      const base =
        byteOffset +
        i * (strideHint || componentCount * componentTypeBytes(componentType))
      for (let c = 0; c < componentCount; c++) {
        const o = base + c * componentTypeBytes(componentType)
        if (o + componentTypeBytes(componentType) > bin!.byteLength) return null
        values.push(readComponent(binView, o, componentType))
      }
    }
    return { values, count, componentCount }
  }

  for (const meshUnknown of meshes) {
    const mesh = asRecord(meshUnknown)
    const primitives = Array.isArray(mesh?.primitives) ? mesh!.primitives : []
    for (const primUnknown of primitives) {
      const prim = asRecord(primUnknown)
      if (!prim) continue
      const attrs = asRecord(prim.attributes)
      if (!attrs || typeof attrs.POSITION !== 'number') continue
      const pos = readAccessor(attrs.POSITION)
      if (!pos || pos.componentCount !== 3 || pos.values.length < 9) continue

      const startVert = vertexBase
      for (let i = 0; i < pos.values.length; i++) positions.push(pos.values[i]!)
      vertexBase += pos.count

      if (typeof prim.indices === 'number') {
        const idx = readAccessor(prim.indices)
        if (!idx || idx.componentCount !== 1 || idx.values.length < 3) continue
        for (const v of idx.values) indices.push(startVert + (v | 0))
      } else {
        for (let i = 0; i < pos.count; i++) indices.push(startVert + i)
      }
    }
  }

  if (positions.length < 9 || indices.length < 3) return null
  return {
    positions: new Float32Array(positions),
    indices: Uint32Array.from(indices),
  }
}

function componentTypeBytes(componentType: number): number {
  switch (componentType) {
    case 5120:
    case 5121:
      return 1
    case 5122:
    case 5123:
      return 2
    case 5125:
    case 5126:
      return 4
    default:
      return 4
  }
}

function readComponent(view: DataView, offset: number, componentType: number): number {
  switch (componentType) {
    case 5120:
      return view.getInt8(offset)
    case 5121:
      return view.getUint8(offset)
    case 5122:
      return view.getInt16(offset, true)
    case 5123:
      return view.getUint16(offset, true)
    case 5125:
      return view.getUint32(offset, true)
    case 5126:
      return view.getFloat32(offset, true)
    default:
      return view.getFloat32(offset, true)
  }
}

export type ClayArtifactKind = 'obj' | 'glb' | 'unknown'

export interface DownloadClayArtifactResult {
  ok: boolean
  kind: ClayArtifactKind
  bytes?: Uint8Array
  text?: string
  mesh?: RawMeshBuffer
  blockedReason?: string
  sourceUrl: string
}

export async function downloadClayArtifactToMesh(input: {
  url: string
  fetchImpl?: FetchLike
}): Promise<DownloadClayArtifactResult> {
  const fetchImpl = input.fetchImpl ?? (globalThis.fetch as FetchLike)
  try {
    const response = await fetchImpl(input.url, { method: 'GET' })
    if (!response.ok) {
      return {
        ok: false,
        kind: 'unknown',
        sourceUrl: input.url,
        blockedReason: `clay_download_http_${response.status}`,
      }
    }
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
    const lowerUrl = input.url.toLowerCase()
    const preferObj =
      lowerUrl.includes('.obj') ||
      contentType.includes('text/plain') ||
      contentType.includes('model/obj') ||
      contentType.includes('wavefront')

    if (preferObj || (!lowerUrl.includes('.glb') && contentType.includes('text'))) {
      const text = await response.text()
      const mesh = parseObjToRawMesh(text)
      if (!mesh) {
        return {
          ok: false,
          kind: 'obj',
          text,
          sourceUrl: input.url,
          blockedReason: 'clay_obj_parse_empty',
        }
      }
      return { ok: true, kind: 'obj', text, mesh, sourceUrl: input.url }
    }

    const buffer = new Uint8Array(await response.arrayBuffer())
    // Heuristic: OBJ disguised as octet-stream
    const head = new TextDecoder().decode(buffer.subarray(0, Math.min(64, buffer.byteLength)))
    if (head.includes('v ') && (head.includes('\nf ') || head.includes('\r\nf '))) {
      const text = new TextDecoder().decode(buffer)
      const mesh = parseObjToRawMesh(text)
      if (!mesh) {
        return {
          ok: false,
          kind: 'obj',
          text,
          sourceUrl: input.url,
          blockedReason: 'clay_obj_parse_empty',
        }
      }
      return { ok: true, kind: 'obj', text, bytes: buffer, mesh, sourceUrl: input.url }
    }

    const mesh = parseGlbToRawMesh(buffer)
    if (!mesh) {
      return {
        ok: false,
        kind: 'glb',
        bytes: buffer,
        sourceUrl: input.url,
        blockedReason: 'clay_glb_parse_empty',
      }
    }
    return { ok: true, kind: 'glb', bytes: buffer, mesh, sourceUrl: input.url }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'clay_download_failed'
    log.info('Clay artifact download fail-closed', { url: input.url, msg })
    return {
      ok: false,
      kind: 'unknown',
      sourceUrl: input.url,
      blockedReason: msg,
    }
  }
}

export interface ResolveLiveClayMeshInput {
  provider: ClayProviderId
  taskId: string
  keys: ClayPollClientKeys
  fetchImpl?: FetchLike
  maxAttempts?: number
  intervalMs?: number
  sleep?: (ms: number) => Promise<void>
  webhookPayload?: unknown
  /** Skip poll when URL already known (e.g. status route modelUrl). */
  modelUrl?: string
  client?: ClayProviderPollClient
}

export interface ResolveLiveClayMeshResult {
  ok: boolean
  mesh?: RawMeshBuffer
  objText?: string
  poll?: ClayJobPollResult
  blockedReason?: string
  receipt: MeshQualityStageReceipt
}

/**
 * Poll (or webhook) → download clay bytes → RawMeshBuffer.
 * Empty-honest on failed jobs / missing BYOK / empty mesh.
 */
export async function resolveLiveClayMesh(
  input: ResolveLiveClayMeshInput,
): Promise<ResolveLiveClayMeshResult> {
  const client =
    input.client ?? createClayPollClient(input.provider, input.keys, input.fetchImpl)
  if (!client && !input.modelUrl) {
    return {
      ok: false,
      blockedReason: `BYOK_MISSING_FOR_${input.provider.toUpperCase()}`,
      receipt: {
        stage: 'clay-ingest',
        status: 'rejected',
        evidence: ['fail-closed', 'zero-ui', 'live-clay-poll', LIVE_CLAY_POLL_LETTER],
        heldReason: `BYOK_MISSING_FOR_${input.provider.toUpperCase()}`,
      },
    }
  }

  let modelUrl = input.modelUrl
  let poll: ClayJobPollResult | undefined

  if (!modelUrl) {
    if (!client) {
      return {
        ok: false,
        blockedReason: `BYOK_MISSING_FOR_${input.provider.toUpperCase()}`,
        receipt: {
          stage: 'clay-ingest',
          status: 'rejected',
          evidence: ['fail-closed', 'zero-ui', 'live-clay-poll'],
          heldReason: `BYOK_MISSING_FOR_${input.provider.toUpperCase()}`,
        },
      }
    }
    const polled = await pollClayJobUntilReady({
      client,
      taskId: input.taskId,
      maxAttempts: input.maxAttempts,
      intervalMs: input.intervalMs,
      sleep: input.sleep,
      webhookPayload: input.webhookPayload,
    })
    if (!polled.ok) {
      return {
        ok: false,
        poll: polled.poll,
        blockedReason: polled.blockedReason,
        receipt: {
          stage: 'clay-ingest',
          status: 'rejected',
          evidence: ['fail-closed', 'zero-ui', 'live-clay-poll', 'job-failed-or-timeout'],
          heldReason: polled.blockedReason,
          metrics: { attempts: polled.attempts },
        },
      }
    }
    poll = polled.poll
    modelUrl = polled.poll.modelUrl
    if (!modelUrl) {
      return {
        ok: false,
        poll,
        blockedReason: 'clay_model_url_missing',
        receipt: {
          stage: 'clay-ingest',
          status: 'rejected',
          evidence: ['fail-closed', 'empty-honest', 'live-clay-poll'],
          heldReason: 'clay_model_url_missing',
        },
      }
    }
  }

  const downloaded = await downloadClayArtifactToMesh({
    url: modelUrl,
    fetchImpl: input.fetchImpl,
  })
  if (!downloaded.ok || !downloaded.mesh) {
    return {
      ok: false,
      poll,
      blockedReason: downloaded.blockedReason ?? 'clay_download_empty',
      receipt: {
        stage: 'clay-ingest',
        status: 'rejected',
        evidence: ['fail-closed', 'empty-honest', 'live-clay-poll', `kind:${downloaded.kind}`],
        heldReason: downloaded.blockedReason ?? 'clay_download_empty',
      },
    }
  }

  return {
    ok: true,
    mesh: downloaded.mesh,
    objText: downloaded.text,
    poll,
    receipt: {
      stage: 'clay-ingest',
      status: 'closed',
      evidence: [
        'live-clay-poll',
        LIVE_CLAY_POLL_LETTER,
        `provider:${input.provider}`,
        `kind:${downloaded.kind}`,
      ],
      metrics: {
        taskId: input.taskId,
        triangles: Math.floor(downloaded.mesh.indices.length / 3),
      },
    },
  }
}

/** Build a unit-cube GLB fixture for Vitest (no provider keys). */
export function buildMinimalGlbFixture(): Uint8Array {
  const json = {
    asset: { version: '2.0' },
    buffers: [{ byteLength: 96 + 24 }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 96, target: 34962 },
      { buffer: 0, byteOffset: 96, byteLength: 24, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 8,
        type: 'VEC3',
        max: [1, 1, 1],
        min: [-1, -1, -1],
      },
      {
        bufferView: 1,
        componentType: 5123,
        count: 12,
        type: 'SCALAR',
      },
    ],
    meshes: [
      {
        primitives: [{ attributes: { POSITION: 0 }, indices: 1 }],
      },
    ],
  }

  const positions = new Float32Array([
    -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
  ])
  // two triangles on one face — enough for parse (indices length >= 3); add a few more for realism
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])

  const bin = new Uint8Array(positions.byteLength + indices.byteLength)
  bin.set(new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength), 0)
  bin.set(new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength), positions.byteLength)

  const jsonText = JSON.stringify(json)
  const jsonPad = (4 - (jsonText.length % 4)) % 4
  const jsonBytes = new Uint8Array(jsonText.length + jsonPad)
  jsonBytes.set(new TextEncoder().encode(jsonText), 0)
  for (let i = 0; i < jsonPad; i++) jsonBytes[jsonText.length + i] = 0x20

  const binPad = (4 - (bin.byteLength % 4)) % 4
  const binPadded = new Uint8Array(bin.byteLength + binPad)
  binPadded.set(bin, 0)

  const totalLength = 12 + 8 + jsonBytes.byteLength + 8 + binPadded.byteLength
  const out = new Uint8Array(totalLength)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, totalLength, true)
  let o = 12
  view.setUint32(o, jsonBytes.byteLength, true)
  view.setUint32(o + 4, 0x4e4f534a, true)
  o += 8
  out.set(jsonBytes, o)
  o += jsonBytes.byteLength
  view.setUint32(o, binPadded.byteLength, true)
  view.setUint32(o + 4, 0x004e4942, true)
  o += 8
  out.set(binPadded, o)
  return out
}
