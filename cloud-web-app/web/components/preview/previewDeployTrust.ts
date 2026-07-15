'use client';

import type { PreviewRuntimeHealthStatus } from '@/lib/preview/runtime-manager';

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
  message?: string;
  qaGate?: {
    ok: boolean;
    blockers: string[];
    durationMs: number;
  };
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

export type PreviewReviewTargetKind =
  | 'review_ready_public'
  | 'review_ready_runtime'
  | 'ephemeral_runtime'
  | 'blocked_stale'
  | 'blocked_degraded';

export type PreviewReviewTarget = {
  kind: PreviewReviewTargetKind;
  href: string | null;
  label: string;
  actionLabel: string;
  summary: string;
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

export function resolveReviewTarget(options: {
  deployment: PreviewDeployRecord | null;
  previewRuntimeUrl: string | null;
  runtimeHealthStatus?: PreviewRuntimeHealthStatus | null;
  runtimeReadinessStatus?: string | null;
  deployReadiness?: PreviewDeployReadiness | null;
}): PreviewReviewTarget | null {
  const {
    deployment,
    previewRuntimeUrl,
    runtimeHealthStatus = 'idle',
    runtimeReadinessStatus = null,
    deployReadiness = null,
  } = options;

  const qaBlocked = Boolean(
    deployReadiness?.qaGate && deployReadiness.qaGate.ok === false
  );
  const deployBlocked = deployReadiness?.canDeploy === false || qaBlocked;
  const hasStalePublicDeploy = Boolean(deployment?.lastReadyUrl);
  const runtimeReachable = runtimeHealthStatus === 'reachable';
  const runtimeActive =
    runtimeHealthStatus === 'checking' || runtimeHealthStatus === 'reachable';
  const runtimeDegraded =
    runtimeHealthStatus === 'unreachable' ||
    runtimeHealthStatus === 'unhealthy' ||
    runtimeHealthStatus === 'invalid';
  const runtimeReady = runtimeReadinessStatus === 'ready';
  const runtimePartial = runtimeReadinessStatus === 'partial';

  if (deployment?.status === 'ready' && deployment.url) {
    return {
      kind: 'review_ready_public',
      href: deployment.url,
      label: 'Public review',
      actionLabel: 'Copy review link',
      summary:
        'Stable public deploy is ready for external review, QA handoff, and buyer sharing.',
    };
  }

  if (
    hasStalePublicDeploy &&
    (deployment?.status === 'building' ||
      deployment?.status === 'uploading' ||
      deployment?.status === 'preparing' ||
      deployment?.status === 'error' ||
      deployBlocked ||
      runtimeDegraded)
  ) {
    return {
      kind: 'blocked_stale',
      href: deployment?.lastReadyUrl ?? null,
      label: 'Last public review',
      actionLabel: 'Copy last public link',
      summary:
        'Current changes are not review-ready yet. Use the last verified public deploy while runtime or publish recovers.',
    };
  }

  if (previewRuntimeUrl && runtimeReachable && runtimeReady) {
    return {
      kind: 'review_ready_runtime',
      href: previewRuntimeUrl,
      label: 'Runtime review',
      actionLabel: 'Copy review link',
      summary:
        'Runtime is reachable and ready enough for internal review, but it still depends on the current environment.',
    };
  }

  if (previewRuntimeUrl && (runtimePartial || runtimeActive)) {
    return {
      kind: 'ephemeral_runtime',
      href: previewRuntimeUrl,
      label: 'Ephemeral runtime',
      actionLabel: 'Copy preview link',
      summary:
        'Preview is usable for live iteration, but it should be promoted before external review or sign-off.',
    };
  }

  if (deployBlocked || runtimeDegraded) {
    return {
      kind: 'blocked_degraded',
      href: null,
      label: 'Review blocked',
      actionLabel: 'Copy review link',
      summary:
        'Review sharing is blocked by runtime health, deploy readiness, or quality gates.',
    };
  }

  if (hasStalePublicDeploy) {
    return {
      kind: 'blocked_stale',
      href: deployment?.lastReadyUrl ?? null,
      label: 'Last public review',
      actionLabel: 'Copy last public link',
      summary:
        'A previous public deploy exists, but the current working state has not been promoted yet.',
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
