'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import { gradients, tokens } from '@/lib/design-tokens';
import { useBrowserPathname, useBrowserSearch } from '@/lib/navigation/use-browser-pathname';

type DeployStatus =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'building'
  | 'ready'
  | 'error'
  | 'canceled';

type DeployResult = {
  id: string;
  url: string;
  inspectorUrl: string;
  status: DeployStatus;
  createdAt: string;
  readyAt?: string;
  buildDurationMs?: number;
  error?: string;
};

type FetchState = {
  loading: boolean;
  error: string | null;
  deployment: DeployResult | null;
};

const ACTIVE_DEPLOY_STATUSES = new Set<DeployStatus>([
  'idle',
  'preparing',
  'uploading',
  'building',
]);

export default function DeployStatusPage() {
  const pathname = useBrowserPathname();
  const search = useBrowserSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const deploymentId = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] !== 'deploy') {
      return undefined;
    }

    return segments[1];
  }, [pathname]);
  const projectName = searchParams.get('project')?.trim() || 'deploy';
  const projectId = searchParams.get('projectId')?.trim();

  const [state, setState] = useState<FetchState>({
    loading: true,
    error: null,
    deployment: null,
  });

  const loadDeployment = useCallback(async () => {
    if (!deploymentId) {
      setState({
        loading: false,
        error: 'Deploy invalido',
        deployment: null,
      });
      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const response = await fetch(
        `/api/deploy?id=${encodeURIComponent(deploymentId)}`,
        { cache: 'no-store' }
      );
      const payload = (await response
        .json()
        .catch(() => ({}))) as DeployResult & {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.message || payload.error || `Falha ao carregar deploy`
        );
      }

      setState({
        loading: false,
        error: null,
        deployment: payload,
      });
    } catch (error) {
      setState({
        loading: false,
        error:
          error instanceof Error ? error.message : 'Falha ao carregar deploy',
        deployment: null,
      });
    }
  }, [deploymentId]);

  useEffect(() => {
    void loadDeployment();
  }, [loadDeployment]);

  useEffect(() => {
    if (!state.deployment || !ACTIVE_DEPLOY_STATUSES.has(state.deployment.status)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadDeployment();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadDeployment, state.deployment]);

  const statusMeta = useMemo(
    () => getStatusMeta(state.deployment?.status),
    [state.deployment?.status]
  );
  const backHref = projectId
    ? `/ide?projectId=${encodeURIComponent(projectId)}`
    : '/ide';

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(0, 170, 255, 0.12), transparent 40%), var(--aethel-surface-primary)',
        color: 'var(--aethel-text-primary)',
        padding: tokens.spacing['8'],
      }}
    >
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing['5'],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: tokens.spacing['4'],
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing['3'] }}>
            <Link
              href={backHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: tokens.spacing['2'],
                color: 'var(--aethel-text-secondary)',
                textDecoration: 'none',
                fontSize: tokens.typography.fontSize.sm,
              }}
            >
              <ArrowLeft size={16} />
              Voltar para a IDE
            </Link>

            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing['2'] }}>
              <span
                style={{
                  fontSize: tokens.typography.fontSize.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--aethel-text-tertiary)',
                }}
              >
                Deploy
              </span>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
                  lineHeight: 1.1,
                }}
              >
                {projectName}
              </h1>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing['2'],
                  flexWrap: 'wrap',
                }}
              >
                <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
                {deploymentId ? (
                  <code
                    style={{
                      padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
                      borderRadius: tokens.radius.full,
                      background:
                        'color-mix(in srgb, var(--aethel-surface-secondary) 84%, transparent)',
                      color: 'var(--aethel-text-secondary)',
                      border: '1px solid var(--aethel-border-secondary)',
                      fontSize: tokens.typography.fontSize.xs,
                    }}
                  >
                    {deploymentId}
                  </code>
                ) : null}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadDeployment()}
            style={secondaryButtonStyle}
          >
            {state.loading ? (
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <RefreshCw size={15} />
            )}
            Atualizar
          </button>
        </div>

        <section style={cardStyle}>
          {state.error ? (
            <div
              style={{
                borderRadius: tokens.radius.lg,
                padding: tokens.spacing['4'],
                background:
                  'color-mix(in srgb, var(--aethel-error) 10%, var(--aethel-surface-secondary))',
                border: '1px solid color-mix(in srgb, var(--aethel-error) 30%, transparent)',
                color: 'var(--aethel-error)',
              }}
            >
              {state.error}
            </div>
          ) : null}

          {!state.deployment && state.loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing['3'],
                color: 'var(--aethel-text-secondary)',
              }}
            >
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Carregando status do deploy...
            </div>
          ) : null}

          {state.deployment ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: tokens.spacing['3'],
                }}
              >
                <MetricCard
                  label="Estado"
                  value={statusMeta.label}
                  helpText={getStatusHelp(state.deployment.status)}
                />
                <MetricCard
                  label="Criado em"
                  value={formatDateTime(state.deployment.createdAt)}
                />
                <MetricCard
                  label="Pronto em"
                  value={formatDateTime(state.deployment.readyAt)}
                />
                <MetricCard
                  label="Duracao"
                  value={formatDuration(state.deployment.buildDurationMs)}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: tokens.spacing['3'],
                }}
              >
                <ActionLink
                  href={state.deployment.url}
                  label="Abrir deploy"
                  helper="URL publica"
                />
                <ActionLink
                  href={state.deployment.inspectorUrl}
                  label="Abrir painel do provedor"
                  helper="Inspector"
                />
              </div>

              {state.deployment.error ? (
                <div
                  style={{
                    borderRadius: tokens.radius.lg,
                    padding: tokens.spacing['4'],
                    background:
                      'color-mix(in srgb, var(--aethel-error) 10%, var(--aethel-surface-secondary))',
                    border: '1px solid color-mix(in srgb, var(--aethel-error) 30%, transparent)',
                    color: 'var(--aethel-error)',
                  }}
                >
                  {state.deployment.error}
                </div>
              ) : null}

              {ACTIVE_DEPLOY_STATUSES.has(state.deployment.status) ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing['2'],
                    color: 'var(--aethel-text-secondary)',
                    fontSize: tokens.typography.fontSize.sm,
                  }}
                >
                  <Rocket size={16} />
                  Atualizacao automatica a cada 5 segundos enquanto o deploy estiver ativo.
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  helpText,
}: {
  label: string;
  value: string;
  helpText?: string;
}) {
  return (
    <div
      style={{
        padding: tokens.spacing['4'],
        borderRadius: tokens.radius.lg,
        border: '1px solid var(--aethel-border-secondary)',
        background:
          'color-mix(in srgb, var(--aethel-surface-secondary) 82%, transparent)',
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing['2'],
      }}
    >
      <span
        style={{
          fontSize: tokens.typography.fontSize.xs,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--aethel-text-tertiary)',
        }}
      >
        {label}
      </span>
      <strong style={{ fontSize: tokens.typography.fontSize.lg }}>{value}</strong>
      {helpText ? (
        <span
          style={{
            fontSize: tokens.typography.fontSize.xs,
            color: 'var(--aethel-text-secondary)',
          }}
        >
          {helpText}
        </span>
      ) : null}
    </div>
  );
}

