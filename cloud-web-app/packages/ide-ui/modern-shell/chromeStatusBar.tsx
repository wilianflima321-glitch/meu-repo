'use client'

import React, { useMemo } from 'react'
import { Braces, Code2, Columns, Crosshair, FileCode2, FolderTree, GitBranch, Sparkles, TerminalSquare, Users } from 'lucide-react'

import { WorkspaceProfileSwitcher } from '../../../web/components/ide/WorkspaceProfileSwitcher'
import type { Diagnostic as MonacoDiagnostic } from '../../../web/components/editor/MonacoEditorPro'
import type { EditorCursorStatus, EditorSelectionStatus } from '../fullscreen/types'
import type { PreviewRuntimeHealthState } from '../../../web/lib/preview/runtime-manager'

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
  type StatusBarProps,
  type StatusMetricDescriptor,
} from './chromeStatusBar.parts'
import { ACCENT_CYAN, BORDER_SECONDARY, STATUS_ERROR, STATUS_SUCCESS, STATUS_WARNING, TEXT_TERTIARY } from './chromeStyles'

export type { StatusBarProps } from './chromeStatusBar.parts'

// ─── AAA Metric Component ─────────────────────────────────────────────────────

function AAAStatusMetric({ icon, label, title, onClick, id }: StatusMetricDescriptor) {
  const isCollab = id === 'collab'
  const isRuntime = id === 'runtime'
  const hasDot = isCollab || isRuntime

  // Colored dots for specific states
  let dotColor = ''
  let dotGlow = ''
  let labelColor = ''

  if (isCollab && label !== 'Solo') {
    dotColor = STATUS_SUCCESS
    dotGlow = 'color-mix(in srgb, var(--aethel-success) 40%, transparent)'
    labelColor = STATUS_SUCCESS
  } else if (isCollab) {
    dotColor = TEXT_TERTIARY
    dotGlow = 'transparent'
  }

  if (isRuntime) {
    if (label.includes('Connected')) {
      dotColor = ACCENT_CYAN
      dotGlow = 'color-mix(in srgb, var(--aethel-info) 40%, transparent)'
      labelColor = ACCENT_CYAN
    } else if (label.includes('Error')) {
      dotColor = STATUS_ERROR
      dotGlow = 'color-mix(in srgb, var(--aethel-error) 40%, transparent)'
      labelColor = STATUS_ERROR
    } else {
      dotColor = STATUS_WARNING
      dotGlow = 'color-mix(in srgb, var(--aethel-warning) 40%, transparent)'
      labelColor = STATUS_WARNING
    }
  }

  const content = (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all duration-200">
      {hasDot ? (
        <div className="relative flex items-center justify-center w-3 h-3 shrink-0">
          <div
            className={`absolute w-1.5 h-1.5 rounded-full ${isCollab && label !== 'Solo' ? 'animate-ping' : ''}`}
            style={{ background: dotColor, opacity: 0.4 }}
          />
          <div
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ background: dotColor, boxShadow: `0 0 6px ${dotGlow}` }}
          />
        </div>
      ) : (
        <span style={{ color: 'var(--aethel-text-tertiary)' }} className="group-hover:text-[var(--aethel-text-secondary)] transition-colors">
          {icon}
        </span>
      )}
      <span
        className="font-mono text-[10px]"
        style={{ color: labelColor || 'var(--aethel-text-secondary)' }}
      >
        {label}
      </span>
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        title={title ?? label}
        onClick={onClick}
        className="group relative outline-none"
      >
        <div className="absolute inset-0 rounded-md bg-white/5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-visible:ring-1 group-focus-visible:ring-blue-500" />
        {content}
      </button>
    )
  }

  return (
    <div title={title ?? label} className="cursor-default">
      {content}
    </div>
  )
}

