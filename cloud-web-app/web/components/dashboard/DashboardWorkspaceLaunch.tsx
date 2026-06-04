'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Bot, Boxes, Code2, FolderGit2, Sparkles } from 'lucide-react'

import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import type { Project } from './aethel-dashboard-model'
import {
  createDashboardLaunchHandoff,
  persistDashboardLaunchHandoff,
  persistDashboardLaunchMission,
} from './dashboard-launch-handoff'

type Tone = 'positive' | 'warning' | 'danger' | 'neutral'

type DashboardWorkspaceLaunchProps = {
  aiActivity: string
  projects: Project[]
  primaryProject?: Project
  pendingApprovals: number
  backendOnline: boolean
  aiProviderConfigured: boolean
  currentPlanName?: string | null
  onOpenProjects: () => void
  onOpenIde: () => void
  onOpenAiChat: (missionDraft?: string) => void
}

const toneClasses: Record<Tone, string> = {
  positive:
    'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
  warning:
    'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
  danger:
    'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]',
  neutral:
    'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] text-[var(--aethel-text-secondary)]',
}

const quickButtonClass = `inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

function formatProjectKind(type?: string) {
  if (type === 'web') return 'Web app'
  if (type === 'code') return 'Code workspace'
  if (type === 'unreal') return 'Creative R&D'
  return 'Workspace'
}

function formatProjectStatus(status?: string) {
  if (status === 'active') return 'Active'
  if (status === 'planning') return 'Planning'
  if (status === 'paused') return 'Paused'
  if (status === 'completed') return 'Complete'
  return 'Idle'
}

export function DashboardWorkspaceLaunch({
  aiActivity,
  projects,
  primaryProject,
  pendingApprovals,
  backendOnline,
  aiProviderConfigured,
  currentPlanName,
  onOpenProjects,
  onOpenIde,
  onOpenAiChat,
}: DashboardWorkspaceLaunchProps) {
  const [missionDraft, setMissionDraft] = useState('')
  const [isPlanning, setIsPlanning] = useState(false)
  const visibleProjects = useMemo(() => projects.slice(0, 7), [projects])
  const activeRunCount = backendOnline ? Math.max(1, projects.filter((project) => project.status === 'active').length || 1) : 0
  const approvalLabel = pendingApprovals > 0 ? `${pendingApprovals} waiting` : 'Clear'
  const nextAction = pendingApprovals > 0 ? 'Review pending proposal' : primaryProject ? 'Continue workspace' : 'Start with Copilot'

  const launchWithCopilot = async () => {
    const normalized = missionDraft.trim()
    setIsPlanning(true)
    const handoff = await createDashboardLaunchHandoff(normalized)
    persistDashboardLaunchHandoff(handoff)
    setIsPlanning(false)
    onOpenAiChat(normalized || undefined)
  }

  const launchIde = () => {
    persistDashboardLaunchMission(missionDraft)
    onOpenIde()
  }

  return (
    <section
      className="overflow-hidden rounded-[34px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] shadow-[0_30px_100px_rgba(2,6,23,0.34)]"
      data-dashboard-firebase-launch="workspace-entry"
      data-dashboard-command-card="one-glance"
    >
      <div className="grid min-h-[460px] gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="flex min-h-[460px] flex-col justify-center px-5 py-7 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
              Aethel Studio
            </span>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClasses[backendOnline ? 'positive' : 'danger']}`}>
              {backendOnline ? 'Live handoff' : 'Runtime blocked'}
            </span>
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">
              {currentPlanName || 'Free'}
            </span>
          </div>

          <div className="mt-12">
            <p className="text-4xl font-semibold tracking-tight text-[var(--aethel-text-primary)] sm:text-5xl">
              Welcome back
            </p>
            <p className="mt-3 max-w-xl text-lg text-[var(--aethel-text-secondary)]">
              Start with one mission. Aethel opens the right workspace and keeps receipts close.
            </p>
          </div>

          <form
            className="mt-9 overflow-hidden rounded-[24px] border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_62%,transparent)] shadow-[0_18px_60px_rgba(2,6,23,0.24)]"
            onSubmit={(event) => {
              event.preventDefault()
              launchWithCopilot()
            }}
          >
            <label htmlFor="dashboard-launch-mission" className="sr-only">
              Describe a mission
            </label>
            <textarea
              id="dashboard-launch-mission"
              value={missionDraft}
              onChange={(event) => setMissionDraft(event.target.value)}
              placeholder="Build an app, research a market, or shape a 3D scene..."
              className="min-h-[128px] w-full resize-none bg-transparent px-5 py-5 text-base text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-tertiary)]"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--aethel-border-subtle)] px-4 py-3">
              <div
                className="hidden flex-wrap items-center gap-2 text-xs text-[var(--aethel-text-tertiary)] sm:flex"
                data-firebase-like-journey="prompt-blueprint-workspace-preview-evidence"
              >
                    {['Prompt', 'Blueprint', 'Workspace', 'Preview', 'Inspect', 'Publish receipts'].map((stage) => (
                  <span
                    key={stage}
                    className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1"
                    data-firebase-journey-stage={stage.toLowerCase()}
                  >
                    {stage}
                  </span>
                ))}
              </div>
              <button
                type="submit"
                disabled={isPlanning}
                className={`inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[var(--aethel-text-primary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-surface-primary)] transition hover:bg-[var(--aethel-text-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
              >
                {isPlanning ? 'Planning...' : 'Plan with Copilot'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="mt-8">
            <p className="mb-3 text-sm font-medium text-[var(--aethel-text-secondary)]">Start coding, creating, or researching</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onOpenProjects} className={quickButtonClass}>
                <Sparkles className="h-4 w-4" />
                New
              </button>
              <button type="button" onClick={onOpenProjects} className={quickButtonClass}>
                <FolderGit2 className="h-4 w-4" />
                Import
              </button>
              <button type="button" onClick={launchIde} className={quickButtonClass}>
                <Code2 className="h-4 w-4" />
                Open IDE
              </button>
              <Link href="/studio" className={quickButtonClass}>
                <Boxes className="h-4 w-4" />
                Open Studio
              </Link>
            </div>
          </div>
        </div>

        <aside className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_34%,transparent)] px-5 py-6 sm:px-7 xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-5">
              <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">My workspaces</span>
              <span className="text-sm font-medium text-[var(--aethel-text-tertiary)]">Shared with me</span>
            </div>
            <span className={`h-3 w-3 rounded-full border ${backendOnline ? 'border-[var(--aethel-success)]' : 'border-[var(--aethel-warning)]'}`} />
          </div>

          <div className="mt-4 space-y-2">
            {visibleProjects.length > 0 ? (
              visibleProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={launchIde}
                  className="group flex w-full items-center justify-between gap-3 rounded-[20px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] px-4 py-3 text-left transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--aethel-text-primary)]">{project.name}</div>
                    <div className="mt-1 truncate text-xs text-[var(--aethel-text-tertiary)]">
                      {formatProjectKind(project.type)} / {formatProjectStatus(project.status)}
                    </div>
                  </div>
                  <span className="text-lg text-[var(--aethel-text-quaternary)] transition group-hover:text-[var(--aethel-text-secondary)]">...</span>
                </button>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-4 py-5 text-sm text-[var(--aethel-text-secondary)]">
                No workspace yet. Describe a mission and Copilot will create the first handoff.
              </div>
            )}
          </div>

          <div className="mt-5 rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Next actions</p>
              <Bot className="h-4 w-4 text-[var(--aethel-text-quaternary)]" />
            </div>
            <p className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{nextAction}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">{aiActivity}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <span className={`rounded-full border px-2.5 py-1.5 text-[11px] ${toneClasses[backendOnline ? 'positive' : 'danger']}`}>
                Active runs: {activeRunCount}
              </span>
              <span className={`rounded-full border px-2.5 py-1.5 text-[11px] ${toneClasses[pendingApprovals > 0 ? 'warning' : 'positive']}`}>
                Approvals: {approvalLabel}
              </span>
              <span className={`rounded-full border px-2.5 py-1.5 text-[11px] ${toneClasses[aiProviderConfigured ? 'positive' : 'warning']}`}>
                Evidence: {aiProviderConfigured ? 'Tracked' : 'Setup'}
              </span>
              <span className={`rounded-full border px-2.5 py-1.5 text-[11px] ${toneClasses[backendOnline ? 'positive' : 'warning']}`}>
                Preview: {backendOnline ? 'Ready' : 'Held'}
              </span>
            </div>
            <Link href="/evidence" className="mt-4 inline-flex text-xs font-medium text-[var(--aethel-info-light)] hover:text-[var(--aethel-text-primary)]">
              Open receipts
            </Link>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default DashboardWorkspaceLaunch
