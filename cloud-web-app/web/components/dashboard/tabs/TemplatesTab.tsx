'use client'

import React from 'react'
import type { WorkflowTemplate } from '../aethel-dashboard-model'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

interface TemplatesTabProps {
  templates: WorkflowTemplate[]
  onSelect: (templateId: string) => void
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

function difficultyLabel(difficulty: WorkflowTemplate['difficulty']) {
  if (difficulty === 'beginner') return 'Iniciante'
  if (difficulty === 'intermediate') return 'Intermediario'
  return 'Avancado'
}

export default function TemplatesTab({ templates, onSelect }: TemplatesTabProps) {
  return (
    <div className={shellClass}>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center">
        <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--aethel-success-light)]">
          Workflow Starters
        </span>
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">Modelos de workflow</h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)] lg:text-[15px]">
          Start faster with preconfigured structures for real workflows. This lane is
          reduce friction, make the choice clearer, and give users a premium starting point.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <div key={template.id} className={cardClass}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-success-light)]">
                {template.category}
              </span>
              <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 py-1 text-[11px] font-medium text-[var(--aethel-text-tertiary)]">
                {difficultyLabel(template.difficulty)}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-[var(--aethel-text-primary)]">{template.name}</h3>
              <p className="min-h-[72px] text-sm leading-6 text-[var(--aethel-text-secondary)]">{template.description}</p>
            </div>

            <div className="mt-6 flex-1 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                Acoes incluidas
              </div>
              <ul className="space-y-2">
                {template.steps.slice(0, 3).map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--aethel-text-secondary)]">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[var(--aethel-success)]" />
                    <span>{step}</span>
                  </li>
                ))}
                {template.steps.length > 3 && (
                  <li className="text-xs text-[var(--aethel-text-tertiary)]">+ {template.steps.length - 3} etapas adicionais</li>
                )}
              </ul>
            </div>

            <button
              type="button"
              aria-label={`Usar modelo ${template.name}`}
              onClick={() => onSelect(template.id)}
              className={`mt-6 w-full ${actionButtonClass}`}
            >
              Usar modelo
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
