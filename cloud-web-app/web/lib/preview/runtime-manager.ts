export type PreviewRuntimeHealthStatus =
  | 'idle'
  | 'checking'
  | 'reachable'
  | 'unreachable'
  | 'unhealthy'
  | 'invalid'

export const PREVIEW_RUNTIME_URL_STORAGE_KEY = 'aethel.workbench.preview.runtimeUrl';
export const DEFAULT_PREVIEW_RUNTIME_URL = process.env.NEXT_PUBLIC_PREVIEW_RUNTIME_URL?.trim() || null;

export type PreviewRuntimeHealthState = {
  status: PreviewRuntimeHealthStatus;
  latencyMs?: number;
  httpStatus?: number;
  reason?: string;
};

export type PreviewRuntimeDiscoveryResponse = {
  preferredRuntimeUrl?: string | null;
  candidates?: Array<{
    url?: string;
    status?: PreviewRuntimeHealthStatus;
    latencyMs?: number;
    httpStatus?: number;
    reason?: string;
  }>;
};

export type PreviewRuntimeProvisionResponse = {
  runtimeUrl?: string | null;
  error?: string;
  message?: string;
  metadata?: {
    mode?: string;
  };
};

export function normalizeRuntimeUrl(input: string | null): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

export function getStoredPreviewRuntimeUrl(storageKey = PREVIEW_RUNTIME_URL_STORAGE_KEY): string | null {
  if (typeof window === 'undefined') return null;
  return normalizeRuntimeUrl(window.localStorage.getItem(storageKey));
}

export function persistPreviewRuntimeUrl(runtimeUrl: string | null, storageKey = PREVIEW_RUNTIME_URL_STORAGE_KEY) {
  if (typeof window === 'undefined') return;
  if (runtimeUrl) {
    window.localStorage.setItem(storageKey, runtimeUrl);
  } else {
    window.localStorage.removeItem(storageKey);
  }
}

function getRuntimeAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('aethel-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function discoverPreviewRuntime(): Promise<string | null> {
  const response = await fetch('/api/preview/runtime-discover', { cache: 'no-store' });
  const payload = (await response.json().catch(() => null)) as PreviewRuntimeDiscoveryResponse | null;
  if (!response.ok) {
    const reason = (payload as { error?: string } | null)?.error || `HTTP ${response.status}`;
    throw new Error(reason);
  }
  return normalizeRuntimeUrl(payload?.preferredRuntimeUrl ?? null);
}

export async function provisionPreviewRuntime(projectId: string | null): Promise<{
  runtimeUrl: string | null;
  metadataMode?: string;
}> {
  const response = await fetch('/api/preview/runtime-provision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getRuntimeAuthHeaders(),
    },
    body: JSON.stringify({ projectId }),
  });
  const payload = (await response.json().catch(() => null)) as PreviewRuntimeProvisionResponse | null;
  if (!response.ok) {
    const reason = payload?.error || payload?.message || `HTTP ${response.status}`;
    throw new Error(reason);
  }
  return {
    runtimeUrl: normalizeRuntimeUrl(payload?.runtimeUrl ?? null),
    metadataMode: payload?.metadata?.mode,
  };
}

export async function checkPreviewRuntimeHealth(runtimeUrl: string | null): Promise<PreviewRuntimeHealthState> {
  if (!runtimeUrl) {
    return { status: 'idle' };
  }

  const response = await fetch(`/api/preview/runtime-health?url=${encodeURIComponent(runtimeUrl)}`, {
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      status: 'invalid',
      reason: typeof payload?.error === 'string' ? payload.error : 'health_check_failed',
    };
  }

  const status = typeof payload?.status === 'string' ? payload.status : 'unreachable';
  if (status === 'reachable') {
    return {
      status: 'reachable',
      latencyMs: typeof payload?.latencyMs === 'number' ? payload.latencyMs : undefined,
      httpStatus: typeof payload?.httpStatus === 'number' ? payload.httpStatus : undefined,
    };
  }
  if (status === 'unhealthy') {
    return {
      status: 'unhealthy',
      latencyMs: typeof payload?.latencyMs === 'number' ? payload.latencyMs : undefined,
      httpStatus: typeof payload?.httpStatus === 'number' ? payload.httpStatus : undefined,
    };
  }

  return {
    status: 'unreachable',
    latencyMs: typeof payload?.latencyMs === 'number' ? payload.latencyMs : undefined,
    reason: typeof payload?.reason === 'string' ? payload.reason : 'network',
  };
}
