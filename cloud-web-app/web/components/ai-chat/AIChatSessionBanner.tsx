'use client'

import { useMemo } from 'react'

const IDE_CHAT_INTENTS = [
  {
    id: 'implement',
    label: 'Implementar no editor',
    description: 'Traduzir a missao atual em passos e alteracoes concretas.',
    buildPrompt: (mission?: string | null) =>
      mission
        ? `${mission}\n\nConverta isso em um plano de implementacao no editor, com arquivos, passos e risco principal.`
        : 'Converta a tarefa atual em um plano de implementacao no editor, com arquivos, passos e risco principal.',
  },
  {
    id: 'review',
    label: 'Criticar e revisar',
    description: 'Fazer review do que ja existe e apontar a proxima melhoria.',
    buildPrompt: (mission?: string | null) =>
      mission
        ? `${mission}\n\nRevise o estado atual, critique as lacunas e proponha a proxima melhoria com maior impacto.`
        : 'Revise o estado atual, critique as lacunas e proponha a proxima melhoria com maior impacto.',
  },
  {
    id: 'runtime',
    label: 'Preparar preview/runtime',
    description: 'Sair com checklist de validacao para preview, runtime e handoff.',
    buildPrompt: (mission?: string | null) =>
      mission
        ? `${mission}\n\nPrepare um checklist de runtime, preview e validacao final para esta missao.`
        : 'Prepare um checklist de runtime, preview e validacao final para a tarefa atual.',
  },
] as const

type AIChatSessionBannerProps = {
  mission: string | null
  source: string | null
  projectId?: string
  focusClass: string
  onIntent: (prompt: string) => void
}

export default function AIChatSessionBanner({
  mission,
  source,
  projectId,
  focusClass,
  onIntent,
}: AIChatSessionBannerProps) {
  const intents = useMemo(() => IDE_CHAT_INTENTS, [])

  return (
    <div className="mx-3 mt-3 rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-primary)_14%,transparent),color-mix(in_srgb,var(--aethel-info)_10%,transparent),rgba(15,23,42,0.78))] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
          Sessao de trabalho
        </span>
        {source ? (
          <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
            origem {source}
          </span>
        ) : null}
        {projectId ? (
          <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
            projeto {projectId}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-sm font-medium text-[var(--aethel-text-primary)]">
        {mission || 'Continue a partir do contexto do studio sem perder o handoff atual.'}
      </div>
      <div className="mt-3 grid gap-2">
        {intents.map((intent) => (
          <button
            key={intent.id}
            type="button"
            onClick={() => onIntent(intent.buildPrompt(mission))}
            className={`rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-4 py-3 text-left hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] ${focusClass}`}
            aria-label={`Executar atalho ${intent.label}`}
          >
            <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{intent.label}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{intent.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
