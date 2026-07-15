'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Hand, Pause, Play, ShieldAlert, X } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'

type BrowserOperatorStep = {
  id: string
  index: number
  timestamp: string
  tool: string
  targetUrl: string
  intent: string
  screenshotUrl?: string
  requiresApproval: boolean
  approved: boolean
  evidenceRefs: string[]
  decision: {
    status: string
    blockers: string[]
    warnings: string[]
    requiredEvidence: string[]
  }
}

type BrowserOperatorRun = {
  runId: string
  mission: string
  status: 'running' | 'paused' | 'approval-required' | 'cancelled' | 'completed'
  currentStep: number
  timelineHash: string
  steps: BrowserOperatorStep[]
}

async function mutateRun(runId: string, action: string) {
  const response = await fetch(`/api/agents/browser-operator/runs/${runId}?action=${action}`, { method: 'POST' })
  if (!response.ok) throw new Error(`Browser Operator action failed: ${response.status}`)
  return response.json() as Promise<{ run: BrowserOperatorRun }>
}

export function BrowserOperatorReplay({ runId }: { runId: string }) {
  const [run, setRun] = useState<BrowserOperatorRun | null>(null)
  const [selectedStep, setSelectedStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadRun = useCallback(async () => {
    setError(null)
    const response = await fetch(`/api/agents/browser-operator/runs/${runId}`, { cache: 'no-store' })
    if (!response.ok) {
      setError(`Replay not available (${response.status})`)
      return
    }
    const payload = (await response.json()) as { run: BrowserOperatorRun }
    setRun(payload.run)
    setSelectedStep(payload.run.currentStep)
  }, [runId])

  useEffect(() => {
    void loadRun()
  }, [loadRun])

  const applyAction = useCallback(async (action: string) => {
    setError(null)
    try {
      const payload = await mutateRun(runId, action)
      setRun(payload.run)
      setSelectedStep(payload.run.currentStep)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Browser Operator action failed')
    }
  }, [runId])

  const current = run?.steps[selectedStep]

  if (error && !run) {
    return (
      <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] p-4 text-sm text-[var(--aethel-error-light)]">
        {error}
      </div>
    )
  }

  if (!run) {
    return (
      <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] p-4 text-sm text-[var(--aethel-text-secondary)]">
        Loading Browser Operator replay...
      </div>
    )
  }

  return (
    <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)]">
      <header className="flex flex-col gap-3 border-b border-[var(--aethel-border-subtle)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant={run.status === 'approval-required' ? 'warning' : run.status === 'running' ? 'success' : 'secondary'}>
              {run.status}
            </Badge>
            <Badge variant="warning">CDP [HELD]</Badge>
            <p className="font-mono text-xs text-[var(--aethel-text-tertiary)]">{run.timelineHash.slice(0, 12)}</p>
          </div>
          <h2 className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{run.mission}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => applyAction('pause')} className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">
            <Pause className="mr-1 inline h-3.5 w-3.5" /> Pause
          </button>
          <button type="button" onClick={() => applyAction('resume')} className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">
            <Play className="mr-1 inline h-3.5 w-3.5" /> Resume
          </button>
          <button type="button" onClick={() => applyAction('takeover')} className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">
            <Hand className="mr-1 inline h-3.5 w-3.5" /> Take over
          </button>
          <button type="button" onClick={() => applyAction('approve')} disabled={!current?.requiresApproval} className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] disabled:opacity-40">
            <Check className="mr-1 inline h-3.5 w-3.5" /> Approve
          </button>
          <button type="button" onClick={() => applyAction('cancel')} className="rounded-lg border border-[var(--aethel-error)]/35 px-3 py-1.5 text-xs text-[var(--aethel-error-light)]">
            <X className="mr-1 inline h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_360px]">
        <div className="flex min-h-[320px] items-center justify-center border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] p-4 lg:border-b-0 lg:border-r">
          {current?.screenshotUrl ? (
            <div
              role="img"
              aria-label="Browser Operator replay screenshot"
              className="h-[420px] w-full max-w-3xl rounded-xl border border-[var(--aethel-border-subtle)] bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${current.screenshotUrl})` }}
            />
          ) : (
            <div className="max-w-md text-center">
              <Hand className="mx-auto h-10 w-10 text-[var(--aethel-text-tertiary)]" />
              <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">No screenshot has been recorded for this step yet.</p>
              <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">The recorder still keeps DOM hash, risk decision, and evidence refs.</p>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Timeline</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {run.steps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setSelectedStep(step.index)}
                  className={`h-8 w-8 rounded-full border text-xs ${
                    selectedStep === step.index
                      ? 'border-[var(--aethel-info)] bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)] text-[var(--aethel-info-light)]'
                      : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)]'
                  }`}
                >
                  {step.index + 1}
                </button>
              ))}
            </div>
          </div>

          {current ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Step details</p>
                <h3 className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{current.intent}</h3>
                <p className="mt-1 break-all font-mono text-xs text-[var(--aethel-text-tertiary)]">{current.targetUrl}</p>
              </div>

              {current.requiresApproval ? (
                <div className="rounded-xl border border-[var(--aethel-warning)]/35 bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-3 text-xs text-[var(--aethel-warning-light)]">
                  <ShieldAlert className="mr-1 inline h-4 w-4" /> Human approval required before this step can continue.
                </div>
              ) : null}

              <div>
                <p className="text-xs font-medium text-[var(--aethel-text-secondary)]">Evidence</p>
                <ul className="mt-2 space-y-1 text-xs text-[var(--aethel-text-tertiary)]">
                  {current.evidenceRefs.map((ref) => <li key={ref}>{ref}</li>)}
                </ul>
              </div>

              {current.decision.blockers.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-[var(--aethel-error-light)]">Blockers</p>
                  <ul className="mt-2 space-y-1 text-xs text-[var(--aethel-text-secondary)]">
                    {current.decision.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--aethel-text-secondary)]">No steps recorded yet.</p>
          )}
        </aside>
      </div>
      {error ? <p className="border-t border-[var(--aethel-border-subtle)] p-3 text-xs text-[var(--aethel-error-light)]">{error}</p> : null}
    </section>
  )
}
