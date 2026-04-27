'use client';

export type PreviewLifecycleState =
  | 'idle'
  | 'provisioning'
  | 'warming'
  | 'syncing'
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'offline';

export type PreviewStrategy = 'e2b' | 'webcontainer' | 'iframe' | 'inline' | 'none';
export type PreviewHmrState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface PreviewRuntimeInfo {
  state: PreviewLifecycleState;
  strategy: PreviewStrategy;
  runtimeUrl: string | null;
  sandboxId: string | null;
  provider: string | null;
  startedAt: number | null;
  latencyMs: number | null;
  error: string | null;
  guidance: string | null;
  recommendedAction: string | null;
  setupEnv: string[];
  hmrConnected: boolean;
  hmrState: PreviewHmrState;
  filesInSync: number;
  lastSyncAt: number | null;
  lastHealthCheckAt: number | null;
  lastHealthyAt: number | null;
  failureCount: number;
}

export type CanonicalRuntimeProps = {
  variant: 'runtime';
  title?: string;
  filePath?: string;
  content?: string;
  html?: string;
  projectId?: string;
  runtimeUrl?: string;
  forceInlineFallback?: boolean;
  runtimeUnavailableReason?: string;
  runtimeInfoOverride?: PreviewRuntimeInfo;
  isStale?: boolean;
  onRefresh?: () => void;
  onProvisionRequest?: () => void;
  onInlineFallbackRequest?: () => void;
  autoProvision?: boolean;
  showLifecycleBar?: boolean;
};

export const LIFECYCLE_LABELS: Record<PreviewLifecycleState, string> = {
  idle: 'Aguardando preview',
  provisioning: 'Iniciando sandbox...',
  warming: 'Aquecendo runtime...',
  syncing: 'Sincronizando arquivos do projeto...',
  healthy: 'Preview em execucao',
  degraded: 'Preview degradado',
  failed: 'Falha no preview',
  offline: 'Preview offline',
};

export const STRATEGY_LABELS: Record<PreviewStrategy, string> = {
  e2b: 'sandbox gerenciado',
  webcontainer: 'webcontainer',
  iframe: 'runtime externo',
  inline: 'fallback inline',
  none: 'sem runtime',
};

export const LIFECYCLE_COLORS: Record<PreviewLifecycleState, string> = {
  idle: 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]',
  provisioning: 'bg-[var(--aethel-warning)] animate-pulse',
  warming: 'bg-[var(--aethel-warning-light)] animate-pulse',
  syncing: 'bg-[var(--aethel-primary)] animate-pulse',
  healthy: 'bg-[var(--aethel-success)]',
  degraded: 'bg-[var(--aethel-warning)]',
  failed: 'bg-[var(--aethel-error)]',
  offline: 'bg-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)]',
};
