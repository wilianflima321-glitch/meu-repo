'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Rocket, XCircle } from 'lucide-react';
import {
  buildDeployStatusHref,
  getStoredPreviewDeploy,
  mergePreviewDeployRecord,
  normalizeDeployProjectName,
  persistPreviewDeploy,
} from '@/components/preview/previewDeployTrust';
import { useRuntimeLanePolicy } from '@/hooks/useRuntimeLanePolicy';
import { analytics } from '@/lib/analytics';
import { tokens } from '@/lib/design-tokens';

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
  message?: string;
};

type DeployResponse = {
  id?: string;
  url?: string;
  inspectorUrl?: string;
  status?: DeployStatus;
  error?: string;
  message?: string;
  missing?: string[];
};

const ACTIVE_DEPLOY_STATUSES = new Set<DeployStatus>([
  'preparing',
  'uploading',
  'building',
]);

export interface DeployButtonProps {
  projectName: string;
  projectId?: string | null;
  density?: 'compact' | 'comfortable';
  label?: string;
  openStatusOnStart?: boolean;
  showStatusLink?: boolean;
  showFeedback?: boolean;
  className?: string;
  containerStyle?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
  linkStyle?: React.CSSProperties;
  feedbackStyle?: React.CSSProperties;
  onDeploymentStarted?: (deployment: Required<Pick<DeployResponse, 'id'>> & DeployResponse) => void;
}

