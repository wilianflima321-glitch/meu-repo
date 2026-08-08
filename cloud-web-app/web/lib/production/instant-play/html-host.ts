/**
 * Instant Play — html-host stage.
 *
 * Persists cooked Instant Play HTML + JS under a stable key and returns an
 * iframeable text/html URL (`/api/hub/instant-play/.../index.html`). Uses S3
 * when configured, otherwise the local object emulator — never invents a URL
 * without storing real bytes.
 */

import {
  isS3Available,
  localGetObjectBuffer,
  localPutObject,
  putObject,
  resolveStorageBackendConfig,
  getS3Client,
  getS3Commands,
} from '@/lib/storage/s3-client'
import { createComponentLogger } from '@/lib/observability/logger'
import { INSTANT_PLAY_HTML_PATH } from '@/lib/production/instant-play/html-emitter'

const log = createComponentLogger('instant-play.html-host')

export interface InstantPlayHostAsset {
  /** Relative path under the instant-play prefix (e.g. index.html, runtime.bundle.js). */
  relativePath: string
  body: string | Buffer
  contentType: string
}

export interface InstantPlayHostInput {
  projectId: string
  jobId: string
  assets: InstantPlayHostAsset[]
  /** Public app origin for absolute demoPlayUrl. */
  publicBaseUrl?: string
}

export type InstantPlayHostResult =
  | {
      ok: true
      demoPlayUrl: string
      storagePrefix: string
      backend: 's3' | 'local-emulator'
      hostedPaths: string[]
    }
  | {
      ok: false
      reason: string
      heldStage: 'html-host'
    }

export function buildInstantPlayStoragePrefix(projectId: string, jobId: string): string {
  const safe = (s: string) =>
    String(s || '')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80) || 'unknown'
  return `exports/${safe(projectId)}/${safe(jobId)}/instant-play`
}

export function buildInstantPlayPublicUrl(input: {
  projectId: string
  jobId: string
  publicBaseUrl?: string
  assetPath?: string
}): string {
  const base = (input.publicBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  )
  const asset = (input.assetPath || INSTANT_PLAY_HTML_PATH).replace(/^\//, '')
  return `${base}/api/hub/instant-play/${encodeURIComponent(input.projectId)}/${encodeURIComponent(input.jobId)}/${asset}`
}

async function putHostedObject(
  key: string,
  body: string | Buffer,
  contentType: string,
): Promise<{ ok: boolean; backend: 's3' | 'local-emulator' }> {
  const s3Ok = await isS3Available()
  if (s3Ok) {
    const uploaded = await putObject(key, body, contentType)
    if (uploaded.ok) return { ok: true, backend: 's3' }
    log.warn('instant_play_s3_put_failed_fallback_local', { key })
  }
  await localPutObject(key, typeof body === 'string' ? body : body)
  return { ok: true, backend: 'local-emulator' }
}

/**
 * Host Instant Play assets and return a stable iframeable HTML URL.
 */
export async function hostInstantPlaySlice(
  input: InstantPlayHostInput,
): Promise<InstantPlayHostResult> {
  if (!input.assets.length) {
    return {
      ok: false,
      reason: 'html-host held — no assets to host (empty artifact forbidden)',
      heldStage: 'html-host',
    }
  }

  const htmlAsset = input.assets.find((a) => a.relativePath === INSTANT_PLAY_HTML_PATH)
  if (!htmlAsset) {
    return {
      ok: false,
      reason: 'html-host held — index.html missing from asset set',
      heldStage: 'html-host',
    }
  }
  const htmlBody = typeof htmlAsset.body === 'string' ? htmlAsset.body : htmlAsset.body.toString('utf8')
  if (!htmlBody.includes('id="aethel-root"') || !htmlBody.includes('type="module"')) {
    return {
      ok: false,
      reason: 'html-host held — HTML does not mount runtime (theater rejected)',
      heldStage: 'html-host',
    }
  }

  const prefix = buildInstantPlayStoragePrefix(input.projectId, input.jobId)
  const hostedPaths: string[] = []
  let backend: 's3' | 'local-emulator' = 'local-emulator'

  for (const asset of input.assets) {
    const rel = asset.relativePath.replace(/^\/+/, '')
    if (!rel || rel.includes('..')) {
      return {
        ok: false,
        reason: `html-host held — invalid asset path: ${asset.relativePath}`,
        heldStage: 'html-host',
      }
    }
    const key = `${prefix}/${rel}`
    const put = await putHostedObject(key, asset.body, asset.contentType)
    if (!put.ok) {
      return {
        ok: false,
        reason: `html-host held — failed to store ${rel}`,
        heldStage: 'html-host',
      }
    }
    backend = put.backend
    hostedPaths.push(key)
  }

  const demoPlayUrl = buildInstantPlayPublicUrl({
    projectId: input.projectId,
    jobId: input.jobId,
    publicBaseUrl: input.publicBaseUrl,
    assetPath: INSTANT_PLAY_HTML_PATH,
  })

  log.info('instant_play_hosted', {
    projectId: input.projectId,
    jobId: input.jobId,
    backend,
    assetCount: hostedPaths.length,
    demoPlayUrl,
  })

  return {
    ok: true,
    demoPlayUrl,
    storagePrefix: prefix,
    backend,
    hostedPaths,
  }
}

/**
 * Read a previously hosted Instant Play asset (route handler).
 */
export async function readInstantPlayHostedAsset(input: {
  projectId: string
  jobId: string
  relativePath: string
}): Promise<{ ok: true; body: Buffer; contentType: string } | { ok: false; reason: string }> {
  const rel = (input.relativePath || INSTANT_PLAY_HTML_PATH).replace(/^\/+/, '')
  if (!rel || rel.includes('..')) {
    return { ok: false, reason: 'invalid_path' }
  }
  const key = `${buildInstantPlayStoragePrefix(input.projectId, input.jobId)}/${rel}`

  const local = await localGetObjectBuffer(key)
  if (local) {
    return { ok: true, body: local, contentType: contentTypeForPath(rel) }
  }

  const remote = await getObjectBuffer(key)
  if (remote) {
    return { ok: true, body: remote, contentType: contentTypeForPath(rel) }
  }

  return { ok: false, reason: 'not_found' }
}

function contentTypeForPath(relativePath: string): string {
  const lower = relativePath.toLowerCase()
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html; charset=utf-8'
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) return 'text/javascript; charset=utf-8'
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8'
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8'
  return 'application/octet-stream'
}

async function getObjectBuffer(key: string): Promise<Buffer | null> {
  const client = await getS3Client()
  const commands = await getS3Commands()
  if (!client || !commands) return null
  try {
    const cfg = resolveStorageBackendConfig()
    const bucket = cfg.bucket || 'aethel-assets'
    const command = new commands.GetObjectCommand({ Bucket: bucket, Key: key })
    const response = (await client.send(command)) as {
      Body?: AsyncIterable<Uint8Array> | Uint8Array
    }
    const body = response.Body
    if (!body) return null
    const chunks: Uint8Array[] = []
    if (Symbol.asyncIterator in Object(body)) {
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk)
      }
    } else {
      chunks.push(body as Uint8Array)
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)))
  } catch {
    return null
  }
}
