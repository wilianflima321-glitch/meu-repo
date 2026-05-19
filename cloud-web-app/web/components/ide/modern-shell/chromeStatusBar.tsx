'use client';

import React, { useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Code2,
  Columns,
  Crosshair,
  FolderTree,
  GitBranch,
  Play,
  Sparkles,
  Terminal,
  TerminalSquare,
  Users,
} from 'lucide-react';

import type { Diagnostic as MonacoDiagnostic } from '@/components/editor/MonacoEditorPro';
import type {
  EditorCursorStatus,
  EditorSelectionStatus,
} from '@/components/ide/fullscreen/types';
import { tokens } from '@/lib/design-tokens';
import type { PreviewRuntimeHealthState } from '@/lib/preview/runtime-manager';

import { StatusMetric } from './chromeDockParts';
import { BORDER_SECONDARY, STATUS_ERROR, STATUS_SUCCESS, STATUS_WARNING, SURFACE_SECONDARY, TEXT_SECONDARY } from './chromeStyles';
import type { BottomPanelMode, PanelState, PreviewMode, SidebarTab } from './types';
import type { ShellSourceControlTruth } from './useShellSourceControlTruth';

const statusMetricGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing['4'],
};

type StatusMetricDescriptor = {
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
  runtimeHealth?: PreviewRuntimeHealthState | null;
  runtimeReadinessStatus?: string | null;
  cursorStatus?: EditorCursorStatus | null;
  selectionStatus?: EditorSelectionStatus | null;
  sourceControl?: ShellSourceControlTruth | null;
}

function formatFileLabel(activeFilePath?: string | null, activeFileName?: string) {
  const preferred = activeFilePath || activeFileName || '';
  if (!preferred.trim()) return null;
  const normalized = preferred.replace(/\\/g, '/');
  return normalized.split('/').pop() || normalized;
}