// ─── StatusBar ────────────────────────────────────────────────────────────────

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
  const fileLabel = formatFileLabel(activeFilePath, activeFileName)
  const languageLabel = formatLanguageLabel(activeFileLanguage)
  const sidebarLabel = formatSidebarLabel(activeSidebarTab, panelState)
  const previewLabel = formatPreviewLabel(activePreviewMode, panelState)
  const bottomPanelLabel = formatBottomPanelLabel(activeBottomPanel, panelState)

  const leadingItems = useMemo<StatusMetricDescriptor[]>(() => {
    const items: StatusMetricDescriptor[] = []

    if (fileLabel) {
      items.push({
        id: 'file',
        icon: <FileCode2 size={12} />,
        label: fileLabel,
      })
    }

    if (languageLabel) {
      items.push({
        id: 'lang',
        icon: <Braces size={12} />,
        label: languageLabel,
      })
    }

    if (splitEditorOpen) {
      items.push({
        id: 'split',
        icon: <Columns size={12} />,
        label: splitActivePane === 'secondary' ? 'Split: secondary' : 'Split: primary',
      })
    }

    if (cursorStatus) {
      items.push({
        id: 'cursor',
        icon: <Crosshair size={12} />,
        label: `Ln ${cursorStatus.line}, Col ${cursorStatus.column}`,
      })
    }

    if (selectionStatus && selectionStatus.characters > 0) {
      const label =
        selectionStatus.lines > 1
          ? `Selection ${selectionStatus.lines} lines`
          : `Selection ${selectionStatus.characters} chars`
      items.push({
        id: 'selection',
        icon: <Columns size={12} />,
        label,
      })
    }

    return items
  }, [cursorStatus, fileLabel, languageLabel, selectionStatus, splitActivePane, splitEditorOpen])

  const trailingItems = useMemo<StatusMetricDescriptor[]>(() => {
    const items: StatusMetricDescriptor[] = [
      ...buildSourceControlMetrics(sourceControl),
      ...buildDiagnosticsMetrics(activeDiagnostics),
    ]

    if (sidebarLabel) {
      items.push({
        id: 'sidebar',
        icon:
          activeSidebarTab === 'git' ? (
            <GitBranch size={12} />
          ) : activeSidebarTab === 'research' ? (
            <Sparkles size={12} />
          ) : (
            <FolderTree size={12} />
          ),
        label: sidebarLabel,
      })
    }

    if (bottomPanelLabel) {
      items.push({
        id: 'panel',
        icon: activeBottomPanel === 'terminal' ? <TerminalSquare size={12} /> : <Sparkles size={12} />,
        label: bottomPanelLabel,
      })
    }

    if (previewLabel) {
      items.push({
        id: 'preview',
        icon: getPreviewIcon(activePreviewMode),
        label: previewLabel,
      })
    }

    items.push({
      id: 'collab',
      icon: <Users size={12} />,
      label: collaborationSyncLed
        ? collaborationSyncLed.state === 'synced' && collaboratorCount > 0
          ? `${collaborationSyncLed.label} · ${collaboratorCount} peer${collaboratorCount === 1 ? '' : 's'}`
          : collaborationSyncLed.label
        : collaborationConnected
          ? collaboratorCount > 0
            ? `${collaboratorCount} peer${collaboratorCount === 1 ? '' : 's'}`
            : 'Collab online'
          : 'Solo',
    })

    const runtimeMetric = buildRuntimeMetric(runtimeHealth, runtimeReadinessStatus, panelState)
    if (runtimeMetric) {
      items.push(runtimeMetric)
    }

    return items
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
  ])

  return (
    <div
      className="flex min-h-[30px] items-center justify-between gap-4 px-3 py-1 text-[var(--aethel-text-secondary)] z-50 relative"
      style={{
        background: 'color-mix(in srgb, var(--aethel-surface-primary) 92%, transparent)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${BORDER_SECONDARY}`,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
      }}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {leadingItems.map((item) => (
          <AAAStatusMetric key={item.id} {...item} />
        ))}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <WorkspaceProfileSwitcher compact />
        <div className="flex flex-wrap items-center gap-2">
          {trailingItems.map((item) => (
            <AAAStatusMetric key={item.id} {...item} />
          ))}
        </div>
      </div>
    </div>
  )
}
