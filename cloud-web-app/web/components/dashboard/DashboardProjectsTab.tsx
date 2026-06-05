'use client'

import dynamic from 'next/dynamic'
import { EmptyProjects } from '../ui/EmptyState'
import { CANONICAL_FOCUS, CANONICAL_MOTION, CANONICAL_SPACING, CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'

import type { Project } from './aethel-dashboard-model'

const DirectorNotePanel = dynamic(() => import('../ai/DirectorNotePanel').then((mod) => mod.DirectorNotePanel), {
  ssr: false,
  loading: () => null,
})

type DashboardProjectsTabProps = {
  projects: Project[]
  newProjectName: string
  newProjectType: Project['type']
  entryMission?: string | null
  onDeleteProject: (projectId: number) => void
  onCreateProject: () => void
  onProjectNameChange: (value: string) => void
  onProjectTypeChange: (value: Project['type']) => void
  onApplyDirectorNote: (title: string) => void
  onOpenAiChat?: () => void
  onOpenIde?: () => void
}

type ProjectTypeOption = {
  value: Project['type']
  label: string
  description: string
}

const PANEL_CLASS =
  'rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.16)]'
const INPUT_CLASS = `h-12 w-full rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-4 text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
const PRIMARY_BUTTON_CLASS = `inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--aethel-text-primary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-surface-primary)] shadow-[0_14px_32px_rgba(2,6,23,0.16)] hover:bg-[var(--aethel-text-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
const SECONDARY_BUTTON_CLASS = `inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:border-[var(--aethel-border-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
const DANGER_BUTTON_CLASS = `inline-flex min-h-10 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-error)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_18%,transparent)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

const PROJECT_TYPE_OPTIONS: ProjectTypeOption[] = [
  {
    value: 'web',
    label: 'Web app',
    description: 'Best lane today for fast preview, review and deployment.',
  },
  {
    value: 'code',
    label: 'Code project',
    description: 'Good for scripts, APIs, backends and flexible implementation work.',
  },
  {
    value: 'unreal',
    label: 'Unreal workflow',
    description: 'Experimental depth lane for heavier viewport-first creation.',
  },
]

function getProjectStatusTone(status: Project['status']) {
  if (status === 'active') {
    return {
      label: 'Ready now',
      className:
        'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]',
    }
  }

  if (status === 'planning') {
    return {
      label: 'Planning',
      className:
        'border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]',
    }
  }

  if (status === 'completed') {
    return {
      label: 'Completed',
      className:
        'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] text-[var(--aethel-text-secondary)]',
    }
  }

  return {
    label: 'Needs attention',
    className:
      'border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]',
  }
}

function WorkspaceComposer({
  title,
  description,
  newProjectName,
  newProjectType,
  onProjectNameChange,
  onProjectTypeChange,
  onCreateProject,
}: {
  title: string
  description: string
  newProjectName: string
  newProjectType: Project['type']
  onProjectNameChange: (value: string) => void
  onProjectTypeChange: (value: Project['type']) => void
  onCreateProject: () => void
}) {
  return (
    <div className={PANEL_CLASS}>
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">New workspace</p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{description}</p>

      <div className="mt-5 space-y-4">
        <input
          type="text"
          value={newProjectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          placeholder="Workspace name"
          className={INPUT_CLASS}
        />

        <div className="grid gap-3">
          {PROJECT_TYPE_OPTIONS.map((option) => {
            const selected = newProjectType === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-label={`Select project type ${option.label}`}
                onClick={() => onProjectTypeChange(option.value)}
                className={`rounded-2xl border p-3 text-left transition ${
                  selected
                    ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)]'
                    : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] hover:border-[var(--aethel-border-secondary)]'
                }`}
              >
                <div className="text-sm font-semibold text-[var(--aethel-text-primary)]">{option.label}</div>
                <div className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{option.description}</div>
              </button>
            )
          })}
        </div>

        <button type="button" onClick={onCreateProject} aria-label="Create workspace" className={`${PRIMARY_BUTTON_CLASS} w-full`}>
          Create workspace
        </button>
      </div>
    </div>
  )
}

