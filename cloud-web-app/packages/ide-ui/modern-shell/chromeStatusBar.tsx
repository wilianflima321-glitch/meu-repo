'use client'

import React, { useMemo } from 'react'
import { Braces, Code2, Columns, Crosshair, FileCode2, FolderTree, GitBranch, Sparkles, TerminalSquare, Users } from 'lucide-react'

import { WorkspaceProfileSwitcher } from '../../../web/components/ide/WorkspaceProfileSwitcher'
import type { Diagnostic as MonacoDiagnostic } from '../../../web/components/editor/MonacoEditorPro'
import type { EditorCursorStatus, EditorSelectionStatus } from '../fullscreen/types'
import { tokens } from '../../../web/lib/design-tokens'
import type { PreviewRuntimeHealthState } from '../../../web/lib/preview/runtime-manager'

import { StatusMetric } from './chromeDockParts'
import { BORDER_SECONDARY, STATUS_SUCCESS, SURFACE_SECONDARY, TEXT_SECONDARY } from './chromeStyles'
import type { BottomPanelMode, PanelState, PreviewMode, SidebarTab } from './types'
import type { ShellSourceControlTruth } from './useShellSourceControlTruth'
import {
  buildDiagnosticsMetrics,
  buildRuntimeMetric,
  buildSourceControlMetrics,
  formatBottomPanelLabel,
  formatFileLabel,
  formatLanguageLabel,
  formatPreviewLabel,
  formatSidebarLabel,
  getPreviewIcon,
  statusMetricGroupStyle,
  type StatusBarProps,
  type StatusMetricDescriptor,
} from './chromeStatusBar.parts'

export type { StatusBarProps } from './chromeStatusBar.parts'

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
  collaborationSyncLed = null,
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
        icon: <FileCode2 size={12} />,
        label: fileLabel,
      });
    }

    if (languageLabel) {
      items.push({
        icon: <Braces size={12} />,
        label: languageLabel,
      });
    }

    if (splitEditorOpen) {
      items.push({
        icon: <Columns size={12} />,
        label: splitActivePane === 'secondary' ? 'Split: secondary' : 'Split: primary',
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
          ? `Selection ${selectionStatus.lines} lines`
          : `Selection ${selectionStatus.characters} chars`;
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
      icon: <Users size={12} style={{ color: collaborationConnected || collaborationSyncLed?.tone === 'success' ? STATUS_SUCCESS : undefined }} />,
      label: collaborationSyncLed
        ? collaborationSyncLed.state === 'synced' && collaboratorCount > 0
          ? `${collaborationSyncLed.label} · ${collaboratorCount} peer${collaboratorCount === 1 ? '' : 's'}`
          : collaborationSyncLed.label
        : collaborationConnected
          ? collaboratorCount > 0
            ? `${collaboratorCount} peer${collaboratorCount === 1 ? '' : 's'}`
            : 'Collab online'
          : 'Solo',
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
    collaborationSyncLed,
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

      <div style={{ ...statusMetricGroupStyle, flexShrink: 0, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing['2'] }}>
        <WorkspaceProfileSwitcher compact />
        {trailingItems.map((item, index) => (
          <StatusMetric key={`${item.label}-${index}`} icon={item.icon} label={item.label} />
        ))}
      </div>
    </div>
  );
}
