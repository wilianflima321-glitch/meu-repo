'use client'

import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  HeaderAction,
  Panel,
  ResizeGrip,
  STATUS_DOT,
  STATUS_TONE,
  ToolbarBtn,
  type CreativeWorkbenchEvidence,
} from './CreativeWorkbenchShell.parts'
import { cn } from '@/lib/utils'

export type { CreativeWorkbenchEvidence, CreativeWorkbenchSlotStatus } from './CreativeWorkbenchShell.parts'

// --- Types --------------------------------------------------------------------

export type CreativeWorkbenchShellProps = {
  title: string
  mode: 'World' | 'Character' | 'FX' | 'Film' | 'Logic'
  primaryAction: ReactNode
  viewport: ReactNode
  outliner?: ReactNode
  inspector?: ReactNode
  timeline?: ReactNode
  assetBrowser?: ReactNode
  renderQueue?: ReactNode
  reviewEvidence?: ReactNode
  evidence?: CreativeWorkbenchEvidence[]
  className?: string
}

type PanelState = {
  outliner: boolean
  inspector: boolean
  timeline: boolean
  assetBrowser: boolean
  renderQueue: boolean
  /** px widths / heights */
  leftW: number
  rightW: number
  timelineH: number
}

const DEFAULTS: PanelState = {
  outliner: true,
  inspector: true,
  timeline: true,
  assetBrowser: false,
  renderQueue: false,
  leftW: 200,
  rightW: 240,
  timelineH: 180,
}

const CONSTRAINTS = {
  leftW:     { min: 140, max: 340 },
  rightW:    { min: 180, max: 400 },
  timelineH: { min: 100, max: 300 },
}

// --- Persistence --------------------------------------------------------------

function layoutKey(mode: string) {
  return `aethel-workbench-layout:${mode.toLowerCase()}`
}

function loadLayout(mode: string): PanelState {
  try {
    const raw = localStorage.getItem(layoutKey(mode))
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

function saveLayout(mode: string, state: PanelState) {
  try {
    localStorage.setItem(layoutKey(mode), JSON.stringify(state))
  } catch { /* quota exceeded - silent */ }
}

// --- Drag-resize hook ---------------------------------------------------------

type ResizeAxis = 'horizontal' | 'vertical'

function useResizeHandle(
  onDelta: (delta: number) => void,
  axis: ResizeAxis = 'horizontal',
) {
  const dragging = useRef(false)
  const origin   = useRef(0)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [])

  const onMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault()
    cleanupRef.current?.()
    dragging.current = true
    origin.current   = axis === 'horizontal' ? e.clientX : e.clientY

    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return
      const curr  = axis === 'horizontal' ? me.clientX : me.clientY
      const delta = curr - origin.current
      origin.current = curr
      onDelta(delta)
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      cleanupRef.current = null
    }
    cleanupRef.current = onUp
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onDelta, axis])

  return onMouseDown
}

// --- Main component -----------------------------------------------------------

