'use client'

/**
 * PreIDEShell — The Creative Studio Hub Shell (Best-in-Market Pre-IDE Experience)
 *
 * ARCHITECTURE:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  TopBar (Nav breadcrumb | Mode tabs | Right actions)    │
 *   ├─────────────────┬───────────────────────┬───────────────┤
 *   │  LeftRail       │  Viewport (DOMINANT)  │  NexusRail    │
 *   │  (Outliner /    │  3D / Film / Canvas   │  (AI Chat     │
 *   │   Asset tree)   │  [One protagonist]    │   + Agents    │
 *   │  [collapsible]  │                       │   + Evidence) │
 *   │                 │                       │  [collapsible]│
 *   ├─────────────────┴───────────────────────┴───────────────┤
 *   │  BottomDock (Timeline / Inspector / Logs) [resizable]   │
 *   └─────────────────────────────────────────────────────────┘
 *
 * DESIGN LAWS:
 * - Viewport = ONE dominant surface. Never split 50/50 with chat (Rule C).
 * - NexusRail = chat is an "operational rail", not center stage.
 * - Framer-motion spring physics on all panel resizes and transitions.
 * - CSS vars only. No inline hex. Glassmorphism throughout.
 * - Command palette (Ctrl+K) always accessible.
 * - Panels persist via localStorage through lib/storage/ui-persistence-spine.
 *
 * WIRING NOTE: All slot props accept ReactNode. Connect:
 *   - viewportSlot  → SceneViewport3D | FilmDirectorStage | CanvasEditor
 *   - nexusSlot     → AgentsWindow (existing)
 *   - outlineSlot   → WorldSceneOutliner (existing)
 *   - inspectorSlot → WorldObjectInspector (existing)
 *   - timelineSlot  → CanonicalSequencer (existing)
 *   - assetSlot     → AssetBrowserPanel (existing)
 */

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Clock,
  Compass,
  Film,
  FolderArchive,
  Globe,
  ListTree,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  User,
  Volume2,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getWorkbenchLayout, setWorkbenchLayout } from '@/lib/storage/ui-persistence-spine'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PreIDEMode = 'world' | 'film' | 'vfx' | 'character' | 'audio' | 'logic'

export type PreIDEFidelityMode = 'auto' | 'performance' | 'quality' | 'ultra'

export type NexusTab = 'agents' | 'chat' | 'evidence' | 'research'

export type BottomDockTab = 'timeline' | 'inspector' | 'assets' | 'logs'

interface PreIDEShellProps {
  /** Active creative mode */
  mode: PreIDEMode
  /** Called when user switches mode via tab */
  onModeChange?: (mode: PreIDEMode) => void
  /** The primary 3D/film/canvas viewport — DOMINANT surface */
  viewportSlot: ReactNode
  /** Left panel: scene outliner, world hierarchy */
  outlineSlot?: ReactNode
  /** Right Nexus rail: agents, chat, evidence */
  nexusSlot?: ReactNode
  chatSlot?: ReactNode
  evidenceSlot?: ReactNode
  researchSlot?: ReactNode
  /** Bottom dock: timeline, inspector, assets, logs */
  timelineSlot?: ReactNode
  inspectorSlot?: ReactNode
  assetSlot?: ReactNode
  logsSlot?: ReactNode
  /** Top right — project actions, run scope, deploy */
  headerActionsSlot?: ReactNode
  /** Optional profiler overlay */
  profilerSlot?: ReactNode
  /** Project name for display */
  projectName?: string
  /** Runtime lane indicator */
  runtimeLane?: 'browser' | 'local' | 'cloud'
  /** Whether AI agents are active */
  activeAgentCount?: number
  /**
   * Hardware Capability Score 0–100 (from useViewportFidelityState).
   * Shown in the TopBar runtime lane chip. If 0 or omitted, chip hides the score.
   * Law XV — Scalable Fidelity / Anti-Mock: never fabricate this number.
   */
  capabilityScore?: number
  /** Law XV — The single fidelity control */
  fidelityMode?: PreIDEFidelityMode
  onFidelityModeChange?: (mode: PreIDEFidelityMode) => void
  className?: string
}

