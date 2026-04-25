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

export function resolveShareHref(options: {
  deployment: PreviewDeployRecord | null;
  previewRuntimeUrl: string | null;
  deployStatusHref: string | null;
}) {
  const { deployment, previewRuntimeUrl, deployStatusHref } = options;

  if (deployment?.status === 'ready' && deployment.url) {
    return {
      href: deployment.url,
      label: 'Public deploy',
    };
  }

  if (previewRuntimeUrl) {
    return {
      href: previewRuntimeUrl,
      label: 'Runtime preview',
    };
  }

  if (deployStatusHref) {
    return {
      href: deployStatusHref,
      label: 'Deploy status',
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
