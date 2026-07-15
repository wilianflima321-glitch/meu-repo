'use client'

import { PREVIEW_RUNTIME_COPY } from './PreviewRuntimeToolbar.types'

export function PreviewRuntimeTechnicalDetails({
  techFacts,
  instructions,
  managedSetupEnv,
  recommendedCommands,
}: {
  techFacts: string[]
  instructions: string[]
  managedSetupEnv: string[]
  recommendedCommands: string[]
}) {
  const t = PREVIEW_RUNTIME_COPY

  return (
    <details className="mt-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]">
      <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-[var(--aethel-text-secondary)]">
        {t.technicalDetails}
      </summary>
      <div className="border-t border-[var(--aethel-border-primary)] px-3 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--aethel-text-tertiary)]">
          {techFacts.map((fact) => (
            <span
              key={fact}
              className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2 py-1"
            >
              {fact}
            </span>
          ))}
        </div>

        {instructions.length > 0 ? (
          <PreviewRuntimeTechnicalRow label="Runtime instructions" values={instructions} />
        ) : null}
        {managedSetupEnv.length > 0 ? (
          <PreviewRuntimeTechnicalRow label="Env needed" values={managedSetupEnv.map((envKey) => `env:${envKey}`)} subtle />
        ) : null}
        {recommendedCommands.length > 0 ? (
          <div className="mt-3">
            <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Suggested commands</div>
            <div className="flex flex-wrap gap-2">
              {recommendedCommands.map((command) => (
                <code
                  key={command}
                  className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--aethel-info-light)]"
                >
                  {command}
                </code>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </details>
  )
}

function PreviewRuntimeTechnicalRow({
  label,
  values,
  subtle = false,
}: {
  label: string
  values: string[]
  subtle?: boolean
}) {
  return (
    <div className="mt-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className={`rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1 text-[11px] ${
              subtle ? 'text-[var(--aethel-text-tertiary)]' : 'text-[var(--aethel-text-secondary)]'
            }`}
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  )
}