// ─── Layout State ─────────────────────────────────────────────────────────────

interface LayoutState {
  leftW: number
  rightW: number
  bottomH: number
  leftOpen: boolean
  rightOpen: boolean
  bottomOpen: boolean
  activeBottomTab: BottomDockTab
  activeNexusTab: NexusTab
}

const LAYOUT_DEFAULTS: LayoutState = {
  leftW: 220,
  rightW: 300,
  bottomH: 220,
  leftOpen: true,
  rightOpen: true,
  bottomOpen: true,
  activeBottomTab: 'timeline',
  activeNexusTab: 'agents',
}

const CONSTRAINTS = {
  leftW:   { min: 160, max: 360 },
  rightW:  { min: 240, max: 440 },
  bottomH: { min: 120, max: 380 },
}

// ─── Resize Hook ──────────────────────────────────────────────────────────────

function useResizeHandle(onDelta: (delta: number) => void, axis: 'horizontal' | 'vertical' = 'horizontal') {
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => () => { cleanupRef.current?.() }, [])

  return useCallback((e: ReactMouseEvent) => {
    e.preventDefault()
    cleanupRef.current?.()
    let origin = axis === 'horizontal' ? e.clientX : e.clientY

    const onMove = (me: MouseEvent) => {
      const curr = axis === 'horizontal' ? me.clientX : me.clientY
      onDelta(curr - origin)
      origin = curr
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      cleanupRef.current = null
    }
    cleanupRef.current = onUp
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onDelta, axis])
}

// ─── Mode Tabs ────────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<PreIDEMode, { label: string; icon: LucideIcon; color: string }> = {
  world:     { label: 'World',     icon: Globe,    color: 'var(--aethel-primary)' },
  film:      { label: 'Film',      icon: Film,     color: 'var(--aethel-primary)' },
  vfx:       { label: 'VFX',       icon: Sparkles, color: 'var(--aethel-info)' },
  character: { label: 'Character', icon: User,     color: 'var(--aethel-warning)' },
  audio:     { label: 'Audio',     icon: Volume2,  color: 'var(--aethel-success)' },
  logic:     { label: 'Logic',     icon: Workflow, color: 'var(--aethel-accent)' },
}

const LANE_COLORS = {
  browser: 'var(--aethel-warning)',
  local:   'var(--aethel-success)',
  cloud:   'var(--aethel-info)',
}

// ─── ResizeGrip ───────────────────────────────────────────────────────────────

function ResizeGrip({
  axis,
  onMouseDown,
  label,
}: {
  axis: 'horizontal' | 'vertical'
  onMouseDown: (e: ReactMouseEvent) => void
  label: string
}) {
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // keyboard accessible resize handled by parent toggle
    if (e.key === ' ' || e.key === 'Enter') e.preventDefault()
  }

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={axis}
      onMouseDown={onMouseDown}
      onKeyDown={handleKeyDown}
      className={cn(
        'group z-10 shrink-0 select-none transition-colors',
        'bg-transparent hover:bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)]',
        'focus-visible:outline-none focus-visible:bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)]',
        axis === 'horizontal' ? 'w-[3px] cursor-col-resize' : 'h-[3px] cursor-row-resize',
      )}
    >
      <div
        className={cn(
          'opacity-0 group-hover:opacity-100 transition-opacity rounded-full mx-auto my-auto',
          'bg-[var(--aethel-primary)]',
          axis === 'horizontal' ? 'w-[1px] h-8' : 'h-[1px] w-8',
        )}
        style={{ marginTop: axis === 'horizontal' ? 'auto' : undefined, marginLeft: axis === 'vertical' ? 'auto' : undefined }}
      />
    </div>
  )
}

// ─── Panel Toggle Button ──────────────────────────────────────────────────────

