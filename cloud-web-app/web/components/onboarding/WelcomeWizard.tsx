'use client'

import { useState } from 'react'
import { Sparkles, ChevronRight, X } from 'lucide-react'

interface WelcomeWizardProps {
  onComplete: (template?: string) => void
  onSkip?: () => void
  isOpen: boolean
}

const STEPS = [
  {
    title: 'Welcome ao Aethel Studio',
    description: 'Apps e Research sao as trilhas prontas hoje. Games e Films seguem em roadmap.',
  },
  {
    title: 'Configure seu provider',
    description: 'Conecte uma API key para respostas reais e rastreaveis. Nada e simulado.',
  },
  {
    title: 'Create your first project',
    description: 'Escolha um template e valide o ciclo completo no dashboard.',
  },
]

const wizardSecondaryButtonClass =
  'inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition-colors hover:bg-[var(--aethel-surface-quaternary)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]'

const wizardPrimaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-6 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] transition-colors hover:bg-[var(--aethel-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]'

export function WelcomeWizard({ onComplete, onSkip, isOpen }: WelcomeWizardProps) {
  const [step, setStep] = useState(0)

  if (!isOpen) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      onComplete()
    } else {
      setStep((prev) => prev + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_82%,transparent)] backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_94%,transparent)] shadow-[0_24px_60px_rgba(2,6,23,0.55)]">
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-primary-dark)_90%,transparent)] via-[color-mix(in_srgb,var(--aethel-info)_80%,transparent)] to-[color-mix(in_srgb,var(--aethel-primary)_80%,transparent)]">
          <Sparkles className="h-12 w-12 text-[var(--aethel-text-primary)]" />
          <button
            type="button"
            onClick={() => onSkip?.()}
            className="absolute right-4 top-4 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] p-2 text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--aethel-text-primary)]">{current.title}</h2>
          <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">{current.description}</p>

          <div className="mt-6 flex justify-center gap-2">
            {STEPS.map((_, index) => (
              <span
                key={index}
                className={`h-2 w-2 rounded-full ${index === step ? 'bg-[var(--aethel-info-light)]' : 'bg-[color-mix(in_srgb,var(--aethel-border-primary)_40%,transparent)]'}`}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onSkip?.()}
              className={wizardSecondaryButtonClass}
              aria-label="Pular wizard de boas-vindas"
            >
              Pular
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={wizardPrimaryButtonClass}
              aria-label={isLast ? 'Abrir studio apos concluir onboarding' : 'Avancar para a proxima etapa do onboarding'}
            >
              {isLast ? 'Abrir Studio' : 'Proximo'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeWizard

