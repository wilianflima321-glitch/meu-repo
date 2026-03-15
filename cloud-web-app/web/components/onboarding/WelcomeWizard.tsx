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
    title: 'Bem-vindo ao Aethel Studio',
    description: 'Apps e Research sao as trilhas prontas hoje. Games e Films seguem em roadmap.',
  },
  {
    title: 'Configure seu provider',
    description: 'Conecte uma API key para respostas reais e rastreaveis. Nada e simulado.',
  },
  {
    title: 'Crie seu primeiro projeto',
    description: 'Escolha um template e valide o ciclo completo no dashboard.',
  },
]

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-indigo-600/90 via-sky-600/80 to-indigo-500/80">
          <Sparkles className="h-12 w-12 text-white" />
          <button
            type="button"
            onClick={() => onSkip?.()}
            className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/10 p-2 text-white/70 transition-colors hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-white">{current.title}</h2>
          <p className="mt-3 text-sm text-slate-300">{current.description}</p>

          <div className="mt-6 flex justify-center gap-2">
            {STEPS.map((_, index) => (
              <span
                key={index}
                className={`h-2 w-2 rounded-full ${index === step ? 'bg-sky-400' : 'bg-white/20'}`}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onSkip?.()}
              className="aethel-button aethel-button-ghost rounded-xl px-4 py-2 text-sm font-medium"
            >
              Pular
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="aethel-button aethel-button-primary rounded-xl px-6 py-2 text-sm font-semibold flex items-center gap-2"
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
