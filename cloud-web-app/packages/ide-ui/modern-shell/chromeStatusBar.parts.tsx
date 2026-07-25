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
  icon: React.ReactNode;
  label: string;
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

export function buildDiagnosticsMetrics(activeDiagnostics: MonacoDiagnostic[]): StatusMetricDescriptor[] {
  const counts = activeDiagnostics.reduce(
    (summary, diagnostic) => {
      if (diagnostic.severity === 'error') summary.errors += 1;
      if (diagnostic.severity === 'warning') summary.warnings += 1;
      if (diagnostic.severity === 'info') summary.infos += 1;
      if (diagnostic.severity === 'hint') summary.hints += 1;
      return summary;
    },
    { errors: 0, warnings: 0, infos: 0, hints: 0 }
  );

  const metrics: StatusMetricDescriptor[] = [];

  if (counts.errors > 0) {
    metrics.push({
      icon: <AlertCircle size={12} style={{ color: STATUS_ERROR }} />,
      label: `${counts.errors} error${counts.errors === 1 ? '' : 's'}`,
    });
  }

  if (counts.warnings > 0) {
    metrics.push({
      icon: <AlertCircle size={12} style={{ color: STATUS_WARNING }} />,
      label: `${counts.warnings} warning${counts.warnings === 1 ? '' : 's'}`,
    });
  }

  if (metrics.length > 0) {
    return metrics;
  }

  const advisoryCount = counts.infos + counts.hints;
  if (advisoryCount > 0) {
    return [
      {
        icon: <Clock size={12} />,
        label: `${advisoryCount} hint${advisoryCount === 1 ? '' : 's'}`,
      },
    ];
  }

  return [
    {
      icon: <CheckCircle size={12} style={{ color: STATUS_SUCCESS }} />,
      label: 'Clean file',
    },
  ];
}

export function buildRuntimeMetric(
  runtimeHealth?: PreviewRuntimeHealthState | null,
  runtimeReadinessStatus?: string | null,
  panelState?: PanelState
): StatusMetricDescriptor | null {
  if (!panelState?.preview.open || !runtimeHealth) return null;

  if (runtimeHealth.status === 'reachable') {
    const latencyLabel =
      typeof runtimeHealth.latencyMs === 'number' ? ` (${runtimeHealth.latencyMs}ms)` : '';
    return {
      icon: <CheckCircle size={12} style={{ color: STATUS_SUCCESS }} />,
      label: `Runtime online${latencyLabel}`,
    };
  }

  if (runtimeHealth.status === 'checking') {
    return {
      icon: <Clock size={12} style={{ color: STATUS_WARNING }} />,
      label: 'Checking runtime',
    };
  }

  if (runtimeHealth.status === 'idle') {
    return {
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

export function buildSourceControlMetrics(sourceControl?: ShellSourceControlTruth | null): StatusMetricDescriptor[] {
  if (!sourceControl) return [];

  if (sourceControl.state === 'loading' || sourceControl.state === 'idle') {
    return [
      {
        icon: <Clock size={12} />,
        label: 'Checking Git',
      },
    ];
  }

  if (sourceControl.state !== 'ready') {
    return [
      {
        icon: <AlertCircle size={12} style={{ color: STATUS_WARNING }} />,
        label: 'Git unavailable',
      },
    ];
  }

  const metrics: StatusMetricDescriptor[] = [];
  const branchLabel = formatBranchLabel(sourceControl.branch);
  if (branchLabel) {
    metrics.push({
      icon: <GitBranch size={12} />,
      label: branchLabel,
    });
  }

  if (sourceControl.ahead > 0 || sourceControl.behind > 0) {
    const syncState = [sourceControl.ahead > 0 ? `+${sourceControl.ahead}` : null, sourceControl.behind > 0 ? `-${sourceControl.behind}` : null]
      .filter(Boolean)
      .join(' ');
    metrics.push({
      icon: <GitBranch size={12} />,
      label: `Sync ${syncState}`,
    });
  }

  if (sourceControl.conflicted > 0) {
    metrics.push({
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
      icon: <AlertCircle size={12} style={{ color: STATUS_WARNING }} />,
      label: parts.length > 0 ? parts.join(' · ') : `${sourceControl.changedCount} change${sourceControl.changedCount === 1 ? '' : 's'}`,
    });
    return metrics;
  }

  metrics.push({
    icon: <CheckCircle size={12} style={{ color: STATUS_SUCCESS }} />,
    label: 'Git clean',
  });

  return metrics;
}
