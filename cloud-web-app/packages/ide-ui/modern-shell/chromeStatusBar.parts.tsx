'use client'

import React from 'react'
import { AlertCircle, CheckCircle, Clock, GitBranch, Play, Terminal } from 'lucide-react'

import type { Diagnostic as MonacoDiagnostic } from '../../../web/components/editor/MonacoEditorPro'
import type { EditorCursorStatus, EditorSelectionStatus } from '../fullscreen/types'
import { tokens } from '../../../web/lib/design-tokens'
import type { PreviewRuntimeHealthState } from '../../../web/lib/preview/runtime-manager'

import { STATUS_ERROR, STATUS_SUCCESS, STATUS_WARNING } from './chromeStyles'
import type { BottomPanelMode, PanelState, PreviewMode, SidebarTab } from './types'
import type { ShellSourceControlTruth } from './useShellSourceControlTruth'

export const statusMetricGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing['4'],
};

export type StatusMetricDescriptor = {
  id: string;
  icon: React.ReactNode;
  label: string;
  /** Extended label / tooltip text rendered by surfaces that carry a title slot. */
  title?: string;
  onClick?: () => void;
};

export interface StatusBarProps {
  activeFileName?: string;
  activeFilePath?: string | null;
  activeFileLanguage?: string | null;
  activeDiagnostics?: MonacoDiagnostic[];
  panelState?: PanelState;
  activeSidebarTab?: SidebarTab;
  activePreviewMode?: PreviewMode;
  activeBottomPanel?: BottomPanelMode;
  splitEditorOpen?: boolean;
  splitActivePane?: 'primary' | 'secondary';
  collaborationConnected?: boolean;
  collaboratorCount?: number;
  /** Block 2A.3 — sync LED snapshot for status bar */
  collaborationSyncLed?: import('../../../web/lib/collaboration/collab-sync-state').CollabSyncLedSnapshot | null;
  runtimeHealth?: PreviewRuntimeHealthState | null;
  runtimeReadinessStatus?: string | null;
  cursorStatus?: EditorCursorStatus | null;
  selectionStatus?: EditorSelectionStatus | null;
  sourceControl?: ShellSourceControlTruth | null;
}

export function formatFileLabel(activeFilePath?: string | null, activeFileName?: string) {
  const preferred = activeFilePath || activeFileName || '';
  if (!preferred.trim()) return null;
  const normalized = preferred.replace(/\\/g, '/');
  return normalized.split('/').pop() || normalized;
}

export function formatLanguageLabel(language?: string | null) {
  if (!language?.trim()) return null;
  const normalized = language.trim();
  const aliases: Record<string, string> = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    typescriptreact: 'TSX',
    javascriptreact: 'JSX',
    plaintext: 'Plain Text',
    cpp: 'C++',
    csharp: 'C#',
    json: 'JSON',
    markdown: 'Markdown',
    shell: 'Shell',
  };
  return aliases[normalized.toLowerCase()] ?? normalized.toUpperCase();
}

export function formatSidebarLabel(sidebarTab: SidebarTab | undefined, panelState?: PanelState) {
  if (!panelState?.sidebar.open || !sidebarTab) return null;
  if (sidebarTab === 'git') return 'Git';
  if (sidebarTab === 'research') return 'Research';
  return 'Files';
}

export function formatPreviewLabel(previewMode: PreviewMode | undefined, panelState?: PanelState) {
  if (!panelState?.preview.open || !previewMode) return null;
  switch (previewMode) {
    case 'runtime':
      return 'App Preview';
    case 'device':
      return 'Devices';
    case 'console':
      return 'Console';
    case 'viewport3d':
      return 'Visual 3D';
    case 'canvas':
      return 'Visual UI';
    default:
      return previewMode;
  }
}

export function getPreviewIcon(previewMode: PreviewMode | undefined) {
  switch (previewMode) {
    case 'console':
      return <Terminal size={12} />;
    default:
      return <Play size={12} />;
  }
}

export function formatBottomPanelLabel(activeBottomPanel: BottomPanelMode | undefined, panelState?: PanelState) {
  if (!panelState?.chat.open || !activeBottomPanel) return null;
  if (activeBottomPanel === 'terminal') return 'Terminal';
  if (activeBottomPanel === 'diagnostics') return 'Diagnostics';
  return 'AI Console';
}

export function buildDiagnosticsMetrics(activeDiagnostics: MonacoDiagnostic[] | undefined): StatusMetricDescriptor[] {
  if (!activeDiagnostics || activeDiagnostics.length === 0) return [];

  const errors = activeDiagnostics.filter((d) => d.severity === 'error').length;
  const warnings = activeDiagnostics.filter((d) => d.severity === 'warning').length;

  const items: StatusMetricDescriptor[] = [];

  if (errors > 0) {
    items.push({
      id: 'diag-errors',
      icon: <AlertCircle size={12} className="text-[var(--aethel-error-light)]" />,
      label: `${errors}`,
    });
  }

  if (warnings > 0) {
    items.push({
      id: 'diag-warnings',
      icon: <AlertCircle size={12} className="text-[var(--aethel-warning-light)]" />,
      label: `${warnings}`,
    });
  }

  return items;
}

