'use client';

export type PreviewDeployStatus =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'building'
  | 'ready'
  | 'error'
  | 'canceled';

export type PreviewDeployReadiness = {
  canDeploy?: boolean;
  missing?: string[];
};

export type PreviewDeployRecord = {
  id: string;
  url: string;
  inspectorUrl: string;
  status: PreviewDeployStatus;
  createdAt: string;
  readyAt?: string;
  buildDurationMs?: number;
  error?: string;
  lastReadyUrl?: string;
  lastReadyInspectorUrl?: string;
  lastReadyAt?: string;
};

export function normalizeDeployProjectName(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return (slug || 'aethel-deploy').slice(0, 100);
}

export function buildDeployStatusHref(
  deploymentId: string,
  projectName: string,
  projectId?: string | null
): string {
  const params = new URLSearchParams();
  params.set('project', projectName);
  if (projectId) {
    params.set('projectId', projectId);
  }

  return `/deploy/${encodeURIComponent(deploymentId)}?${params.toString()}`;
}

function getDeployStorageKey(projectName: string) {
  return `aethel.preview.deploy.${projectName}`;
}

export function getStoredPreviewDeploy(
  projectName: string
): PreviewDeployRecord | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(getDeployStorageKey(projectName));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PreviewDeployRecord | null;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistPreviewDeploy(
  projectName: string,
  deployment: PreviewDeployRecord | null
) {
  if (typeof window === 'undefined') return;

  const storageKey = getDeployStorageKey(projectName);
  if (!deployment) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(deployment));
}

export function mergePreviewDeployRecord(
  previous: PreviewDeployRecord | null,
  next: PreviewDeployRecord
): PreviewDeployRecord {
  if (next.status === 'ready' && next.url) {
    return {
      ...next,
      lastReadyUrl: next.url,
      lastReadyInspectorUrl: next.inspectorUrl || previous?.lastReadyInspectorUrl,
      lastReadyAt: next.readyAt || next.createdAt,
    };
  }

  return {
    ...next,
    lastReadyUrl: previous?.lastReadyUrl,
    lastReadyInspectorUrl: previous?.lastReadyInspectorUrl,
    lastReadyAt: previous?.lastReadyAt,
  };
}

export function resolveShareHref(options: {
  deployment: PreviewDeployRecord | null;
  previewRuntimeUrl: string | null;
}) {
  const { deployment, previewRuntimeUrl } = options;

  if (deployment?.status === 'ready' && deployment.url) {
    return {
      href: deployment.url,
      label: 'Public deploy',
    };
  }

  if (deployment?.lastReadyUrl) {
    return {
      href: deployment.lastReadyUrl,
      label: 'Last public deploy',
    };
  }

  if (previewRuntimeUrl) {
    return {
      href: previewRuntimeUrl,
      label: 'Runtime preview',
    };
  }

  return null;
}

export function absoluteBrowserHref(href: string) {
  if (/^https?:\/\//i.test(href) || typeof window === 'undefined') {
    return href;
  }

  return new URL(href, window.location.origin).toString();
}
