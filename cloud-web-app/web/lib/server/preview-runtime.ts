export type PreviewRuntimeProbeStatus = 'reachable' | 'unhealthy' | 'unreachable' | 'invalid'

export type PreviewRuntimeProbeResult = {
  url: string
  status: PreviewRuntimeProbeStatus
  reachable: boolean
  latencyMs?: number
  httpStatus?: number
  reason?: string
}

export type PreviewRuntimeDiscoverResult = {
  scannedAt: string
  preferredRuntimeUrl: string | null
  candidates: PreviewRuntimeProbeResult[]
  summary: {
    total: number
    reachable: number
    unhealthy: number
    unreachable: number
    invalid: number
  }
}

export const LOCAL_ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
export const LOCAL_ALLOWED_PORTS = new Set(['', '3000', '3001', '4173', '5173', '8080', '4200'])
export const MAX_RUNTIME_DISCOVERY_CANDIDATES = 10

export const DEFAULT_RUNTIME_CANDIDATES = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080',
  'http://localhost:4200',
  'http://localhost:3001',
]

function parseCsvSet(raw: string | undefined): Set<string> {
  return new Set(
    String(raw || '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  )
}

function hostMatchesAllowlist(host: string, allowlist: Set<string>): boolean {
  const normalizedHost = host.toLowerCase()
  for (const allowed of allowlist) {
    if (!allowed) continue
    if (allowed.startsWith('.')) {
      if (normalizedHost.endsWith(allowed)) return true
      continue
    }
    if (normalizedHost === allowed) return true
  }
  return false
}

export function isAllowedRuntimeUrl(url: URL): boolean {
  if (!['http:', 'https:'].includes(url.protocol)) return false
  const extraAllowedHosts = parseCsvSet(process.env.AETHEL_PREVIEW_ALLOWED_HOSTS)
  const extraAllowedPorts = parseCsvSet(process.env.AETHEL_PREVIEW_ALLOWED_PORTS)
  const hostAllowed =
    LOCAL_ALLOWED_HOSTS.has(url.hostname) ||
    url.hostname.endsWith('.localhost') ||
    hostMatchesAllowlist(url.hostname, extraAllowedHosts)
  if (!hostAllowed) return false
  if (LOCAL_ALLOWED_PORTS.has(url.port)) return true
  if (extraAllowedPorts.size > 0 && extraAllowedPorts.has(url.port)) return true
  return false
}

export function normalizeRuntimeCandidate(raw: string): string | null {
  const value = String(raw || '').trim()
  if (!value) return null
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return null
  }
  if (!isAllowedRuntimeUrl(parsed)) return null
  return parsed.toString().replace(/\/$/, '')
}

export async function probeRuntimeUrl(target: string, timeoutMs = 2500): Promise<PreviewRuntimeProbeResult> {
  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return {
      url: target,
      status: 'invalid',
      reachable: false,
      reason: 'invalid_url',
    }
  }

  if (!isAllowedRuntimeUrl(parsed)) {
    return {
      url: parsed.toString(),
      status: 'invalid',
      reachable: false,
      reason: 'blocked_host',
    }
  }

  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(parsed.toString(), {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    const latencyMs = Date.now() - startedAt
    if (response.ok) {
      return {
        url: parsed.toString().replace(/\/$/, ''),
        status: 'reachable',
        reachable: true,
        httpStatus: response.status,
        latencyMs,
      }
    }
    return {
      url: parsed.toString().replace(/\/$/, ''),
      status: 'unhealthy',
      reachable: false,
      httpStatus: response.status,
      latencyMs,
    }
  } catch (error) {
    return {
      url: parsed.toString().replace(/\/$/, ''),
      status: 'unreachable',
      reachable: false,
      latencyMs: Date.now() - startedAt,
      reason: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network',
    }
  } finally {
    clearTimeout(timeout)
  }
}

function dedupeCandidates(candidates: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    const value = String(candidate || '').trim()
    if (!value) continue
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

export function parseRuntimeDiscoveryCandidates(params: URLSearchParams): string[] {
  const repeated = params.getAll('candidate')
  const csv = (params.get('candidates') || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  return dedupeCandidates([...repeated, ...csv])
}

export async function discoverPreviewRuntime(
  candidates: string[],
  timeoutMs = 1800
): Promise<PreviewRuntimeDiscoverResult> {
  const list = dedupeCandidates(candidates)
  const results = await Promise.all(list.map((candidate) => probeRuntimeUrl(candidate, timeoutMs)))
  const preferred = results.find((result) => result.status === 'reachable')?.url ?? null
  return {
    scannedAt: new Date().toISOString(),
    preferredRuntimeUrl: preferred,
    candidates: results,
    summary: {
      total: results.length,
      reachable: results.filter((result) => result.status === 'reachable').length,
      unhealthy: results.filter((result) => result.status === 'unhealthy').length,
      unreachable: results.filter((result) => result.status === 'unreachable').length,
      invalid: results.filter((result) => result.status === 'invalid').length,
    },
  }
}
