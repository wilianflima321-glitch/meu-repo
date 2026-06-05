'use client'

import { useCallback, useEffect, useState } from 'react'

type TrainingJob = {
  id: string
  model: string
  status: string
  cost: number
  efficiency: number
  filters?: string | null
  auxAI?: string | null
  optimization?: string | null
  createdAt: string
}

export function AiTrainingAdminPanel() {
  const [jobs, setJobs] = useState<TrainingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    model: 'Aethel-GPT',
    auxAI: 'GPT-4 for synthetic data',
    optimization: 'Quantization + transfer learning',
    filters: 'Bias detection enabled',
  })
  const [saving, setSaving] = useState(false)

  const statusLabels: Record<string, string> = {
    queued: 'Queued',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    paused: 'Paused',
  }

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/ai/training')
      if (!res.ok) throw new Error('Failed to load training jobs')
      const json = await res.json()
      setJobs(json.items || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading training jobs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const handleCreate = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/ai/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to start training job')
      await fetchJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error starting training job')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Training jobs</h2>
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Queue governed training tasks and review cost, status, and efficiency.</p>
        </div>
        <button
          type="button"
          onClick={fetchJobs}
          className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded border border-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] p-3 text-sm text-[var(--aethel-error)]">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4">
        <h3 className="mb-4 text-sm font-semibold text-[var(--aethel-text-primary)]">New training task</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TrainingInput label="Model" value={form.model} onChange={(value) => setForm((prev) => ({ ...prev, model: value }))} />
          <TrainingInput label="Assistant" value={form.auxAI} onChange={(value) => setForm((prev) => ({ ...prev, auxAI: value }))} />
          <TrainingInput label="Optimization" value={form.optimization} onChange={(value) => setForm((prev) => ({ ...prev, optimization: value }))} />
          <TrainingInput label="Filters" value={form.filters} onChange={(value) => setForm((prev) => ({ ...prev, filters: value }))} />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving}
          className="mt-4 rounded bg-[var(--aethel-primary-dark)] px-4 py-2 text-[var(--aethel-text-primary)] disabled:opacity-50"
        >
          {saving ? 'Starting...' : 'Start training'}
        </button>
      </div>

      <div className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4">
        <h3 className="mb-4 text-sm font-semibold text-[var(--aethel-text-primary)]">Recent tasks</h3>
        {loading ? (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Loading tasks...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">No training tasks found.</p>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] p-4">
                <h4 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{job.model}</h4>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
                  Status: {statusLabels[job.status] || job.status} | Cost: ${job.cost.toFixed(2)} | Efficiency: {job.efficiency.toFixed(0)}%
                </p>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Assistant: {job.auxAI || '-'}</p>
                <p className="text-sm text-[var(--aethel-text-secondary)]">Optimization: {job.optimization || '-'}</p>
                <p className="text-sm text-[var(--aethel-text-secondary)]">Filters: {job.filters || '-'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function TrainingInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-[var(--aethel-text-secondary)]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] p-2 text-[var(--aethel-text-primary)]"
      />
    </label>
  )
}
