'use client'

/**
 * StudioMissionControl  -  Creative Studio Hub (Pre-IDE Portal)
 *
 * PURPOSE: A visual orchestration layer for users who manage games/films WITHOUT
 * needing to touch code. Sits between the dashboard and the Monaco IDE.
 * Inspired by Adobe Creative Cloud launcher + Unreal Project Browser, deeply
 * integrated with Aethel's AI agent workforce and asset pipelines.
 *
 * DESIGN LAW: L5 Glassmorphism. CSS vars only (var(--aethel-*)).
 * HONESTY: No "Final Export" buttons unless the backend confirms capability.
 * ZERO DUPLICATION: Wraps AgentsWindow, CanonicalSequencer  -  never re-implements their logic.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// --- Types ---

export type MissionScope = 'prototype' | 'demo' | 'vertical-slice' | 'full-production'
export type ProjectMode = 'game' | 'film' | 'vfx' | 'app'
export type RuntimeLane = 'browser' | 'local' | 'cloud'

export interface StudioProject {
  id: string
  name: string
  mode: ProjectMode
  scope: MissionScope
  thumbnail?: string
  runtimeLane: RuntimeLane
  lastEditedAt: string
  agentCount: number
  assetCount: number
  localSidecarReady: boolean
}

interface StudioMissionControlProps {
  projects: StudioProject[]
  onOpenProject: (projectId: string, destination: 'visual' | 'ide' | 'director' | 'assets') => void
  onNewProject: () => void
  className?: string
}

// --- Constants ---

const MODE_META: Record<ProjectMode, { label: string; icon: string; color: string }> = {
  game:  { label: 'Game',  icon: '??', color: 'var(--aethel-primary)' },
  film:  { label: 'Film',  icon: '??', color: 'var(--aethel-primary)'               },
  vfx:   { label: 'VFX',   icon: '?', color: 'var(--aethel-info)'               },
  app:   { label: 'App',   icon: '??', color: 'var(--aethel-success)' },
}

const SCOPE_META: Record<MissionScope, { label: string; badge: string }> = {
  prototype:        { label: 'Prototype',      badge: 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]' },
  demo:             { label: 'Demo',           badge: 'bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] text-[var(--aethel-primary)] border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]' },
  'vertical-slice': { label: 'Vertical Slice', badge: 'bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] text-[var(--aethel-primary)] border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]' },
  'full-production':{ label: 'Full Production',badge: 'bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] text-[var(--aethel-info)] border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]' },
}

const LANE_META: Record<RuntimeLane, { label: string; dot: string; title: string }> = {
  browser: { label: 'Browser Preview', dot: 'bg-[var(--aethel-warning)]', title: 'Preview in browser. Heavy work requires Studio Local.' },
  local:   { label: 'Studio Local',    dot: 'bg-[var(--aethel-success)]', title: 'Sidecar confirmed. Heavy compute runs locally.'        },
  cloud:   { label: 'Cloud Render',    dot: 'bg-[var(--aethel-info)]',               title: 'Cinematic render via cloud stream. Cost applies.'       },
}

// --- Sub-components ---

function RuntimeLanePill({ lane }: { lane: RuntimeLane }) {
  const meta = LANE_META[lane]
  return (
    <span
      className="flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--aethel-text-secondary)]"
      title={meta.title}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', meta.dot)} />
      {meta.label}
    </span>
  )
}

function AgentCountBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--aethel-primary)]">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--aethel-primary)]" />
      {count} agent{count !== 1 ? 's' : ''}
    </span>
  )
}

function ProjectCard({ project, onOpen }: { project: StudioProject; onOpen: (destination: 'visual' | 'ide' | 'director' | 'assets') => void }) {
  const [hovered, setHovered] = useState(false)
  const mode  = MODE_META[project.mode]
  const scope = SCOPE_META[project.scope]

  const diffDays = Math.round((new Date(project.lastEditedAt).getTime() - Date.now()) / 86400000)
  const relativeDate = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffDays, 'day')

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] backdrop-blur-lg transition-colors hover:border-[var(--aethel-border-secondary)]"
      style={{ isolation: 'isolate' }}
    >
      {/* Hero thumbnail */}
      <div className="relative h-36 w-full overflow-hidden bg-[var(--aethel-surface-primary)]">
        {project.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnail} alt="" className="h-full w-full object-cover" aria-hidden />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-5xl"
            aria-hidden
            style={{ background: `radial-gradient(ellipse at 50% 120%, color-mix(in srgb, ${mode.color} 18%, transparent), transparent 70%)` }}
          >
            {mode.icon}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--aethel-surface-primary)] via-transparent to-transparent opacity-70" />
        <span
          className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: `color-mix(in srgb, ${mode.color} 20%, transparent)`, border: `1px solid color-mix(in srgb, ${mode.color} 35%, transparent)`, color: mode.color }}
        >
          {mode.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-[var(--aethel-text-primary)]">{project.name}</h3>
          <AgentCountBadge count={project.agentCount} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', scope.badge)}>{scope.label}</span>
          <RuntimeLanePill lane={project.runtimeLane} />
        </div>
        <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
          {project.assetCount} assets  -  Edited {relativeDate}
        </p>
      </div>

      {/* Hover action rail */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            className="flex gap-1.5 border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_85%,transparent)] p-3 backdrop-blur-sm"
          >
            {([
              { label: 'Visual Studio', dest: 'visual', primary: true  },
              { label: 'Open IDE',      dest: 'ide',    primary: false },
              { label: 'AI Director',   dest: 'director',primary: false },
              { label: 'Assets',        dest: 'assets', primary: false },
            ] as const).map((action) => (
              <button
                key={action.dest}
                type="button"
                id={`project-${project.id}-${action.dest}`}
                onClick={() => onOpen(action.dest)}
                className={cn(
                  'flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all',
                  action.primary
                    ? 'border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)]'
                    : 'border border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]',
                )}
              >
                {action.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

function NewProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      id="studio-new-project-btn"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--aethel-border-subtle)] text-center transition-colors hover:border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_4%,transparent)]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)]">
        <svg className="h-5 w-5 text-[var(--aethel-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">New Project</p>
        <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">Game, Film, VFX, or App</p>
      </div>
    </motion.button>
  )
}