export function buildRuntimeMetric(
  runtimeHealth: PreviewRuntimeHealthState | null | undefined,
  runtimeReadinessStatus: string | null | undefined,
  panelState: PanelState | undefined,
): StatusMetricDescriptor | null {
  if (!panelState?.preview.open || !runtimeHealth) return null;

  if (runtimeHealth.status === 'reachable') {
    const latencyLabel =
      typeof runtimeHealth.latencyMs === 'number' ? ` (${runtimeHealth.latencyMs}ms)` : '';
    return {
      id: 'runtime-reachable',
      icon: <CheckCircle size={12} style={{ color: STATUS_SUCCESS }} />,
      label: `Runtime online${latencyLabel}`,
    };
  }

  if (runtimeHealth.status === 'checking') {
    return {
      id: 'runtime-checking',
      icon: <Clock size={12} style={{ color: STATUS_WARNING }} />,
      label: 'Checking runtime',
    };
  }

  if (runtimeHealth.status === 'idle') {
    return {
      id: 'runtime-idle',
      icon: <Clock size={12} />,
      label:
        runtimeReadinessStatus === 'ready'
          ? 'Runtime ready'
          : runtimeReadinessStatus === 'partial'
            ? 'Runtime partial'
            : 'Local preview',
    };
  }

  return {
    id: 'runtime-error',
    icon: <AlertCircle size={12} style={{ color: STATUS_ERROR }} />,
    label:
      runtimeHealth.status === 'unhealthy'
        ? 'Runtime error'
        : runtimeHealth.status === 'invalid'
          ? 'Runtime invalid'
          : 'Runtime offline',
  };
}

export function formatBranchLabel(branch: string | null): string | null {
  if (!branch?.trim()) return null;
  const trimmed = branch.trim();
  return trimmed.length > 28 ? `${trimmed.slice(0, 25)}...` : trimmed;
}

export function buildSourceControlMetrics(sourceControl?: any | null): StatusMetricDescriptor[] {
  if (!sourceControl) return [];

  if (sourceControl.state === 'loading' || sourceControl.state === 'idle') {
    return [
      {
        id: 'git-loading',
        icon: <Clock size={12} />,
        label: 'Checking Git',
      },
    ];
  }

  if (sourceControl.state !== 'ready') {
    return [
      {
        id: 'git-unavailable',
        icon: <AlertCircle size={12} style={{ color: STATUS_WARNING }} />,
        label: 'Git unavailable',
      },
    ];
  }

  const metrics: StatusMetricDescriptor[] = [];
  const branchLabel = formatBranchLabel(sourceControl.branch);
  if (branchLabel) {
    metrics.push({
      id: 'git-branch',
      icon: <GitBranch size={12} />,
      label: branchLabel,
    });
  }

  if (sourceControl.ahead > 0 || sourceControl.behind > 0) {
    const syncState = [sourceControl.ahead > 0 ? `+${sourceControl.ahead}` : null, sourceControl.behind > 0 ? `-${sourceControl.behind}` : null]
      .filter(Boolean)
      .join(' ');
    metrics.push({
      id: 'git-sync',
      icon: <GitBranch size={12} />,
      label: `Sync ${syncState}`,
    });
  }

  if (sourceControl.conflicted > 0) {
    metrics.push({
      id: 'git-conflicts',
      icon: <AlertCircle size={12} style={{ color: STATUS_ERROR }} />,
      label: `${sourceControl.conflicted} conflict${sourceControl.conflicted === 1 ? '' : 's'}`,
    });
    return metrics;
  }

  if (sourceControl.isDirty) {
    const parts = [
      sourceControl.staged > 0 ? `${sourceControl.staged} stage` : null,
      sourceControl.unstaged > 0 ? `${sourceControl.unstaged} unstaged` : null,
      sourceControl.untracked > 0 ? `${sourceControl.untracked} new${sourceControl.untracked === 1 ? '' : 's'}` : null,
    ].filter(Boolean);

    metrics.push({
      id: 'git-dirty',
      icon: <AlertCircle size={12} style={{ color: STATUS_WARNING }} />,
      label: parts.length > 0 ? parts.join(' · ') : `${sourceControl.changedCount} change${sourceControl.changedCount === 1 ? '' : 's'}`,
    });
    return metrics;
  }

  metrics.push({
    id: 'git-clean',
    icon: <CheckCircle size={12} style={{ color: STATUS_SUCCESS }} />,
    label: 'Git clean',
  });

  return metrics;
}