function PanelToggleBtn({
  open,
  onToggle,
  icon: Icon,
  label,
  id,
  badgeCount,
  accentColor,
}: {
  open: boolean
  onToggle: () => void
  icon: LucideIcon
  label: string
  id: string
  badgeCount?: number
  accentColor?: string
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={onToggle}
      aria-pressed={open}
      aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
      title={`${open ? 'Collapse' : 'Expand'} ${label} (press to toggle)`}
      className={cn(
        'relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all active:scale-95',
        open
          ? 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary)]'
          : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)]',
      )}
      style={open && accentColor ? {
        borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
        color: accentColor,
      } : undefined}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      {(badgeCount ?? 0) > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: accentColor ?? 'var(--aethel-primary)' }}
        >
          {badgeCount}
        </span>
      )}
    </button>
  )
}

// ─── Command Palette ──────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { id: 'new-scene',   label: 'New Scene',            group: 'Create'   },
  { id: 'run-agents',  label: 'Run AI Agents',         group: 'AI'       },
  { id: 'open-ide',    label: 'Open Code Editor (IDE)',group: 'Navigate' },
  { id: 'scope',       label: 'Change Mission Scope',  group: 'Mission'  },
  { id: 'assets',      label: 'Import Assets',         group: 'Assets'   },
  { id: 'deploy',      label: 'Deploy Build',          group: 'Deploy'   },
  { id: 'profiler',    label: 'Toggle Profiler HUD',   group: 'Dev'      },
]

function CommandPalette({ onClose, onAction }: { onClose: () => void; onAction: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const filtered = QUICK_ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.group.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_96%,transparent)] shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[var(--aethel-border-subtle)] px-4 py-3.5">
          <svg className="h-4 w-4 flex-none text-[var(--aethel-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions, scenes, commands…"
            className="flex-1 bg-transparent text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] outline-none font-sans"
          />
          <kbd className="rounded border border-[var(--aethel-border-subtle)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--aethel-text-tertiary)]">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--aethel-text-tertiary)]">No actions match "{query}"</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  id={`cmd-${action.id}`}
                  onClick={() => { onAction(action.id); onClose() }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)]"
                >
                  <span className="w-20 flex-none text-[10px] font-semibold uppercase tracking-widest text-[var(--aethel-text-tertiary)]">
                    {action.group}
                  </span>
                  <span className="text-[var(--aethel-text-primary)]">{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--aethel-border-subtle)] px-4 py-2">
          <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Press ↑↓ to navigate · Enter to select · Esc to close</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Nexus Rail Tab Bar ───────────────────────────────────────────────────────

const NEXUS_TABS: Array<{ id: NexusTab; label: string; icon: LucideIcon }> = [
  { id: 'agents',   label: 'Agents',   icon: Bot },
  { id: 'chat',     label: 'Chat',     icon: MessageSquare },
  { id: 'evidence', label: 'Evidence', icon: ShieldCheck },
  { id: 'research', label: 'Research', icon: Compass },
]

const BOTTOM_TABS: Array<{ id: BottomDockTab; label: string; icon: LucideIcon }> = [
  { id: 'timeline',  label: 'Timeline',  icon: Clock },
  { id: 'inspector', label: 'Inspector', icon: SlidersHorizontal },
  { id: 'assets',    label: 'Assets',    icon: FolderArchive },
  { id: 'logs',      label: 'Logs',      icon: Terminal },
]

// ─── Main Shell ───────────────────────────────────────────────────────────────