// --- Main ---

export function StudioMissionControl({ projects, onOpenProject, onNewProject, className }: StudioMissionControlProps) {
  const [filter, setFilter] = useState<ProjectMode | 'all'>('all')
  const filtered = filter === 'all' ? projects : projects.filter((p) => p.mode === filter)

  const filterOptions: Array<{ value: ProjectMode | 'all'; label: string }> = [
    { value: 'all',  label: 'All'       },
    { value: 'game', label: '?? Games'  },
    { value: 'film', label: '?? Films'  },
    { value: 'vfx',  label: '? VFX'   },
    { value: 'app',  label: '?? Apps'  },
  ]

  return (
    <div className={cn('flex h-full flex-col gap-6 overflow-auto p-6', className)} data-surface="studio-mission-control">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-[var(--aethel-text-primary)]">Studio</h1>
        <p className="text-sm text-[var(--aethel-text-secondary)]">Select a project to orchestrate, review assets, or open the IDE.</p>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="toolbar" aria-label="Project type filter">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            id={`studio-filter-${opt.value}`}
            onClick={() => setFilter(opt.value)}
            aria-pressed={filter === opt.value}
            className={cn(
              'flex-none whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
              filter === opt.value
                ? 'border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] text-[var(--aethel-primary)]'
                : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={(dest) => onOpenProject(project.id, dest)} />
          ))}
        </AnimatePresence>
        <NewProjectCard onClick={onNewProject} />
      </motion.div>
    </div>
  )
}

export default StudioMissionControl
