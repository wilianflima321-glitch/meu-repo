import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { AssetBrowserPanel } from '../../../../cloud-web-app/web/components/studio/AssetBrowserPanel'
import type { RuntimeAdapter, RuntimeProbe } from '../../../../packages/aethel-ide-shared/src/runtime-adapter/types'
import {
  loadStudioLocalDockLayout,
  saveStudioLocalDockLayout,
  type StudioLocalDockLayout,
} from '../ide/desktopDockLayout'
import type { NativeIDEBackend } from '../ide/NativeIDEBackend'
import { AssetCookerPanel } from './AssetCookerPanel'
import { CloudHandoffBridge } from './CloudHandoffBridge'
import { FpsOverlayBadge } from './FpsOverlayBadge'
import { HardwareProfilerPanel } from './HardwareProfilerPanel'
import { JobsLane, type JobRecord } from './JobsLane'
import { LspFarmStatusPanel } from './LspFarmStatusPanel'
import { MonacoCodeEditorPanel } from './MonacoCodeEditorPanel'
import { ScenePanel } from './ScenePanel'
import { TerminalPanel } from './TerminalPanel'

type ResizeAxis = 'outliner' | 'tools' | 'bottom' | 'monaco'

/**
 * UE-like Scene & Tools shell: World Outliner | Monaco + Details | Tools,
 * with a bottom Terminal/Jobs/Honesty strip. Split sizes persist via
 * `aethel.studio-local.dock.v1`. No theater FPS/VRAM; no wgpu present claim.
 */
