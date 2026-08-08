import {
  getWorkbenchPreviewRuntimeUrl,
  getWorkbenchPreviewSandboxId,
  setWorkbenchPreviewRuntimeUrl,
  setWorkbenchPreviewSandboxId,
} from '@/lib/storage/ui-persistence-spine'

export type PreviewRuntimeHealthStatus =
  | 'idle'
  | 'checking'
  | 'reachable'
  | 'unreachable'
  | 'unhealthy'
  | 'invalid'

export const PREVIEW_RUNTIME_URL_STORAGE_KEY = 'aethel.workbench.preview.runtimeUrl';
export const PREVIEW_RUNTIME_SANDBOX_ID_STORAGE_KEY = 'aethel.workbench.preview.sandboxId';
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
  guidance?: {
    strategy?: 'managed' | 'local' | 'inline' | string;
    managedProvider?: string | null;
    managedProviderLabel?: string | null;
    managedProviderMode?: 'route-managed' | 'browser-side' | 'unknown' | string;
    instructions?: string[];
    recommendedCommands?: string[];
  };
};

export type PreviewRuntimeProvisionResponse = {
  runtimeUrl?: string | null;
  strategy?: 'managed' | 'local' | 'browser-side' | string;
  provider?: string | null;
  sandboxId?: string | null;
  sandboxSessionId?: string | null;
  error?: string;
  message?: string;
  metadata?: {
    mode?: string;
    strategy?: 'managed' | 'local' | 'browser-side' | string;
    provider?: string;
    endpoint?: string;
    sandboxId?: string;
    sandboxSessionId?: string;
    filesCount?: number;
    totalBytes?: number;
    startMode?: string;
    workdir?: string;
  };
};

type PreviewRuntimeSyncMetadata = {
  sandboxId?: string;
  filesCount?: number;
  totalBytes?: number;
  workdir?: string;
};

type PreviewRuntimeFileSyncMetadata = {
  sandboxId?: string;
  path?: string;
  sandboxPath?: string;
  size?: number;
};

type PreviewRuntimeMutationResponse<TMetadata> = {
  success?: boolean;
  error?: string;
  message?: string;
  metadata?: TMetadata;
};

export type PreviewRuntimeReadinessResponse = {
  status?: 'ready' | 'partial' | string;
  strategy?: 'managed' | 'local' | 'inline' | string;
  recommendedAction?: 'provision' | 'discover' | 'inline' | string;
  managedConfigured?: boolean;
  managedProvider?: string | null;
  managedProviderLabel?: string | null;
  managedProviderMode?: 'route-managed' | 'browser-side' | 'unknown' | string;
  managedSetupEnv?: string[];
  routeProvisionSupported?: boolean;
  preferredRuntimeUrl?: string | null;
  readyForManagedProvision?: boolean;
  blockers?: string[];
  instructions?: string[];
  recommendedCommands?: string[];
  metadata?: {
    configuredEndpoints?: string[];
    localDiscovery?: {
      preferredRuntimeUrl?: string | null;
      reachableCandidates?: number;
      totalCandidates?: number;
    };
  };
}

export function normalizeRuntimeUrl(input: string | null): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+(:\d+)?(\/.*)?$/.test(value)) {
    return `http://${value}`;
  }
  return null;
}

export function getStoredPreviewRuntimeUrl(storageKey = PREVIEW_RUNTIME_URL_STORAGE_KEY): string | null {
  if (typeof window === 'undefined') return null;
  // CW4 — critical workbench preview URL via spine (legacy key mirrored).
  if (storageKey === PREVIEW_RUNTIME_URL_STORAGE_KEY) {
    return normalizeRuntimeUrl(getWorkbenchPreviewRuntimeUrl());
  }
  return normalizeRuntimeUrl(window.localStorage.getItem(storageKey));
}

export function persistPreviewRuntimeUrl(runtimeUrl: string | null, storageKey = PREVIEW_RUNTIME_URL_STORAGE_KEY) {
  if (typeof window === 'undefined') return;
  if (storageKey === PREVIEW_RUNTIME_URL_STORAGE_KEY) {
    setWorkbenchPreviewRuntimeUrl(runtimeUrl);
    return;
  }
  if (runtimeUrl) {
    window.localStorage.setItem(storageKey, runtimeUrl);
  } else {
    window.localStorage.removeItem(storageKey);
  }
}

