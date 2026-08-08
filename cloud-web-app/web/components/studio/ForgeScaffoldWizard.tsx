'use client'

import { useCallback, useState } from 'react'
import { ArrowRight, Check, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react'
import { CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'
import {
  listDevContainerTemplateCatalog,
  type SupportedDevContainerTemplate,
} from '@/lib/production/devcontainer-template-catalog'
import {
  runInteractiveForgeScaffold,
  type ForgeScaffoldUxResult,
} from '@/lib/production/forge-scaffold-client'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('ForgeScaffoldWizard')

const TEMPLATES = listDevContainerTemplateCatalog()

export type ForgeScaffoldWizardProps = {
  /** Auth headers for /api/projects + /api/scaffold (Bearer). */
  authHeaders?: Record<string, string>
  /** Skip project create — scaffold into an existing project. */
  existingProjectId?: string
  preferredStrategy?: 'inline' | 'local-dev-server' | 'e2b'
  onSuccess?: (result: Extract<ForgeScaffoldUxResult, { ok: true }>) => void
  onSkip?: () => void
  /** When true, navigate to openUrl on success (default true). */
  autoNavigate?: boolean
}

type Step = 'template' | 'name' | 'running' | 'result'

export function ForgeScaffoldWizard({
  authHeaders,
  existingProjectId,
  preferredStrategy,
  onSuccess,
  onSkip,
  autoNavigate = true,
}: ForgeScaffoldWizardProps) {
  const [step, setStep] = useState<Step>('template')
  const [templateId, setTemplateId] = useState<SupportedDevContainerTemplate | null>(null)
  const [projectName, setProjectName] = useState('')
  const [result, setResult] = useState<ForgeScaffoldUxResult | null>(null)

  const selected = TEMPLATES.find((t) => t.id === templateId)

  const runScaffold = useCallback(async () => {
    if (!templateId) return
    if (!existingProjectId && !projectName.trim()) return

    setStep('running')
    setResult(null)

    const ux = await runInteractiveForgeScaffold({
      name: projectName.trim() || 'forge-scaffold',
      templateId,
      preferredStrategy,
      existingProjectId,
      headers: authHeaders,
    })

    setResult(ux)
    setStep('result')

    if (!ux.ok) {
      log.warn('forge_scaffold_wizard_failed', { code: ux.code, error: ux.error })
      return
    }

    log.info('forge_scaffold_wizard_ok', { projectId: ux.projectId, templateId: ux.templateId })
    onSuccess?.(ux)

    if (autoNavigate && typeof window !== 'undefined') {
      window.location.assign(ux.openUrl)
    }
  }, [
    templateId,
    projectName,
    preferredStrategy,
    existingProjectId,
    authHeaders,
    onSuccess,
    autoNavigate,
  ])

  return (
    <div
      className="mx-auto max-w-2xl px-6 py-10"
      data-aethel-l9="forge-scaffold-wizard"
    >
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
          L.9 FullStack Scaffold
        </p>
        <h2 className={`${CANONICAL_TYPOGRAPHY.h1} mt-2 text-[var(--aethel-text-primary)]`}>
          Scaffold a real workspace
        </h2>
        <p className={`${CANONICAL_TYPOGRAPHY.body} mt-2 text-[var(--aethel-text-tertiary)]`}>
          Choose a DevContainer template, then Forge provisions sandbox files, L.2 on-disk manifest,
          and L.8 preview. Success requires API ok — no fake project created toast.
        </p>
      </div>

      {step === 'template' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TEMPLATES.map((t) => {
            const active = templateId === t.id
            return (
              <button
                key={t.id}
                type="button"
                data-aethel-l9="template-option"
                data-template-id={t.id}
                aria-pressed={active}
                onClick={() => setTemplateId(t.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? 'border-[var(--aethel-primary)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)]'
                    : 'border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] hover:border-[var(--aethel-border-primary)]'
                }`}
              >
                <p className="text-sm font-medium text-[var(--aethel-text-primary)]">{t.name}</p>
                <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">{t.description}</p>
                {t.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-[var(--aethel-surface-tertiary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {step === 'name' && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="forge-scaffold-name"
              className="mb-1.5 block text-xs font-medium text-[var(--aethel-text-secondary)]"
            >
              Project name
            </label>
            <input
              id="forge-scaffold-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-forge-app"
              autoFocus
              disabled={Boolean(existingProjectId)}
              className="w-full rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-4 py-3 text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] focus:border-[var(--aethel-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] disabled:opacity-60"
            />
            {existingProjectId ? (
              <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">
                Scaffolding into existing project {existingProjectId}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">
            Template: <span className="text-[var(--aethel-text-primary)]">{selected?.name}</span>
          </p>
        </div>
      )}

      {step === 'running' && (
        <div
          className="flex flex-col items-center gap-3 py-12 text-center"
          data-aethel-l9="scaffold-running"
          role="status"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[var(--aethel-primary)]" />
          <p className="text-sm text-[var(--aethel-text-primary)]">
            Running FullStackScaffoldEngine…
          </p>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">
            L.2 persist → sandbox scaffold → L.8 preview → commit/CI gate
          </p>
        </div>
      )}

      {step === 'result' && result && (
        <div data-aethel-l9="scaffold-result" data-ok={result.ok ? 'true' : 'false'}>
          {result.ok ? (
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] p-6 text-center">
              <Check className="mx-auto h-10 w-10 text-[var(--aethel-success)]" />
              <p className="mt-3 text-sm font-medium text-[var(--aethel-text-primary)]">
                Scaffold complete
              </p>
              <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
                L.2 on-disk evidence verified. Opening IDE…
              </p>
              {result.previewUrl ? (
                <p className="mt-2 break-all text-[11px] text-[var(--aethel-text-secondary)]">
                  Preview: {result.previewUrl}
                </p>
              ) : null}
            </div>
          ) : (
            <div
              role="alert"
              className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] p-6"
              data-aethel-l9="scaffold-error"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--aethel-error)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--aethel-text-primary)]">
                    Scaffold blocked (fail-closed)
                  </p>
                  <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">{result.error}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
                    code: {result.code}
                  </p>
                  {result.blockedReasons && result.blockedReasons.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-[var(--aethel-text-secondary)]">
                      {result.blockedReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                  {result.commitGate?.checks && result.commitGate.checks.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs">
                      {result.commitGate.checks.map((check) => (
                        <li
                          key={check.id}
                          className={
                            check.status === 'fail'
                              ? 'text-[var(--aethel-error)]'
                              : check.status === 'pass'
                                ? 'text-[var(--aethel-success)]'
                                : 'text-[var(--aethel-text-tertiary)]'
                          }
                        >
                          [{check.status}] {check.id}: {check.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {result.orphanProjectCreated && result.projectId ? (
                    <p className="mt-3 text-[11px] text-[var(--aethel-warning)]">
                      Project row {result.projectId} exists but scaffold did not succeed — not marked
                      ready.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <div>
          {onSkip && step === 'template' ? (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-[var(--aethel-text-tertiary)] underline hover:text-[var(--aethel-text-secondary)]"
            >
              Skip for now
            </button>
          ) : null}
          {(step === 'name' || (step === 'result' && result && !result.ok)) && (
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setStep(step === 'result' ? 'name' : 'template')
              }}
              className="inline-flex items-center gap-1 text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
        </div>
        <div>
          {step === 'template' ? (
            <button
              type="button"
              disabled={!templateId}
              onClick={() => {
                if (existingProjectId) {
                  void runScaffold()
                  return
                }
                setStep('name')
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-5 py-2.5 text-sm font-medium text-[var(--aethel-text-inverse)] disabled:cursor-not-allowed disabled:opacity-40"
              data-aethel-l9="scaffold-submit"
            >
              {existingProjectId ? 'Scaffold' : 'Next'} <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
          {step === 'name' ? (
            <button
              type="button"
              disabled={!projectName.trim()}
              onClick={() => void runScaffold()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-5 py-2.5 text-sm font-medium text-[var(--aethel-text-inverse)] disabled:cursor-not-allowed disabled:opacity-40"
              data-aethel-l9="scaffold-submit"
            >
              Scaffold & open <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
          {step === 'result' && result && !result.ok ? (
            <button
              type="button"
              onClick={() => void runScaffold()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-5 py-2.5 text-sm font-medium text-[var(--aethel-text-inverse)]"
            >
              Retry scaffold
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default ForgeScaffoldWizard