export function DeployButton({
  projectName,
  projectId = null,
  density = 'comfortable',
  label = 'Deploy',
  openStatusOnStart = true,
  showStatusLink = true,
  showFeedback = true,
  className,
  containerStyle,
  buttonStyle,
  linkStyle,
  feedbackStyle,
  onDeploymentStarted,
}: DeployButtonProps) {
  const deployProjectName = useMemo(
    () => normalizeDeployProjectName(projectName),
    [projectName]
  );

  const [readiness, setReadiness] = useState<DeployReadiness | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusHref, setStatusHref] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deployStatus, setDeployStatus] = useState<DeployStatus>('idle');
  const trackedDeployStatus = useMemo(() => {
    const stored = getStoredPreviewDeploy(deployProjectName);
    if (deployStatus !== 'idle') return deployStatus;
    return stored?.status ?? null;
  }, [deployProjectName, deployStatus]);
  const buildExportLane = useRuntimeLanePolicy('build-export', {
    activeCount: submitting || (trackedDeployStatus ? ACTIVE_DEPLOY_STATUSES.has(trackedDeployStatus) : false) ? 1 : 0,
  });

  useEffect(() => {
    let cancelled = false;

    const loadReadiness = async () => {
      setReadiness(null);
      setFeedback(null);

      try {
        const response = await fetch('/api/deploy?readiness=true', {
          cache: 'no-store',
        });
        if (!response.ok) return;

        const payload = (await response.json()) as DeployReadiness;
        if (cancelled) return;

        setReadiness(payload);
        if (payload.canDeploy === false) {
          setFeedback(
            payload.message ||
              (payload.missing?.length
                ? `Configure ${payload.missing.join(', ')}`
                : 'Deploy unavailable')
          );
        }
      } catch {
        // Readiness is advisory; the POST endpoint still enforces safety.
      }
    };

    void loadReadiness();

    return () => {
      cancelled = true;
    };
  }, [deployProjectName]);

  const deployDisabled =
    submitting || !deployProjectName || readiness?.canDeploy === false || !buildExportLane.decision.canStart;
  const isError =
    deployStatus === 'error' ||
    readiness?.canDeploy === false ||
    Boolean(feedback && /failed|error|unavailable|not configured/i.test(feedback));
  const isSuccess = deployStatus === 'ready';
  const buttonLabel = submitting ? 'Publishing...' : isSuccess ? 'Published' : label;
  const readinessHint =
    readiness?.canDeploy === false && readiness.missing?.length
      ? `Deploy unavailable: configure ${readiness.missing.join(', ')}.`
      : !buildExportLane.decision.canStart
        ? buildExportLane.route.reason
        : `Create a deployment through ${buildExportLane.route.target.replace(/-/g, ' ')} and open status in a new tab`;

  const handleDeploy = async () => {
    if (deployDisabled) return;

    setSubmitting(true);
    setFeedback(null);
    setDeployStatus('preparing');
    analytics?.track('engine', 'deploy_click', {
      label: 'deploy_button',
      projectId: projectId ?? undefined,
      metadata: {
        projectName: deployProjectName,
        runtimeTarget: buildExportLane.route.target,
      },
    });

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
          `Failed to start deploy (${response.status})`;
        setDeployStatus('error');
        setFeedback(message);
        analytics?.track('engine', 'deploy_failure', {
          label: 'deploy_start_rejected',
          projectId: projectId ?? undefined,
          metadata: {
            projectName: deployProjectName,
            status: response.status,
            message,
          },
        });
        return;
      }

      const nextStatusHref = buildDeployStatusHref(
        payload.id,
        deployProjectName,
        projectId
      );

      const mergedDeployment = mergePreviewDeployRecord(getStoredPreviewDeploy(deployProjectName), {
        id: payload.id,
        url: payload.url || '',
        inspectorUrl: payload.inspectorUrl || '',
        status: payload.status || 'idle',
        createdAt: new Date().toISOString(),
      });

      persistPreviewDeploy(deployProjectName, mergedDeployment);
      setStatusHref(nextStatusHref);
      setDeployStatus(payload.status || 'preparing');
      setFeedback(getDeployStartedLabel(payload.status));
      onDeploymentStarted?.({ ...payload, id: payload.id });
      analytics?.track('engine', 'deploy_success', {
        label: payload.status || 'deploy_started',
        projectId: projectId ?? undefined,
        metadata: {
          projectName: deployProjectName,
          deploymentId: payload.id,
          url: payload.url,
          inspectorUrl: payload.inspectorUrl,
        },
      });

      if (openStatusOnStart) {
        window.open(nextStatusHref, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      setDeployStatus('error');
      setFeedback(
        error instanceof Error ? error.message : 'Failed to start deploy'
      );
      analytics?.track('engine', 'deploy_failure', {
        label: 'deploy_network_error',
        projectId: projectId ?? undefined,
        metadata: {
          projectName: deployProjectName,
          message: error instanceof Error ? error.message : 'Failed to start deploy',
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const buttonTone = isError
    ? 'var(--aethel-error)'
    : isSuccess
      ? 'var(--aethel-success)'
      : 'var(--aethel-info)';
  const compact = density === 'compact';

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacing['2'],
        minWidth: 0,
        ...containerStyle,
      }}
    >
      <button
        type="button"
        onClick={handleDeploy}
        disabled={deployDisabled}
        title={readinessHint}
        aria-label="Create deploy"
        data-testid="deploy-button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.spacing['2'],
          minHeight: compact ? '32px' : '38px',
          padding: compact
            ? `${tokens.spacing['2']} ${tokens.spacing['3']}`
            : `${tokens.spacing['3']} ${tokens.spacing['4']}`,
          borderRadius: tokens.radius.lg,
          border: '1px solid color-mix(in srgb, var(--aethel-info) 42%, var(--aethel-border-secondary))',
          background: `color-mix(in srgb, ${buttonTone} 16%, var(--aethel-surface-secondary))`,
          color: deployDisabled ? 'var(--aethel-text-tertiary)' : 'var(--aethel-text-primary)',
          fontSize: compact ? tokens.typography.fontSize.xs : tokens.typography.fontSize.sm,
          fontWeight: tokens.typography.fontWeight.semibold,
          cursor: deployDisabled ? 'not-allowed' : 'pointer',
          opacity: deployDisabled ? 0.72 : 1,
          transition: `border-color ${tokens.animation.duration.fast} ${tokens.animation.easing.smooth}, opacity ${tokens.animation.duration.fast} ${tokens.animation.easing.smooth}`,
          ...buttonStyle,
        }}
      >
        {submitting ? (
          <Loader2 size={14} aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} />
        ) : isError ? (
          <XCircle size={14} aria-hidden="true" />
        ) : isSuccess ? (
          <CheckCircle2 size={14} aria-hidden="true" />
        ) : (
          <Rocket size={14} aria-hidden="true" />
        )}
        {buttonLabel}
      </button>

      {showStatusLink && statusHref ? (
        <a
          href={statusHref}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: tokens.spacing['1'],
            minHeight: compact ? '32px' : '36px',
            padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
            borderRadius: tokens.radius.lg,
            border: '1px solid var(--aethel-border-secondary)',
            color: 'var(--aethel-text-secondary)',
            background: 'color-mix(in srgb, var(--aethel-surface-secondary) 72%, transparent)',
            textDecoration: 'none',
            fontSize: tokens.typography.fontSize.xs,
            ...linkStyle,
          }}
        >
          <ExternalLink size={13} aria-hidden="true" />
          Status
        </a>
      ) : null}

      {showFeedback && feedback ? (
        <span
          role="status"
          aria-live="polite"
          title={feedback}
          style={{
            maxWidth: compact ? '220px' : '280px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: tokens.typography.fontSize.xs,
            color: isError ? 'var(--aethel-error)' : 'var(--aethel-text-secondary)',
            ...feedbackStyle,
          }}
        >
          {feedback}
        </span>
      ) : null}
    </div>
  );
}

function getDeployStartedLabel(status: DeployStatus | undefined): string {
  switch (status) {
    case 'ready':
      return 'Deploy complete';
    case 'building':
      return 'Build running';
    case 'uploading':
      return 'Upload running';
    case 'preparing':
      return 'Deploy queued';
    case 'error':
      return 'Deploy returned an error';
    default:
      return 'Deploy started';
  }
}

export default DeployButton;