export function getStoredPreviewSandboxId(storageKey = PREVIEW_RUNTIME_SANDBOX_ID_STORAGE_KEY): string | null {
  if (typeof window === 'undefined') return null;
  if (storageKey === PREVIEW_RUNTIME_SANDBOX_ID_STORAGE_KEY) {
    return getWorkbenchPreviewSandboxId();
  }
  const value = window.localStorage.getItem(storageKey);
  return value && value.trim() ? value.trim() : null;
}

export function persistPreviewSandboxId(sandboxId: string | null, storageKey = PREVIEW_RUNTIME_SANDBOX_ID_STORAGE_KEY) {
  if (typeof window === 'undefined') return;
  if (storageKey === PREVIEW_RUNTIME_SANDBOX_ID_STORAGE_KEY) {
    setWorkbenchPreviewSandboxId(sandboxId);
    return;
  }
  if (sandboxId) {
    window.localStorage.setItem(storageKey, sandboxId);
  } else {
    window.localStorage.removeItem(storageKey);
  }
}

function getRuntimeAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('aethel-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function discoverPreviewRuntimeDetails(): Promise<PreviewRuntimeDiscoveryResponse> {
  const response = await fetch('/api/preview/runtime-discover', { cache: 'no-store' });
  const payload = (await response.json().catch(() => null)) as PreviewRuntimeDiscoveryResponse | null;
  if (!response.ok) {
    const reason = (payload as { error?: string } | null)?.error || `HTTP ${response.status}`;
    throw new Error(reason);
  }
  return payload || {};
}

export async function discoverPreviewRuntime(): Promise<string | null> {
  const payload = await discoverPreviewRuntimeDetails();
  return normalizeRuntimeUrl(payload?.preferredRuntimeUrl ?? null);
}

