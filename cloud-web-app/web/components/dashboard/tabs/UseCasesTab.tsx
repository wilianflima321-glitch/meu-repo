'use client'

import React from 'react'
import type { UseCase } from '../aethel-dashboard-model'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

interface UseCasesTabProps {
  useCases: UseCase[]
  onSelect: (useCaseId: string) => void
}

const shellClass = [
  'space-y-8 rounded-[28px] border border-[var(--aethel-border-subtle)]',
  'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_92%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_96%,transparent))]',
  'p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:p-8',
].join(' ')

const cardClass = [
  'flex h-full flex-col rounded-2xl border border-[var(--aethel-border-subtle)]',
  'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)]',
  'p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]',
].join(' ')

const actionButtonClass = `inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-4 py-3 text-sm font-medium text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-focus)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

function difficultyLabel(difficulty: UseCase['difficulty']) {
  if (difficulty === 'beginner') return 'Iniciante'
  if (difficulty === 'intermediate') return 'Intermediario'
  return 'Avancado'
}

export default function UseCasesTab({ useCases, onSelect }: UseCasesTabProps) {
  return (
    <div className={shellClass}>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center">
        <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--aethel-primary-light)]">
          Use Cases
        </span>
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">Casos de uso</h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)] lg:text-[15px]">
          Mostre ao usuario final como o Aethel acelera fluxos reais. Esta tela precisa vender
          clareza, contexto e direcao, nao parecer um monte de cards soltos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {useCases.map((useCase) => (
          <div key={useCase.id} className={cardClass}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-primary-light)]">
                {useCase.category}
              </span>
              <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 py-1 text-[11px] font-medium text-[var(--aethel-text-tertiary)]">
                {difficultyLabel(useCase.difficulty)}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-[var(--aethel-text-primary)]">{useCase.name}</h3>
              <p className="min-h-[72px] text-sm leading-6 text-[var(--aethel-text-secondary)]">{useCase.description}</p>
            </div>

            <div className="mt-6 flex-1 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                Funcionalidades principais
              </div>
              <ul className="space-y-2">
                {useCase.features.slice(0, 3).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--aethel-text-secondary)]">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[var(--aethel-primary)]" />
                    <span>{feature}</span>
                  </li>
                ))}
                {useCase.features.length > 3 && (
                  <li className="text-xs text-[var(--aethel-text-tertiary)]">+ {useCase.features.length - 3} capacidades adicionais</li>
                )}
              </ul>
            </div>

            <button
              type="button"
              aria-label={`Explorar caso de uso ${useCase.name}`}
              onClick={() => onSelect(useCase.id)}
              className={`mt-6 w-full ${actionButtonClass}`}
            >
              Explorar caso de uso
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
