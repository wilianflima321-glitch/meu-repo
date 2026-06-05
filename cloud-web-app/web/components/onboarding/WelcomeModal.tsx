'use client'

import { useState } from 'react'
import { ChevronRight, Layout, Rocket, Sparkles, Target, Users, X } from 'lucide-react'
import { useOnboarding } from './OnboardingProvider'
import { onboardingPrimaryButtonClass, onboardingSecondaryButtonClass } from './styles'

export function WelcomeModal({ mission }: { mission?: string }) {
  const { showWelcome, setShowWelcome, completeStep, skipOnboarding } = useOnboarding()
  const [step, setStep] = useState(0)

  const welcomeSteps = mission
    ? [
        {
          title: `Let us build: ${mission}`,
          description: 'Your workspace is ready. Review the details, then let the agents start with evidence.',
          icon: <Sparkles className="h-12 w-12 text-[var(--aethel-primary-light)]" />,
        },
        {
          title: 'Connect your AI',
          description: 'Choose the provider that will power traceable planning, code, and review.',
          icon: <Target className="h-12 w-12 text-[var(--aethel-info-light)]" />,
        },
        {
          title: 'Open the workbench',
          description: 'Editor, preview, agents, and terminal stay connected around the same task.',
          icon: <Layout className="h-12 w-12 text-[var(--aethel-success-light)]" />,
        },
        {
          title: 'Start building',
          description: 'Apply one small change, validate it, and keep the receipt.',
          icon: <Rocket className="h-12 w-12 text-[var(--aethel-warning-light)]" />,
        },
      ]
    : [
        {
          title: 'Welcome to Aethel',
          description: 'A governed creator IDE for apps, research, evidence, and guided runtime work.',
          icon: <Sparkles className="h-12 w-12 text-[var(--aethel-primary-light)]" />,
        },
        {
          title: 'Create a project',
          description: 'Pick a base, describe the goal, and validate every generated step.',
          icon: <Rocket className="h-12 w-12 text-[var(--aethel-info-light)]" />,
        },
        {
          title: 'Connect your AI',
          description: 'Use real providers with receipts. No simulated progress, no hidden claims.',
          icon: <Target className="h-12 w-12 text-[var(--aethel-success-light)]" />,
        },
        {
          title: 'Invite the team',
          description: 'Review changes together and keep delivery evidence traceable.',
          icon: <Users className="h-12 w-12 text-[var(--aethel-warning-light)]" />,
        },
      ]

  if (!showWelcome) return null

  const currentWelcomeStep = welcomeSteps[step]
  const isLastStep = step === welcomeSteps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      completeStep('welcome')
      setShowWelcome(false)
      return
    }
    setStep(s => s + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_95%,transparent)] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        <div className="relative flex h-32 items-center justify-center border-b border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]">
          {currentWelcomeStep.icon}
          <button
            type="button"
            onClick={skipOnboarding}
            className="absolute right-4 top-4 rounded-full border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-2 text-[var(--aethel-text-secondary)] transition-colors hover:text-[var(--aethel-text-primary)]"
            aria-label="Skip initial onboarding"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 text-center">
          <h2 className="mb-3 text-2xl font-bold text-[var(--aethel-text-primary)]">
            {currentWelcomeStep.title}
          </h2>
          <p className="mb-6 text-[var(--aethel-text-secondary)]">
            {currentWelcomeStep.description}
          </p>

          <div className="mb-6 flex justify-center gap-2">
            {welcomeSteps.map((item, i) => (
              <div
                key={item.title}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === step
                    ? 'bg-[var(--aethel-info)]'
                    : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={skipOnboarding}
              className={onboardingSecondaryButtonClass}
              aria-label="Skip initial onboarding"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={onboardingPrimaryButtonClass}
              aria-label={isLastStep ? 'Complete onboarding and start' : 'Go to the next onboarding step'}
            >
              {isLastStep ? 'Start' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
