'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Rocket } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useBrowserSearch } from '@/lib/navigation/use-browser-pathname';
import {
  BORDER_SECONDARY,
  HEADER_ACTION_BUTTON,
  STATUS_ERROR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from './chromeStyles';

type DeployStatus =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'building'
  | 'ready'
  | 'error'
  | 'canceled';

type DeployReadiness = {
  canDeploy?: boolean;
  missing?: string[];
};

type DeployResponse = {
  id?: string;
  status?: DeployStatus;
  error?: string;
  message?: string;
  missing?: string[];
};

interface DeployTopbarActionProps {
  projectName: string;
}

export function DeployTopbarAction({ projectName }: DeployTopbarActionProps) {
  const search = useBrowserSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const projectIdParam = searchParams.get('projectId')?.trim();
  const deployProjectName = useMemo(
    () => normalizeDeployProjectName(projectIdParam || projectName),
    [projectIdParam, projectName]
  );

  const [readiness, setReadiness] = useState<DeployReadiness | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusHref, setStatusHref] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadReadiness = async () => {
      try {
        const response = await fetch('/api/deploy?readiness=true', {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = (await response.json()) as DeployReadiness;
        if (!cancelled) {
          setReadiness(payload);
          if (payload.canDeploy === false && payload.missing?.length) {
            setFeedback(`Configure ${payload.missing.join(', ')}`);
          }
        }
      } catch {
        // Keep the action available if readiness probing is unavailable.
      }
    };

    void loadReadiness();

    return () => {
      cancelled = true;
    };
  }, []);

  const deployDisabled =
    submitting || !deployProjectName || readiness?.canDeploy === false;
  const readinessHint =
    readiness?.canDeploy === false && readiness.missing?.length
      ? `Deploy indisponivel: configure ${readiness.missing.join(', ')}.`
      : 'Criar deploy e abrir status em uma nova aba';

  const handleDeploy = async () => {
    if (deployDisabled) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: deployProjectName,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as DeployResponse;

      if (!response.ok || !payload.id) {
        const message =
          payload.message ||
          payload.error ||
          `Falha ao iniciar deploy (${response.status})`;
        setFeedback(message);
        return;
      }

      const nextStatusHref = buildDeployStatusHref(
        payload.id,
        deployProjectName,
        projectIdParam
      );

      setStatusHref(nextStatusHref);
      setFeedback(getDeployStartedLabel(payload.status));
      window.open(nextStatusHref, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'Falha ao iniciar deploy'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing['2'],
      }}
    >
      <button
        type="button"
        onClick={handleDeploy}
        disabled={deployDisabled}
        title={readinessHint}
        aria-label="Criar deploy"
        style={{
          ...HEADER_ACTION_BUTTON,
          color: deployDisabled ? TEXT_TERTIARY : TEXT_PRIMARY,
          opacity: deployDisabled ? 0.72 : 1,
          borderColor:
            readiness?.canDeploy === false
              ? BORDER_SECONDARY
              : 'color-mix(in srgb, var(--aethel-info) 45%, var(--aethel-border-secondary))',
          background:
            deployDisabled && readiness?.canDeploy === false
              ? 'color-mix(in srgb, var(--aethel-surface-secondary) 56%, transparent)'
              : 'color-mix(in srgb, var(--aethel-info) 16%, var(--aethel-surface-secondary))',
        }}
      >
        {submitting ? (
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Rocket size={14} />
        )}
        {submitting ? 'Publicando...' : 'Deploy'}
      </button>

      {statusHref ? (
        <a
          href={statusHref}
          target="_blank"
          rel="noreferrer"
          style={{
            ...HEADER_ACTION_BUTTON,
            padding: `${tokens.spacing['2']} ${tokens.spacing['2.5']}`,
            minHeight: '32px',
            color: TEXT_SECONDARY,
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={13} />
          Status
        </a>
      ) : null}

      {feedback ? (
        <span
          aria-live="polite"
          title={feedback}
          style={{
            maxWidth: '220px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: tokens.typography.fontSize.xs,
            color:
              readiness?.canDeploy === false || /falha|erro/i.test(feedback)
                ? STATUS_ERROR
                : TEXT_SECONDARY,
          }}
        >
          {feedback}
        </span>
      ) : null}
    </div>
  );
}

function normalizeDeployProjectName(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return (slug || 'aethel-deploy').slice(0, 100);
}

function buildDeployStatusHref(
  deploymentId: string,
  projectName: string,
  projectId?: string
): string {
  const params = new URLSearchParams();
  params.set('project', projectName);
  if (projectId) {
    params.set('projectId', projectId);
  }

  return `/deploy/${encodeURIComponent(deploymentId)}?${params.toString()}`;
}

function getDeployStartedLabel(status: DeployStatus | undefined): string {
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

export default DeployTopbarAction;