export function SceneToolsWorkbench({
  backend,
  adapter,
  probe,
  jobs,
  onJobsChange,
}: {
  backend: NativeIDEBackend
  adapter: RuntimeAdapter
  probe: RuntimeProbe | null
  jobs: JobRecord[]
  onJobsChange: (jobs: JobRecord[]) => void
}) {
  const [layout, setLayout] = useState<StudioLocalDockLayout>(() => loadStudioLocalDockLayout())
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef<{
    axis: ResizeAxis
    startX: number
    startY: number
    startOutliner: number
    startTools: number
    startBottom: number
    startMonaco: number
  } | null>(null)

  const commitLayout = useCallback((next: StudioLocalDockLayout) => {
    setLayout(next)
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      saveStudioLocalDockLayout(next)
    }, 120)
  }, [])

  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
    }
  }, [])

  const onResizePointerDown = (axis: ResizeAxis) => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      axis,
      startX: event.clientX,
      startY: event.clientY,
      startOutliner: layout.outlinerWidthPx,
      startTools: layout.toolsWidthPx,
      startBottom: layout.bottomHeightPx,
      startMonaco: layout.monacoFlex,
    }
  }

  const onResizePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (drag.axis === 'outliner') {
      commitLayout({ ...layout, outlinerWidthPx: drag.startOutliner + dx })
    } else if (drag.axis === 'tools') {
      commitLayout({ ...layout, toolsWidthPx: drag.startTools - dx })
    } else if (drag.axis === 'bottom') {
      commitLayout({ ...layout, bottomHeightPx: drag.startBottom - dy })
    } else if (drag.axis === 'monaco') {
      // Approximate flex change from vertical drag inside center column.
      const delta = dy / 480
      commitLayout({ ...layout, monacoFlex: drag.startMonaco + delta })
    }
  }

  const onResizePointerUp = () => {
    dragRef.current = null
  }

  const toolsTabs: Array<{ id: StudioLocalDockLayout['activeToolsTab']; label: string }> = [
    { id: 'assets', label: 'Assets' },
    { id: 'cooker', label: 'Cooker' },
    { id: 'hardware', label: 'Hardware' },
    { id: 'lsp', label: 'LSP' },
    { id: 'handoff', label: 'Handoff' },
  ]

  const bottomTabs: Array<{ id: StudioLocalDockLayout['activeBottomTab']; label: string }> = [
    { id: 'terminal', label: 'Terminal' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'honesty', label: 'Honesty' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-0 overflow-hidden">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* World Outliner */}
        {!layout.outlinerCollapsed && (
          <>
            <div
              className="flex min-h-0 shrink-0 flex-col overflow-hidden"
              style={{ width: layout.outlinerWidthPx }}
            >
              <div className="relative flex h-full min-h-0 flex-col">
                <button
                  type="button"
                  className="absolute right-2 top-2 z-10 text-[10px] font-semibold text-[var(--aethel-text-tertiary)]"
                  onClick={() => commitLayout({ ...layout, outlinerCollapsed: true })}
                >
                  Collapse
                </button>
                <ScenePanel backend={backend} mode="outliner" />
              </div>
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize World Outliner"
              className="studio-dock-handle-v"
              onPointerDown={onResizePointerDown('outliner')}
              onPointerMove={onResizePointerMove}
              onPointerUp={onResizePointerUp}
            />
          </>
        )}

        {/* Center: Monaco + Details + viewport honesty */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className="relative min-h-0 overflow-hidden"
            style={{ flex: `${layout.monacoFlex} 1 0%` }}
          >
            <MonacoCodeEditorPanel />
          </div>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize editor vs details"
            className="studio-dock-handle-h"
            onPointerDown={onResizePointerDown('monaco')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
          />
          <div className="relative min-h-0 overflow-hidden" style={{ flex: `${1 - layout.monacoFlex} 1 0%` }}>
            <FpsOverlayBadge probe={probe} />
            <ScenePanel backend={backend} mode="details" />
          </div>
        </div>

        {/* Right tools */}
        {!layout.toolsCollapsed && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize tools column"
              className="studio-dock-handle-v"
              onPointerDown={onResizePointerDown('tools')}
              onPointerMove={onResizePointerMove}
              onPointerUp={onResizePointerUp}
            />
            <div
              className="flex min-h-0 shrink-0 flex-col overflow-hidden"
              style={{ width: layout.toolsWidthPx }}
            >
              <div className="panel flex h-full min-h-0 flex-col">
                <div className="panel-heading">
                  <span>Tools</span>
                  <button
                    type="button"
                    className="text-[10px] text-[var(--aethel-text-tertiary)]"
                    onClick={() => commitLayout({ ...layout, toolsCollapsed: true })}
                  >
                    Collapse
                  </button>
                </div>
                <div className="mb-2 flex flex-wrap gap-1">
                  {toolsTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => commitLayout({ ...layout, activeToolsTab: tab.id })}
                      className={[
                        'rounded-md border px-2 py-1 text-[10px] font-semibold',
                        layout.activeToolsTab === tab.id
                          ? 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-primary)]'
                          : 'border-transparent text-[var(--aethel-text-tertiary)]',
                      ].join(' ')}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {layout.activeToolsTab === 'assets' && <AssetBrowserPanel />}
                  {layout.activeToolsTab === 'cooker' && <AssetCookerPanel />}
                  {layout.activeToolsTab === 'hardware' && <HardwareProfilerPanel />}
                  {layout.activeToolsTab === 'lsp' && <LspFarmStatusPanel />}
                  {layout.activeToolsTab === 'handoff' && <CloudHandoffBridge probe={probe} />}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom dock */}
      {!layout.bottomCollapsed && (
        <>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize bottom dock"
            className="studio-dock-handle-h"
            onPointerDown={onResizePointerDown('bottom')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
          />
          <div className="shrink-0 overflow-hidden" style={{ height: layout.bottomHeightPx }}>
            <div className="panel flex h-full min-h-0 flex-col">
              <div className="panel-heading">
                <div className="flex flex-wrap gap-1">
                  {bottomTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => commitLayout({ ...layout, activeBottomTab: tab.id })}
                      className={[
                        'rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                        layout.activeBottomTab === tab.id
                          ? 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-primary)]'
                          : 'border-transparent text-[var(--aethel-text-tertiary)]',
                      ].join(' ')}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-[10px] text-[var(--aethel-text-tertiary)]"
                  onClick={() => commitLayout({ ...layout, bottomCollapsed: true })}
                >
                  Collapse
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {layout.activeBottomTab === 'terminal' && <TerminalPanel backend={backend} />}
                {layout.activeBottomTab === 'jobs' && (
                  <JobsLane adapter={adapter} jobs={jobs} onJobsChange={onJobsChange} />
                )}
                {layout.activeBottomTab === 'honesty' && (
                  <div className="space-y-2 p-1 text-xs" style={{ color: 'var(--aethel-text-tertiary)' }}>
                    <p>
                      <strong style={{ color: 'var(--aethel-text-secondary)' }}>Desktop honesty</strong>
                      {' — '}
                      World Outliner binds scene_* IPC. Monaco binds L.13 lsp_farm when live.
                      Terminal is human-lane only (Law #48). wgpu present-in-WebView remains{' '}
                      <strong style={{ color: 'var(--aethel-warning-light)' }}>HELD</strong>. Hub
                      checkout HELD. No fabricated FPS/VRAM.
                    </p>
                    <LspFarmStatusPanel />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Collapsed rail restore chips */}
      {(layout.outlinerCollapsed || layout.toolsCollapsed || layout.bottomCollapsed) && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--aethel-border-secondary)] px-2 py-1">
          {layout.outlinerCollapsed && (
            <button
              type="button"
              className="text-[10px] font-semibold text-[var(--aethel-info-light)]"
              onClick={() => commitLayout({ ...layout, outlinerCollapsed: false })}
            >
              Show Outliner
            </button>
          )}
          {layout.toolsCollapsed && (
            <button
              type="button"
              className="text-[10px] font-semibold text-[var(--aethel-info-light)]"
              onClick={() => commitLayout({ ...layout, toolsCollapsed: false })}
            >
              Show Tools
            </button>
          )}
          {layout.bottomCollapsed && (
            <button
              type="button"
              className="text-[10px] font-semibold text-[var(--aethel-info-light)]"
              onClick={() => commitLayout({ ...layout, bottomCollapsed: false })}
            >
              Show Bottom Dock
            </button>
          )}
        </div>
      )}
    </div>
  )
}
