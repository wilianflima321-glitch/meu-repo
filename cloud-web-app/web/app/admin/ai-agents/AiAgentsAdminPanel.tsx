'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, Users, XCircle } from 'lucide-react'

import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid'

type Workflow = {
  id: string
  title: string
  userEmail: string
  projectName: string | null
  updatedAt: string
  lastUsedAt: string | null
}

export function AiAgentsAdminPanel() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/ai/agents')
      if (!res.ok) throw new Error('Failed to load agent workflows')
      const data = await res.json()
      setWorkflows(Array.isArray(data?.workflows) ? data.workflows : [])
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading agent workflows')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchWorkflows()
  }, [fetchWorkflows])

  const projects = Array.from(
    new Set(workflows.map((workflow) => workflow.projectName || 'No project')),
  ).sort()

  const filteredWorkflows = workflows.filter((workflow) => {
    const term = search.trim().toLowerCase()
    const matchesSearch =
      !term ||
      workflow.title.toLowerCase().includes(term) ||
      workflow.userEmail.toLowerCase().includes(term)
    const projectName = workflow.projectName || 'No project'
    const matchesProject = projectFilter === 'all' || projectFilter === projectName
    return matchesSearch && matchesProject
  })

  const summary = {
    total: workflows.length,
    withProject: workflows.filter((workflow) => workflow.projectName).length,
    withoutProject: workflows.filter((workflow) => !workflow.projectName).length,
  }

  return (
    <section className="rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Agent fleet</h2>
          {lastUpdated ? (
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              Updated {lastUpdated.toLocaleString()}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void fetchWorkflows()}
          className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]"
        >
          Refresh
        </button>
      </div>

      <AdminSummaryGrid
        className="mb-4"
        columns={3}
        items={[
          { icon: Users, label: 'Workflows', value: summary.total },
          { icon: CheckCircle, label: 'With project', value: summary.withProject, tone: 'success' },
          { icon: XCircle, label: 'No project', value: summary.withoutProject, tone: 'warning' },
        ]}
      />

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-3 md:flex-row md:items-center md:justify-between">
        <input
          type="search"
          placeholder="Search by title or owner"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-2 text-sm md:max-w-sm"
        />
        <select
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-2 text-sm"
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]" />
          ))}
        </div>
      ) : error ? (
        <div>
          <p className="text-sm text-[var(--aethel-error)]">{error}</p>
          <button
            type="button"
            className="mt-3 rounded bg-[var(--aethel-primary)] px-3 py-1 text-[var(--aethel-text-primary)]"
            onClick={() => void fetchWorkflows()}
          >
            Try again
          </button>
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <p className="text-sm text-[var(--aethel-text-tertiary)]">No active workflow found.</p>
      ) : (
        <ul className="divide-y divide-[var(--aethel-border-subtle)]">
          {filteredWorkflows.map((workflow) => (
            <li key={workflow.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold text-[var(--aethel-text-primary)]">{workflow.title}</h3>
                <p className="text-sm text-[var(--aethel-text-secondary)]">Owner: {workflow.userEmail}</p>
                {workflow.projectName ? (
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">Project: {workflow.projectName}</p>
                ) : null}
              </div>
              <div className="text-xs text-[var(--aethel-text-tertiary)]">
                Updated: {new Date(workflow.updatedAt).toLocaleString()}
                {workflow.lastUsedAt ? <div>Last used: {new Date(workflow.lastUsedAt).toLocaleString()}</div> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AiAgentsAdminPanel