function formatLanguageLabel(language?: string | null) {
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

function formatSidebarLabel(sidebarTab: SidebarTab | undefined, panelState?: PanelState) {
  if (!panelState?.sidebar.open || !sidebarTab) return null;
  if (sidebarTab === 'git') return 'Git';
  if (sidebarTab === 'research') return 'Research';
  return 'Files';
}

function formatPreviewLabel(previewMode: PreviewMode | undefined, panelState?: PanelState) {
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

function getPreviewIcon(previewMode: PreviewMode | undefined) {
  switch (previewMode) {
    case 'console':
      return <Terminal size={12} />;
    default:
      return <Play size={12} />;
  }
}

function formatBottomPanelLabel(activeBottomPanel: BottomPanelMode | undefined, panelState?: PanelState) {
  if (!panelState?.chat.open || !activeBottomPanel) return null;
  return activeBottomPanel === 'terminal' ? 'Terminal' : 'AI Console';
}

function buildDiagnosticsMetrics(activeDiagnostics: MonacoDiagnostic[]): StatusMetricDescriptor[] {
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
      label: `${counts.warnings} aviso${counts.warnings === 1 ? '' : 's'}`,
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
        label: `${advisoryCount} dica${advisoryCount === 1 ? '' : 's'}`,
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

function buildRuntimeMetric(
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
      label: 'Validando runtime',
    };
  }

  if (runtimeHealth.status === 'idle') {
    return {
      icon: <Clock size={12} />,
      label:
        runtimeReadinessStatus === 'ready'
          ? 'Runtime ready'
          : runtimeReadinessStatus === 'partial'
            ? 'Runtime parcial'
            : 'Inline fallback',
    };
  }

  return {
    icon: <AlertCircle size={12} style={{ color: STATUS_ERROR }} />,
    label:
      runtimeHealth.status === 'unhealthy'
        ? 'Runtime error'
        : runtimeHealth.status === 'invalid'
          ? 'Runtime invalido'
          : 'Runtime offline',
  };
}

function formatBranchLabel(branch: string | null): string | null {
  if (!branch?.trim()) return null;
  const trimmed = branch.trim();
  return trimmed.length > 28 ? `${trimmed.slice(0, 25)}...` : trimmed;
}

function buildSourceControlMetrics(sourceControl?: ShellSourceControlTruth | null): StatusMetricDescriptor[] {
  if (!sourceControl) return [];

  if (sourceControl.state === 'loading' || sourceControl.state === 'idle') {
    return [
      {
        icon: <Clock size={12} />,
        label: 'Git verificando',
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
      label: `${sourceControl.conflicted} conflito${sourceControl.conflicted === 1 ? '' : 's'}`,
    });
    return metrics;
  }

  if (sourceControl.isDirty) {
    const parts = [
      sourceControl.staged > 0 ? `${sourceControl.staged} stage` : null,
      sourceControl.unstaged > 0 ? `${sourceControl.unstaged} unstaged` : null,
      sourceControl.untracked > 0 ? `${sourceControl.untracked} novo${sourceControl.untracked === 1 ? '' : 's'}` : null,
    ].filter(Boolean);

    metrics.push({
      icon: <AlertCircle size={12} style={{ color: STATUS_WARNING }} />,
      label: parts.length > 0 ? parts.join(' · ') : `${sourceControl.changedCount} change${sourceControl.changedCount === 1 ? '' : 's'}`,
    });
    return metrics;
  }

  metrics.push({
    icon: <CheckCircle size={12} style={{ color: STATUS_SUCCESS }} />,
    label: 'Git limpo',
  });

  return metrics;
}

export function StatusBar({
  activeFileName,
  activeFilePath,
  activeFileLanguage,
  activeDiagnostics = [],
  panelState,
  activeSidebarTab = 'explorer',
  activePreviewMode = 'runtime',
  activeBottomPanel = 'chat',
  splitEditorOpen = false,
  splitActivePane = 'primary',
  collaborationConnected = false,
  collaboratorCount = 0,
  runtimeHealth,
  runtimeReadinessStatus,
  cursorStatus,
  selectionStatus,
  sourceControl,
}: StatusBarProps) {
  const statusBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing['1.5']} ${tokens.spacing['4']}`,
    background: SURFACE_SECONDARY,
    borderTop: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '28px',
    fontSize: tokens.typography.fontSize.xs,
    color: TEXT_SECONDARY,
    gap: tokens.spacing['4'],
  };

  const fileLabel = formatFileLabel(activeFilePath, activeFileName);
  const languageLabel = formatLanguageLabel(activeFileLanguage);
  const sidebarLabel = formatSidebarLabel(activeSidebarTab, panelState);
  const previewLabel = formatPreviewLabel(activePreviewMode, panelState);
  const bottomPanelLabel = formatBottomPanelLabel(activeBottomPanel, panelState);

  const leadingItems = useMemo<StatusMetricDescriptor[]>(() => {
    const items: StatusMetricDescriptor[] = [];

    if (fileLabel) {
      items.push({
        icon: <Code2 size={12} />,
        label: fileLabel,
      });
    }

    if (languageLabel) {
      items.push({
        icon: <Code2 size={12} />,
        label: languageLabel,
      });
    }

    if (splitEditorOpen) {
      items.push({
        icon: <Columns size={12} />,
        label: splitActivePane === 'secondary' ? 'Split: secundario' : 'Split: primario',
      });
    }

    if (cursorStatus) {
      items.push({
        icon: <Crosshair size={12} />,
        label: `Ln ${cursorStatus.line}, Col ${cursorStatus.column}`,
      });
    }

    if (selectionStatus && selectionStatus.characters > 0) {
      const label =
        selectionStatus.lines > 1
          ? `Selecao ${selectionStatus.lines} linhas`
          : `Selecao ${selectionStatus.characters} chars`;
      items.push({
        icon: <Columns size={12} />,
        label,
      });
    }

    return items;
  }, [cursorStatus, fileLabel, languageLabel, selectionStatus, splitActivePane, splitEditorOpen]);

  const trailingItems = useMemo<StatusMetricDescriptor[]>(() => {
    const items: StatusMetricDescriptor[] = [
      ...buildSourceControlMetrics(sourceControl),
      ...buildDiagnosticsMetrics(activeDiagnostics),
    ];

    if (sidebarLabel) {
      items.push({
        icon:
          activeSidebarTab === 'git' ? (
            <GitBranch size={12} />
          ) : activeSidebarTab === 'research' ? (
            <Sparkles size={12} />
          ) : (
            <FolderTree size={12} />
          ),
        label: sidebarLabel,
      });
    }

    if (bottomPanelLabel) {
      items.push({
        icon: activeBottomPanel === 'terminal' ? <TerminalSquare size={12} /> : <Sparkles size={12} />,
        label: bottomPanelLabel,
      });
    }

    if (previewLabel) {
      items.push({
        icon: getPreviewIcon(activePreviewMode),
        label: previewLabel,
      });
    }

    items.push({
      icon: <Users size={12} style={{ color: collaborationConnected ? STATUS_SUCCESS : undefined }} />,
      label: collaborationConnected
        ? collaboratorCount > 0
          ? `${collaboratorCount} peer${collaboratorCount === 1 ? '' : 's'}`
          : 'Collab online'
        : 'Solo local',
    });

    const runtimeMetric = buildRuntimeMetric(runtimeHealth, runtimeReadinessStatus, panelState);
    if (runtimeMetric) {
      items.push(runtimeMetric);
    }

    return items;
  }, [
    activeBottomPanel,
    activeDiagnostics,
    activePreviewMode,
    activeSidebarTab,
    bottomPanelLabel,
    collaborationConnected,
    collaboratorCount,
    panelState,
    previewLabel,
    runtimeHealth,
    runtimeReadinessStatus,
    sidebarLabel,
    sourceControl,
  ]);

  return (
    <div style={statusBarStyle}>
      <div style={{ ...statusMetricGroupStyle, minWidth: 0, flexWrap: 'wrap' }}>
        {leadingItems.map((item, index) => (
          <StatusMetric key={`${item.label}-${index}`} icon={item.icon} label={item.label} />
        ))}
      </div>

      <div style={{ ...statusMetricGroupStyle, flexShrink: 0, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {trailingItems.map((item, index) => (
          <StatusMetric key={`${item.label}-${index}`} icon={item.icon} label={item.label} />
        ))}
      </div>
    </div>
  );
}
