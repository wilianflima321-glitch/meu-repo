'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  absoluteBrowserHref,
  buildDeployStatusHref,
  getStoredPreviewDeploy,
  normalizeDeployProjectName,
  persistPreviewDeploy,
  resolveShareHref,
  type PreviewDeployReadiness,
  type PreviewDeployRecord,
  type PreviewDeployStatus,
} from '@/components/preview/previewDeployTrust';

type DeployResponse = PreviewDeployRecord & {
  message?: string;
  missing?: string[];
};

type UsePreviewDeployTrustOptions = {
  projectId: string;
  previewRuntimeUrl: string | null;
};

const ACTIVE_DEPLOY_STATUSES = new Set<PreviewDeployStatus>([
  'idle',
  'preparing',
  'uploading',
  'building',
]);

export function usePreviewDeployTrust({
  projectId,
  previewRuntimeUrl,
}: UsePreviewDeployTrustOptions) {
  const projectName = useMemo(
    () => normalizeDeployProjectName(projectId || 'aethel-preview'),
    [projectId]
  );

  const [readiness, setReadiness] = useState<PreviewDeployReadiness | null>(null);
  const [deployment, setDeployment] = useState<PreviewDeployRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const deployStatusHref = useMemo(() => {
    if (!deployment?.id) return null;
    return buildDeployStatusHref(deployment.id, projectName, projectId);
  }, [deployment?.id, projectId, projectName]);

  const shareTarget = useMemo(
    () =>
      resolveShareHref({
        deployment,
        previewRuntimeUrl,
        deployStatusHref,
      }),
    [deployStatusHref, deployment, previewRuntimeUrl]
  );

  const loadReadiness = useCallback(async () => {
    try {
      const response = await fetch('/api/deploy?readiness=true', {
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload = (await response.json()) as PreviewDeployReadiness;
      setReadiness(payload);
      if (payload.canDeploy === false && payload.missing?.length) {
        setFeedback(`Configure ${payload.missing.join(', ')}`);
      }
    } catch {
      // Keep deploy controls visible even if readiness probing flakes.
    }
  }, []);

  const refreshDeployment = useCallback(
    async (deploymentId = deployment?.id) => {
      if (!deploymentId) return;

      setRefreshing(true);
      try {
        const response = await fetch(
          `/api/deploy?id=${encodeURIComponent(deploymentId)}`,
          {
            cache: 'no-store',
          }
        );
        const payload = (await response.json().catch(() => ({}))) as DeployResponse & {
          error?: string;
          message?: string;
        };

        if (!response.ok || !payload.id) {
          throw new Error(
            payload.message ||
              payload.error ||
              `Falha ao carregar deploy (${response.status})`
          );
        }

        setDeployment(payload);
        persistPreviewDeploy(projectName, payload);
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : 'Falha ao carregar deploy'
        );
      } finally {
        setRefreshing(false);
      }
    },
    [deployment?.id, projectName]
  );

  useEffect(() => {
    const stored = getStoredPreviewDeploy(projectName);
    if (stored) {
      setDeployment(stored);
    }
    void loadReadiness();
  }, [loadReadiness, projectName]);

  useEffect(() => {
    if (!deployment?.id) return;
    void refreshDeployment(deployment.id);
  }, [deployment?.id, refreshDeployment]);

  useEffect(() => {
    if (!deployment || !ACTIVE_DEPLOY_STATUSES.has(deployment.status)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshDeployment(deployment.id);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [deployment, refreshDeployment]);

  const startDeploy = useCallback(async () => {
    if (submitting || readiness?.canDeploy === false) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as DeployResponse & {
        error?: string;
        message?: string;
      };

      if (!response.ok || !payload.id) {
        throw new Error(
          payload.message ||
            payload.error ||
            `Falha ao iniciar deploy (${response.status})`
        );
      }

      setDeployment(payload);
      persistPreviewDeploy(projectName, payload);
      setFeedback(getDeployStartedLabel(payload.status));

      if (typeof window !== 'undefined') {
        const nextStatusHref = buildDeployStatusHref(payload.id, projectName, projectId);
        window.open(nextStatusHref, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'Falha ao iniciar deploy'
      );
    } finally {
      setSubmitting(false);
    }
  }, [projectId, projectName, readiness?.canDeploy, submitting]);

  const copyShareLink = useCallback(async () => {
    if (!shareTarget?.href || typeof navigator === 'undefined') return;

    try {
      await navigator.clipboard.writeText(absoluteBrowserHref(shareTarget.href));
      setFeedback(`${shareTarget.label} copiado`);
    } catch {
      setFeedback('Nao foi possivel copiar o link');
    }
  }, [shareTarget]);

  const openDeployStatus = useCallback(() => {
    if (!deployStatusHref || typeof window === 'undefined') return;
    window.open(deployStatusHref, '_blank', 'noopener,noreferrer');
  }, [deployStatusHref]);

  const openDeploySite = useCallback(() => {
    if (!deployment?.url || typeof window === 'undefined') return;
    window.open(deployment.url, '_blank', 'noopener,noreferrer');
  }, [deployment?.url]);

  return {
    projectName,
    readiness,
    deployment,
    deployStatusHref,
    shareTarget,
    feedback,
    isSubmittingDeploy: submitting,
    isRefreshingDeploy: refreshing,
    startDeploy,
    refreshDeployment,
    copyShareLink,
    openDeployStatus,
    openDeploySite,
  };
}

function getDeployStartedLabel(status: PreviewDeployStatus | undefined): string {
  switch (status) {
    case 'ready':
      return 'Deploy concluido';
    case 'building':
      return 'Build em andamento';
    case 'uploading':
      return 'Upload em andamento';
    case 'preparing':
      return 'Deploy enfileirado';
    case 'error':
      return 'Deploy retornou erro';
    default:
      return 'Deploy iniciado';
  }
}