export function CreativeWorkbenchShell({
  title,
  mode,
  primaryAction,
  viewport,
  outliner,
  inspector,
  timeline,
  assetBrowser,
  renderQueue,
  reviewEvidence,
  evidence = [],
  className,
}: CreativeWorkbenchShellProps) {
  // -- State (loaded from localStorage on mount) ----------------------------
  const [st, setSt] = useState<PanelState>(DEFAULTS)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setSt(loadLayout(mode))
    setMounted(true)
  }, [mode])

  // -- Persist on every state change (after mount) --------------------------
  useEffect(() => {
    if (!mounted) return
    saveLayout(mode, st)
  }, [st, mode, mounted])

  const toggle = useCallback((k: keyof PanelVisibilityKeys) => {
    setSt((prev) => ({ ...prev, [k]: !prev[k] }))
  }, [])

  const resetLayout = useCallback(() => {
    setSt(DEFAULTS)
  }, [])

  const resizeLeft = useCallback((delta: number) => {
    setSt((prev) => ({
      ...prev,
      leftW: Math.max(CONSTRAINTS.leftW.min, Math.min(CONSTRAINTS.leftW.max, prev.leftW + delta)),
    }))
  }, [])

  const resizeRight = useCallback((delta: number) => {
    setSt((prev) => ({
      ...prev,
      rightW: Math.max(CONSTRAINTS.rightW.min, Math.min(CONSTRAINTS.rightW.max, prev.rightW - delta)),
    }))
  }, [])

  const resizeTimeline = useCallback((delta: number) => {
    setSt((prev) => ({
      ...prev,
      timelineH: Math.max(CONSTRAINTS.timelineH.min, Math.min(CONSTRAINTS.timelineH.max, prev.timelineH - delta)),
    }))
  }, [])

  // -- Drag-resize handles --------------------------------------------------
  const onLeftResize = useResizeHandle(resizeLeft)
  const onRightResize = useResizeHandle(resizeRight)
  const onTimelineResize = useResizeHandle(resizeTimeline, 'vertical')

  // -- Keyboard shortcuts Alt+1-5 -------------------------------------------
  useEffect(() => {
    const map: Record<string, keyof PanelVisibilityKeys> = {
      '1': 'outliner', '2': 'inspector', '3': 'timeline', '4': 'assetBrowser', '5': 'renderQueue',
    }
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || !map[e.key]) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      toggle(map[e.key])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  // -- Derived flags --------------------------------------------------------
  const leftOpen  = (!!outliner && st.outliner)  || (!!assetBrowser && st.assetBrowser)
  const rightOpen = (!!inspector && st.inspector) || (!!renderQueue && st.renderQueue)
  const timelineOpen = !!timeline && st.timeline

  const mobilePanels = [
    outliner     && st.outliner     && { label: 'Outliner',      key: 'outliner'     as const, node: outliner },
    assetBrowser && st.assetBrowser && { label: 'Assets',        key: 'assetBrowser' as const, node: assetBrowser },
    inspector    && st.inspector    && { label: 'Inspector',      key: 'inspector'    as const, node: inspector },
    renderQueue  && st.renderQueue  && { label: 'Review queue',   key: 'renderQueue'  as const, node: renderQueue },
  ].filter(Boolean) as { label: string; key: keyof PanelVisibilityKeys; node: ReactNode }[]

  // Don't render panels until localStorage resolves to avoid layout flash
  if (!mounted) return (
    <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-primary)]">
      <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--aethel-surface-secondary)]" />
    </div>
  )

  return (
    <div
      className={cn('flex h-full min-h-[600px] flex-col overflow-hidden bg-[var(--aethel-surface-primary)]', className)}
      data-creative-workbench={mode.toLowerCase()}
    >
      {/* -- Header ---------------------------------------------------------- */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-3 py-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-quaternary)]">
            {mode} workbench
          </span>
          <h2 className="truncate text-[13px] font-semibold leading-tight text-[var(--aethel-text-primary)]">
            {title}
          </h2>
        </div>

        {/* Panel toggles - scrollable on small screens */}
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto" role="toolbar" aria-label="Toggle workbench panels">
          {outliner     && <ToolbarBtn label="Outliner"  active={st.outliner}     onClick={() => toggle('outliner')}     title="Alt+1 - Toggle outliner" />}
          {inspector    && <ToolbarBtn label="Inspector" active={st.inspector}    onClick={() => toggle('inspector')}    title="Alt+2 - Toggle inspector" />}
          {timeline     && <ToolbarBtn label="Timeline"  active={st.timeline}     onClick={() => toggle('timeline')}     title="Alt+3 - Toggle timeline" />}
          {assetBrowser && <ToolbarBtn label="Assets"    active={st.assetBrowser} onClick={() => toggle('assetBrowser')} title="Alt+4 - Toggle asset browser" />}
          {renderQueue  && <ToolbarBtn label="Review"    active={st.renderQueue}  onClick={() => toggle('renderQueue')}  title="Alt+5 - Toggle review queue" />}
          <HeaderAction label="Reset" onClick={resetLayout} title="Reset workbench layout" />
        </div>

        <div className="shrink-0">{primaryAction}</div>
      </header>

      {/* -- Mobile panels (drawer above viewport) --------------------------- */}
      {mobilePanels.length > 0 && (
        <div className="max-h-56 shrink-0 overflow-y-auto border-b border-[var(--aethel-border-subtle)] p-2 lg:hidden">
          <div className="grid gap-2">
            {mobilePanels.map(({ label, key, node }) => (
              <Panel key={key} label={label} open={true} onToggle={() => toggle(key)}>
                {node}
              </Panel>
            ))}
          </div>
        </div>
      )}

      {/* -- Main layout ----------------------------------------------------- */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Left column: outliner + assets - draggable width */}
        {leftOpen && (
          <>
            <aside
              className="hidden shrink-0 flex-col gap-2 overflow-y-auto border-r border-[var(--aethel-border-subtle)] p-2 lg:flex"
              style={{ width: st.leftW }}
              aria-label="Left panels"
            >
              {outliner && st.outliner && (
                <Panel label="Outliner" open={st.outliner} onToggle={() => toggle('outliner')} className="flex-1 min-h-0">
                  {outliner}
                </Panel>
              )}
              {assetBrowser && st.assetBrowser && (
                <Panel label="Assets" open={st.assetBrowser} onToggle={() => toggle('assetBrowser')} className={outliner ? 'max-h-48' : 'flex-1 min-h-0'}>
                  {assetBrowser}
                </Panel>
              )}
            </aside>
            <ResizeGrip
              axis="horizontal"
              label="Resize left workbench panels"
              value={st.leftW}
              min={CONSTRAINTS.leftW.min}
              max={CONSTRAINTS.leftW.max}
              onMouseDown={onLeftResize}
              onKeyDelta={resizeLeft}
            />
          </>
        )}

        {/* Center: viewport (flex-1) + timeline (fixed height) */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full w-full overflow-hidden">{viewport}</div>
          </div>

          {timelineOpen && (
            <>
              <ResizeGrip
                axis="vertical"
                label="Resize timeline"
                value={st.timelineH}
                min={CONSTRAINTS.timelineH.min}
                max={CONSTRAINTS.timelineH.max}
                onMouseDown={onTimelineResize}
                onKeyDelta={resizeTimeline}
              />
              <div
                className="shrink-0 overflow-hidden border-t border-[var(--aethel-border-subtle)]"
                style={{ height: st.timelineH }}
              >
                <Panel label="Timeline" open={st.timeline} onToggle={() => toggle('timeline')} className="h-full">
                  {timeline}
                </Panel>
              </div>
            </>
          )}
        </div>

        {/* Right column: inspector + render queue - draggable width */}
        {rightOpen && (
          <>
            <ResizeGrip
              axis="horizontal"
              label="Resize right workbench panels"
              value={st.rightW}
              min={CONSTRAINTS.rightW.min}
              max={CONSTRAINTS.rightW.max}
              onMouseDown={onRightResize}
              onKeyDelta={resizeRight}
            />
            <aside
              className="hidden shrink-0 flex-col gap-2 overflow-y-auto border-l border-[var(--aethel-border-subtle)] p-2 lg:flex"
              style={{ width: st.rightW }}
              aria-label="Right panels"
            >
              {inspector && st.inspector && (
                <Panel label="Inspector" open={st.inspector} onToggle={() => toggle('inspector')} className="flex-1 min-h-0">
                  {inspector}
                </Panel>
              )}
              {renderQueue && st.renderQueue && (
                <Panel label="Review queue" open={st.renderQueue} onToggle={() => toggle('renderQueue')} className={inspector ? 'max-h-56' : 'flex-1 min-h-0'}>
                  {renderQueue}
                </Panel>
              )}
            </aside>
          </>
        )}
      </div>

      {/* -- Evidence footer -------------------------------------------------- */}
      {(evidence.length > 0 || reviewEvidence) && (
        <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_12%,transparent)] px-3 py-2">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {evidence.length > 0 ? (
              evidence.map((item) => (
                <span
                  key={item.label}
                  title={item.detail}
                  className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]', STATUS_TONE[item.status])}
                >
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[item.status])} aria-hidden="true" />
                  {item.label}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-[var(--aethel-text-quaternary)]">No evidence receipts.</span>
            )}
          </div>
          {reviewEvidence && <div className="shrink-0">{reviewEvidence}</div>}
        </footer>
      )}
    </div>
  )
}

// Type alias used internally for toggle keys
type PanelVisibilityKeys = Pick<PanelState, 'outliner' | 'inspector' | 'timeline' | 'assetBrowser' | 'renderQueue'>

export default CreativeWorkbenchShell