function ActionLink({
  href,
  label,
  helper,
}: {
  href?: string;
  label: string;
  helper: string;
}) {
  if (!href) {
    return (
      <div
        style={{
          ...secondaryButtonStyle,
          opacity: 0.72,
          cursor: 'default',
        }}
      >
        <ExternalLink size={15} />
        {label}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        ...secondaryButtonStyle,
        textDecoration: 'none',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing['1'] }}>
        <span>{label}</span>
        <span
          style={{
            fontSize: tokens.typography.fontSize.xs,
            color: 'var(--aethel-text-tertiary)',
          }}
        >
          {helper}
        </span>
      </span>
      <ExternalLink size={16} />
    </a>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'neutral' | 'info' | 'success' | 'danger';
}) {
  const colors = {
    neutral: {
      background:
        'color-mix(in srgb, var(--aethel-surface-secondary) 84%, transparent)',
      border: 'var(--aethel-border-secondary)',
      text: 'var(--aethel-text-secondary)',
    },
    info: {
      background: 'color-mix(in srgb, var(--aethel-info) 14%, transparent)',
      border: 'color-mix(in srgb, var(--aethel-info) 34%, transparent)',
      text: 'var(--aethel-info)',
    },
    success: {
      background: 'color-mix(in srgb, var(--aethel-success) 14%, transparent)',
      border: 'color-mix(in srgb, var(--aethel-success) 34%, transparent)',
      text: 'var(--aethel-success)',
    },
    danger: {
      background: 'color-mix(in srgb, var(--aethel-error) 14%, transparent)',
      border: 'color-mix(in srgb, var(--aethel-error) 34%, transparent)',
      text: 'var(--aethel-error)',
    },
  } as const;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacing['1.5'],
        padding: `${tokens.spacing['1.5']} ${tokens.spacing['3']}`,
        borderRadius: tokens.radius.full,
        border: `1px solid ${colors[tone].border}`,
        background: colors[tone].background,
        color: colors[tone].text,
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.semibold,
      }}
    >
      {label}
    </span>
  );
}

function getStatusMeta(status: DeployStatus | undefined): {
  label: string;
  tone: 'neutral' | 'info' | 'success' | 'danger';
} {
  switch (status) {
    case 'preparing':
      return { label: 'Preparando', tone: 'info' };
    case 'uploading':
      return { label: 'Enviando', tone: 'info' };
    case 'building':
      return { label: 'Buildando', tone: 'info' };
    case 'ready':
      return { label: 'Pronto', tone: 'success' };
    case 'error':
      return { label: 'Com erro', tone: 'danger' };
    case 'canceled':
      return { label: 'Cancelado', tone: 'danger' };
    case 'idle':
      return { label: 'Aguardando', tone: 'neutral' };
    default:
      return { label: 'Carregando', tone: 'neutral' };
  }
}

function getStatusHelp(status: DeployStatus): string {
  switch (status) {
    case 'preparing':
      return 'A fila de deploy foi criada.';
    case 'uploading':
      return 'Arquivos ou referencia remota em transferencia.';
    case 'building':
      return 'Build em execucao no provedor.';
    case 'ready':
      return 'A URL publica deve responder.';
    case 'error':
      return 'Consulte o inspector para detalhes.';
    case 'canceled':
      return 'O deploy foi interrompido.';
    default:
      return 'Aguardando atualizacoes.';
  }
}

function formatDateTime(value?: string): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDuration(value?: number): string {
  if (!value || value <= 0) return '—';
  if (value < 1000) return `${value} ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing['4'],
  padding: tokens.spacing['6'],
  borderRadius: tokens.radius.xl,
  border: '1px solid var(--aethel-border-secondary)',
  background: gradients.glassStrong,
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.24)',
};

const secondaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: tokens.spacing['2'],
  padding: `${tokens.spacing['2.5']} ${tokens.spacing['3']}`,
  borderRadius: tokens.radius.lg,
  border: '1px solid var(--aethel-border-secondary)',
  background:
    'color-mix(in srgb, var(--aethel-surface-secondary) 72%, transparent)',
  color: 'var(--aethel-text-primary)',
  cursor: 'pointer',
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
};