export function PreIDEShell({
  mode,
  onModeChange,
  viewportSlot,
  outlineSlot,
  nexusSlot,
  chatSlot,
  evidenceSlot,
  researchSlot,
  timelineSlot,
  inspectorSlot,
  assetSlot,
  logsSlot,
  headerActionsSlot,
  profilerSlot,
  projectName = 'Untitled Project',
  runtimeLane = 'browser',
  activeAgentCount = 0,
  capabilityScore = 0,
  fidelityMode = 'auto',
  onFidelityModeChange,
  className,
}: PreIDEShellProps) {
  const [mounted, setMounted] = useState(false)
  const [layout, setLayout] = useState<LayoutState>(LAYOUT_DEFAULTS)
  const [cmdOpen, setCmdOpen] = useState(false)

  // Load persisted layout
  useEffect(() => {
    setLayout(getWorkbenchLayout(`pre-ide-${mode}`, LAYOUT_DEFAULTS) as LayoutState)
    setMounted(true)
  }, [mode])

  // Persist on change
  useEffect(() => {
    if (!mounted) return
    setWorkbenchLayout(`pre-ide-${mode}`, layout)
  }, [mounted, mode, layout])

  // Command palette shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Resize handlers
  const leftResize = useResizeHandle((delta) =>
    setLayout((l) => ({
      ...l,
      leftW: Math.max(CONSTRAINTS.leftW.min, Math.min(CONSTRAINTS.leftW.max, l.leftW + delta)),
    })),
  )
  const rightResize = useResizeHandle((delta) =>
    setLayout((l) => ({
      ...l,
      rightW: Math.max(CONSTRAINTS.rightW.min, Math.min(CONSTRAINTS.rightW.max, l.rightW - delta)),
    })),
  )
  const bottomResize = useResizeHandle(
    (delta) =>
      setLayout((l) => ({
        ...l,
        bottomH: Math.max(CONSTRAINTS.bottomH.min, Math.min(CONSTRAINTS.bottomH.max, l.bottomH - delta)),
      })),
    'vertical',
  )

  const activeBottomContent = {
    timeline:  timelineSlot,
    inspector: inspectorSlot,
    assets:    assetSlot,
    logs:      logsSlot,
  }[layout.activeBottomTab]

  const laneDotColor = LANE_COLORS[runtimeLane]
  const modeColor = MODE_CONFIG[mode]?.color ?? 'var(--aethel-primary)'
  const ActiveModeIcon = MODE_CONFIG[mode]?.icon ?? Globe

  if (!mounted) {
    return (
      <div className={cn('flex h-full items-center justify-center bg-[var(--aethel-surface-primary)]', className)}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--aethel-border-subtle)] border-t-[var(--aethel-primary)]" />
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Loading studio…</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn('flex h-full flex-col overflow-hidden bg-[var(--aethel-surface-primary)]', className)}
      data-surface="pre-ide-shell"
      data-mode={mode}
    >
      {/* ── TopBar ───────────────────────────────────────────────────────── */}
      <header className="flex h-12 flex-none items-center justify-between gap-2 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent)] px-3 backdrop-blur-md">
        {/* Left: project + breadcrumb */}
        <div className="flex min-w-0 flex-none items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: laneDotColor }}
              title={`Runtime: ${runtimeLane}`}
            />
            <span className="max-w-36 truncate text-sm font-semibold text-[var(--aethel-text-primary)]">
              {projectName}
            </span>
            {capabilityScore > 0 && (
              <span
                className="rounded-full border border-[var(--aethel-border-subtle)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--aethel-text-tertiary)]"
                title={`Hardware Capability Score: ${capabilityScore}/100 (Law XV)`}
              >
                CAP·{capabilityScore}
              </span>
            )}
            <div className="ml-2 flex items-center gap-1 border-l border-[var(--aethel-border-subtle)] pl-3">
              <label htmlFor="fidelity-select" className="sr-only">Fidelity Mode</label>
              <select
                id="fidelity-select"
                value={fidelityMode}
                onChange={(e) => onFidelityModeChange?.(e.target.value as PreIDEFidelityMode)}
                className="bg-transparent text-[10px] uppercase tracking-wider text-[var(--aethel-text-secondary)] outline-none hover:text-[var(--aethel-text-primary)] focus-visible:text-[var(--aethel-text-primary)] transition-colors appearance-none cursor-pointer"
                title="Fidelity (Law XV)"
              >
                <option value="auto">Auto</option>
                <option value="performance">Perf</option>
                <option value="quality">Quality</option>
                <option value="ultra" disabled={capabilityScore < 75}>Ultra</option>
              </select>
            </div>
          </div>

          {/* Mode tabs */}
          <nav
            aria-label="Creative mode"
            className="hidden items-center gap-0.5 md:flex"
          >
            {(Object.keys(MODE_CONFIG) as PreIDEMode[]).map((m) => {
              const cfg = MODE_CONFIG[m]
              const Icon = cfg.icon
              const active = m === mode
              return (
                <button
                  key={m}
                  type="button"
                  id={`mode-tab-${m}`}
                  onClick={() => onModeChange?.(m)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all',
                    active
                      ? 'text-[var(--aethel-text-primary)]'
                      : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]',
                  )}
                  style={active ? {
                    background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
                    color: cfg.color,
                  } : undefined}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{cfg.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Center: Command palette trigger */}
        <button
          type="button"
          id="cmd-palette-trigger"
          onClick={() => setCmdOpen(true)}
          className="hidden flex-1 max-w-64 items-center gap-2 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-1.5 text-xs text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-secondary)] transition-all md:flex"
        >
          <svg className="h-3 w-3 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <span>Search actions…</span>
          <kbd className="ml-auto rounded border border-[var(--aethel-border-subtle)] px-1 py-0.5 font-mono text-[9px]">⌘K</kbd>
        </button>

        {/* Right: Panel toggles + actions */}
        <div className="flex flex-none items-center gap-1.5">
          <PanelToggleBtn
            open={layout.leftOpen}
            onToggle={() => setLayout((l) => ({ ...l, leftOpen: !l.leftOpen }))}
            icon={ListTree}
            label="Outline"
            id="toggle-left-panel"
          />
          <PanelToggleBtn
            open={layout.rightOpen}
            onToggle={() => setLayout((l) => ({ ...l, rightOpen: !l.rightOpen }))}
            icon={Bot}
            label="Nexus"
            id="toggle-right-panel"
            badgeCount={activeAgentCount}
            accentColor="var(--aethel-primary)"
          />
          <PanelToggleBtn
            open={layout.bottomOpen}
            onToggle={() => setLayout((l) => ({ ...l, bottomOpen: !l.bottomOpen }))}
            icon={Clock}
            label="Dock"
            id="toggle-bottom-panel"
          />

          <div className="mx-1 h-5 w-px bg-[var(--aethel-border-subtle)]" role="separator" />

          {headerActionsSlot}
        </div>
      </header>

      {/* ── Workbench Body ────────────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">

        {/* ── Left Rail (Outliner / Hierarchy) ─────────────────────────────── */}
        <AnimatePresence initial={false}>
          {layout.leftOpen && (
            <motion.div
              key="left-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: layout.leftW, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              className="flex flex-none flex-col overflow-hidden border-r border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_85%,transparent)]"
              style={{ minWidth: 0 }}
            >
              <div className="h-full overflow-hidden" style={{ width: layout.leftW }}>
                {outlineSlot ?? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-xs text-[var(--aethel-text-tertiary)]">No outliner connected</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left resize grip */}
        {layout.leftOpen && (
          <ResizeGrip axis="horizontal" onMouseDown={leftResize} label="Resize left panel" />
        )}

        {/* ── Viewport (DOMINANT SURFACE) ─────────────────────────────────── */}
        <div className="relative min-w-0 flex-1 flex flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {viewportSlot ?? (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: `radial-gradient(ellipse at 50% 60%, color-mix(in srgb, ${modeColor} 8%, transparent), transparent 70%)` }}
              >
                <div className="flex flex-col items-center gap-4 text-center">
                  <ActiveModeIcon className="h-14 w-14 text-[var(--aethel-text-secondary)] opacity-40" aria-hidden />
                  <p className="text-sm font-medium text-[var(--aethel-text-secondary)]">
                    No viewport connected for {MODE_CONFIG[mode]?.label} mode
                  </p>
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    Wire the <code className="font-mono text-[var(--aethel-primary)]">viewportSlot</code> prop to your scene/director component
                  </p>
                </div>
              </div>
            )}

            {/* Profiler overlay */}
            {profilerSlot}
          </div>

          {/* ── Bottom Dock ──────────────────────────────────────────────── */}
          <AnimatePresence initial={false}>
            {layout.bottomOpen && (
              <motion.div
                key="bottom-dock"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: layout.bottomH, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 38 }}
                className="flex flex-col flex-none overflow-hidden border-t border-[var(--aethel-border-subtle)]"
              >
                {/* Bottom dock resize grip */}
                <ResizeGrip axis="vertical" onMouseDown={bottomResize} label="Resize bottom dock" />

                {/* Bottom tab bar */}
                <div className="flex h-9 flex-none items-center gap-0.5 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] px-2">
                  {BOTTOM_TABS.map((tab) => {
                    const active = tab.id === layout.activeBottomTab
                    const TabIcon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        id={`bottom-tab-${tab.id}`}
                        onClick={() => setLayout((l) => ({ ...l, activeBottomTab: tab.id }))}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all',
                          active
                            ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary)]'
                            : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]',
                        )}
                      >
                        <TabIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Bottom content */}
                <div className="min-h-0 flex-1 overflow-hidden" style={{ height: layout.bottomH - 36 - 3 }}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={layout.activeBottomTab}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="h-full w-full overflow-hidden"
                    >
                      {activeBottomContent ?? (
                        <div className="flex h-full items-center justify-center">
                          <p className="text-xs text-[var(--aethel-text-tertiary)]">
                            No content for {layout.activeBottomTab}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right resize grip */}
        {layout.rightOpen && (
          <ResizeGrip axis="horizontal" onMouseDown={rightResize} label="Resize Nexus rail" />
        )}

        {/* ── Nexus Rail (AI Chat + Agents + Evidence) ────────────────────── */}
        <AnimatePresence initial={false}>
          {layout.rightOpen && (
            <motion.div
              key="right-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: layout.rightW, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              className="flex flex-none flex-col overflow-hidden border-l border-[var(--aethel-border-subtle)]"
              style={{ minWidth: 0 }}
            >
              <div className="h-full flex flex-col" style={{ width: layout.rightW }}>
                {/* Nexus tab bar */}
                <div className="flex h-9 flex-none items-center border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] px-1.5">
                  {NEXUS_TABS.map((tab) => {
                    const active = tab.id === layout.activeNexusTab
                    const TabIcon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        id={`nexus-tab-${tab.id}`}
                        onClick={() => setLayout((l) => ({ ...l, activeNexusTab: tab.id }))}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-[10px] font-medium transition-all',
                          active
                            ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
                            : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]',
                        )}
                      >
                        <TabIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="hidden lg:inline">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Nexus content */}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={layout.activeNexusTab}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      className="h-full w-full overflow-hidden"
                    >
                      {layout.activeNexusTab === 'agents' && (nexusSlot ?? (
                        <div className="flex h-full items-center justify-center p-4 text-center">
                          <div>
                            <p className="text-sm font-medium text-[var(--aethel-primary-light)]">No agents connected</p>
                            <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">Wire <code className="font-mono">nexusSlot</code> to AgentsWindow</p>
                          </div>
                        </div>
                      ))}
                      {layout.activeNexusTab === 'chat' && (chatSlot ?? (
                        <div className="flex h-full items-center justify-center p-4 text-center">
                          <p className="text-xs text-[var(--aethel-text-tertiary)]">AI Chat workspace</p>
                        </div>
                      ))}
                      {layout.activeNexusTab === 'evidence' && (evidenceSlot ?? (
                        <div className="flex h-full items-center justify-center p-4 text-center">
                          <p className="text-xs text-[var(--aethel-text-tertiary)]">No evidence receipts recorded</p>
                        </div>
                      ))}
                      {layout.activeNexusTab === 'research' && (researchSlot ?? (
                        <div className="flex h-full items-center justify-center p-4 text-center">
                          <p className="text-xs text-[var(--aethel-text-tertiary)]">Research mesh</p>
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Command Palette ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {cmdOpen && (
          <CommandPalette
            onClose={() => setCmdOpen(false)}
            onAction={(id) => {
              if (id === 'open-ide') window.location.href = '/studio/ide'
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default PreIDEShell