function extractProvisionSandboxId(payload: PreviewRuntimeProvisionResponse | null): string | null {
  const candidates = [
    payload?.sandboxId,
    payload?.sandboxSessionId,
    payload?.metadata?.sandboxId,
    payload?.metadata?.sandboxSessionId,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

export async function provisionPreviewRuntime(projectId: string | null): Promise<{
  runtimeUrl: string | null;
  metadataMode?: string;
  metadata?: PreviewRuntimeProvisionResponse['metadata'] | null;
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
  const sandboxId = extractProvisionSandboxId(payload);
  const metadata = payload?.metadata
    ? {
        ...payload.metadata,
        sandboxId: payload.metadata.sandboxId || sandboxId || undefined,
        sandboxSessionId: payload.metadata.sandboxSessionId || sandboxId || undefined,
      }
    : sandboxId
      ? { sandboxId, sandboxSessionId: sandboxId }
      : null;
  return {
    runtimeUrl: normalizeRuntimeUrl(payload?.runtimeUrl ?? null),
    metadataMode: payload?.metadata?.mode,
    metadata,
  };
}

/** L.8 — tear down a provisioned preview sandbox session (fail-soft). */
export async function teardownPreviewRuntime(sandboxId: string | null): Promise<boolean> {
  if (!sandboxId) return false;
  try {
    const response = await fetch('/api/preview/runtime-teardown', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getRuntimeAuthHeaders(),
      },
      body: JSON.stringify({ sandboxSessionId: sandboxId, sandboxId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function syncPreviewRuntime(projectId: string | null, sandboxId: string | null): Promise<{
  success: boolean;
  metadata?: {
    sandboxId?: string;
    filesCount?: number;
    totalBytes?: number;
    workdir?: string;
  };
}> {
  if (!sandboxId) {
    throw new Error('sandboxId e obrigatorio para sincronizar o runtime.');
  }
  const response = await fetch('/api/preview/runtime-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getRuntimeAuthHeaders(),
    },
    body: JSON.stringify({ projectId, sandboxId }),
  });
  const payload = (await response.json().catch(() => null)) as PreviewRuntimeMutationResponse<PreviewRuntimeSyncMetadata> | null;
  if (!response.ok) {
    const reason = payload?.error || payload?.message || `HTTP ${response.status}`;
    throw new Error(reason);
  }
  return {
    success: Boolean(payload?.success),
    metadata: payload?.metadata,
  };
}

export async function syncPreviewRuntimeFile(projectId: string | null, sandboxId: string | null, filePath: string): Promise<{
  success: boolean;
  metadata?: {
    sandboxId?: string;
    path?: string;
    sandboxPath?: string;
    size?: number;
  };
}> {
  if (!sandboxId) {
    throw new Error('sandboxId e obrigatorio para sincronizar o runtime.')
  }
  if (!filePath) {
    throw new Error('path e obrigatorio para sincronizar o runtime.')
  }
  const response = await fetch('/api/preview/runtime-sync-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getRuntimeAuthHeaders(),
    },
    body: JSON.stringify({ projectId, sandboxId, path: filePath }),
  })
  const payload = (await response.json().catch(() => null)) as PreviewRuntimeMutationResponse<PreviewRuntimeFileSyncMetadata> | null
  if (!response.ok) {
    const reason = payload?.error || payload?.message || `HTTP ${response.status}`
    throw new Error(reason)
  }
  return {
    success: Boolean(payload?.success),
    metadata: payload?.metadata,
  }
}

export type PreviewHotUpdateResponse = {
  ok: boolean
  success?: boolean
  hmr: boolean
  reload: boolean
  mode: 'hmr' | 'reload' | 'denied'
  reusedSession: boolean
  filesSynced: number
  message?: string
  sandboxSessionId?: string
  strategy?: string
  error?: string
}

/**
 * L.8 — sync applied files into a live preview session and return honesty flags.
 * Fail-closed when sandboxId is missing (caller must not invent HMR).
 */
export async function requestPreviewHotUpdate(input: {
  projectId?: string | null
  sandboxId: string | null
  paths?: string[]
  files?: Array<{ path: string; content: string }>
  clientHmrConnected?: boolean
  preferHmr?: boolean
}): Promise<PreviewHotUpdateResponse> {
  if (!input.sandboxId) {
    return {
      ok: false,
      hmr: false,
      reload: false,
      mode: 'denied',
      reusedSession: false,
      filesSynced: 0,
      message: 'No live preview sandboxId — hot-update fail-closed (provision first).',
      error: 'RUNTIME_HOT_UPDATE_MISSING_SESSION',
    }
  }

  const response = await fetch('/api/preview/runtime-hot-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getRuntimeAuthHeaders(),
    },
    body: JSON.stringify({
      projectId: input.projectId,
      sandboxSessionId: input.sandboxId,
      sandboxId: input.sandboxId,
      paths: input.paths,
      files: input.files,
      clientHmrConnected: Boolean(input.clientHmrConnected),
      preferHmr: Boolean(input.preferHmr),
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | (PreviewHotUpdateResponse & {
        metadata?: Partial<PreviewHotUpdateResponse>
      })
    | null

  const meta = payload?.metadata
  const hmr = Boolean(payload?.hmr ?? meta?.hmr)
  const reload = Boolean(payload?.reload ?? meta?.reload)
  const mode =
    payload?.mode === 'hmr' || payload?.mode === 'reload' || payload?.mode === 'denied'
      ? payload.mode
      : meta?.mode === 'hmr' || meta?.mode === 'reload' || meta?.mode === 'denied'
        ? meta.mode
        : 'denied'
  const filesSynced =
    typeof payload?.filesSynced === 'number'
      ? payload.filesSynced
      : typeof meta?.filesSynced === 'number'
        ? meta.filesSynced
        : 0

  if (!response.ok) {
    return {
      ok: false,
      hmr: false,
      reload: false,
      mode: 'denied',
      reusedSession: Boolean(payload?.reusedSession ?? meta?.reusedSession),
      filesSynced,
      message: payload?.message || payload?.error || `HTTP ${response.status}`,
      sandboxSessionId: payload?.sandboxSessionId ?? meta?.sandboxSessionId,
      strategy: payload?.strategy ?? meta?.strategy,
      error: payload?.error || 'RUNTIME_HOT_UPDATE_DENIED',
    }
  }

  return {
    ok: Boolean(payload?.ok ?? payload?.success),
    hmr,
    reload,
    mode,
    reusedSession: Boolean(payload?.reusedSession ?? meta?.reusedSession ?? true),
    filesSynced,
    message: payload?.message,
    sandboxSessionId: payload?.sandboxSessionId ?? meta?.sandboxSessionId,
    strategy: payload?.strategy ?? meta?.strategy,
  }
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

export async function getPreviewRuntimeReadiness(): Promise<PreviewRuntimeReadinessResponse> {
  const response = await fetch('/api/preview/runtime-readiness', { cache: 'no-store' })
  const payload = (await response.json().catch(() => null)) as PreviewRuntimeReadinessResponse | null
  if (!response.ok) {
    const reason = (payload as { error?: string } | null)?.error || `HTTP ${response.status}`
    throw new Error(reason)
  }
  return payload || {}
}