export function DashboardProjectsTab({
  projects,
  newProjectName,
  newProjectType,
  entryMission,
  onDeleteProject,
  onCreateProject,
  onProjectNameChange,
  onProjectTypeChange,
  onApplyDirectorNote,
  onOpenAiChat,
  onOpenIde,
}: DashboardProjectsTabProps) {
  const activeProjectCount = projects.filter((project) => project.status === 'active').length
  const planningProjectCount = projects.filter((project) => project.status === 'planning').length

  return (
    <div className={`${CANONICAL_SPACING.page.padding} space-y-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Projects</p>
          <h2 className={CANONICAL_TYPOGRAPHY.h1}>Choose the workspace that deserves deeper Studio focus.</h2>
          <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
            Keep only the workspaces that move the mission forward and stay ready for a clean Studio expansion.
          </p>
        </div>
      </div>

      <section className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.18)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Workspace stage</p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">
              Shape the workspace before opening deeper Studio tools.
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
              {entryMission
                ? `Current mission: ${entryMission}`
                : 'Pick the right lane, trim the noise, then move into Studio with continuity.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)]">
                {projects.length} workspaces
              </span>
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_22%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-xs text-[var(--aethel-success-light)]">
                {activeProjectCount} ready now
              </span>
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1 text-xs text-[var(--aethel-info-light)]">
                {planningProjectCount} planning
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {onOpenAiChat ? (
              <button type="button" onClick={onOpenAiChat} className={SECONDARY_BUTTON_CLASS}>
                Open AI Console
              </button>
            ) : null}
            {onOpenIde ? (
              <button type="button" onClick={onOpenIde} className={PRIMARY_BUTTON_CLASS}>
                Expand Studio
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {projects.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr,0.95fr]">
          <div className={`${PANEL_CLASS} p-0`}>
            <EmptyProjects onCreate={onCreateProject} />
          </div>
          <WorkspaceComposer
            title="Create the first workspace"
            description="Start with the narrowest lane that gets to first value cleanly. You can still deepen later in Studio."
            newProjectName={newProjectName}
            newProjectType={newProjectType}
            onProjectNameChange={onProjectNameChange}
            onProjectTypeChange={onProjectTypeChange}
            onCreateProject={onCreateProject}
          />
        </div>
      ) : (
        <>
          <div>
            <DirectorNotePanel
              projectId={String(projects[0].id)}
              position="floating"
              onApplyFix={async (note) => onApplyDirectorNote(note.title)}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr,0.7fr]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {projects.map((project) => {
                const statusTone = getProjectStatusTone(project.status)
                return (
                  <article key={project.id} className={`${PANEL_CLASS} p-5`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-[var(--aethel-text-primary)]">{project.name}</h3>
                        <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
                          {project.type === 'web'
                            ? 'Good fit for fast preview, review and deployment.'
                            : project.type === 'unreal'
                              ? 'Heavy viewport lane for deeper creation work.'
                              : 'Flexible workspace for implementation-heavy tasks.'}
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
                        {project.type}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone.className}`}>{statusTone.label}</span>
                      <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] px-2.5 py-1 text-xs text-[var(--aethel-text-secondary)]">
                        Recent activity
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {onOpenIde ? (
                        <button type="button" onClick={onOpenIde} className={SECONDARY_BUTTON_CLASS}>
                          Expand Studio
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Remove workspace ${project.name}`}
                        onClick={() => onDeleteProject(project.id)}
                        className={DANGER_BUTTON_CLASS}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>

            <WorkspaceComposer
              title="Create another workspace"
              description="Add a second lane only when it clarifies execution or keeps risky work isolated."
              newProjectName={newProjectName}
              newProjectType={newProjectType}
              onProjectNameChange={onProjectNameChange}
              onProjectTypeChange={onProjectTypeChange}
              onCreateProject={onCreateProject}
            />
          </div>
        </>
      )}
    </div>
  )
}
