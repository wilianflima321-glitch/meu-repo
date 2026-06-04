'use client'

import React, { useState, useCallback } from 'react'
import {
  ArrowRight,
  Code,
  Gamepad2,
  Film,
  Globe,
  Sparkles,
  Check,
  ChevronRight,
  Layers,
  Smartphone,
} from 'lucide-react'
import { CANONICAL_TYPOGRAPHY, CANONICAL_SPACING } from '@/lib/canonical-spacing'

/**
 * OnboardingWizard - 3-step quick start flow
 * Benchmark target: Replit (< 60 seconds to first value)
 * Source: docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md
 */

type ProjectType = 'web-app' | 'api' | 'mobile' | 'game' | 'film' | 'other'

interface Template {
  id: string
  name: string
  description: string
  icon: React.ElementType
  type: ProjectType
  tags: string[]
}

const TEMPLATES: Template[] = [
  { id: 'nextjs', name: 'Next.js App', description: 'React + SSR + Tailwind', icon: Globe, type: 'web-app', tags: ['React', 'TypeScript'] },
  { id: 'react-vite', name: 'React + Vite', description: 'Fast SPA with Vite', icon: Code, type: 'web-app', tags: ['React', 'Vite'] },
  { id: 'api-express', name: 'API Express', description: 'REST API com Node.js', icon: Layers, type: 'api', tags: ['Node.js', 'Express'] },
  { id: 'react-native', name: 'React Native', description: 'App mobile cross-platform', icon: Smartphone, type: 'mobile', tags: ['React Native', 'Expo'] },
  { id: 'game-3d', name: 'Basic 3D game', description: 'Three.js + Physics', icon: Gamepad2, type: 'game', tags: ['Three.js', 'Rapier'] },
  { id: 'blank', name: 'Blank project', description: 'Start from scratch', icon: Sparkles, type: 'other', tags: [] },
]

interface OnboardingWizardProps {
  onComplete: (data: { template: string; name: string; description: string }) => void
  onSkip?: () => void
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  const handleNext = useCallback(() => {
    if (step === 0 && selectedTemplate) {
      setStep(1)
    } else if (step === 1 && projectName.trim()) {
      setStep(2)
    }
  }, [step, selectedTemplate, projectName])

  const handleComplete = useCallback(() => {
    if (selectedTemplate && projectName.trim()) {
      onComplete({
        template: selectedTemplate,
        name: projectName.trim(),
        description: projectDescription.trim(),
      })
    }
  }, [selectedTemplate, projectName, projectDescription, onComplete])

  const steps = [
    { label: 'Template', done: step > 0 },
    { label: 'Name', done: step > 1 },
    { label: 'Ready!', done: false },
  ]

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {steps.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                    i <= step
                      ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)]'
                      : 'border border-[var(--aethel-border-primary)] text-[var(--aethel-text-tertiary)]'
                  }`}
                >
                  {s.done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs ${i <= step ? 'text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)]'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 mx-3 h-px ${i < step ? 'bg-[var(--aethel-primary)]' : 'bg-[var(--aethel-border-subtle)]'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 0: Choose Template */}
      {step === 0 && (
        <div>
          <h2 className={`${CANONICAL_TYPOGRAPHY.h1} text-[var(--aethel-text-primary)] mb-2`}>
            Choose a template
          </h2>
          <p className={`${CANONICAL_TYPOGRAPHY.body} text-[var(--aethel-text-tertiary)] mb-6`}>
            Start from a clean base or a focused starter.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplate(t.id)}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                  selectedTemplate === t.id
                    ? 'border-[var(--aethel-primary)] bg-[var(--aethel-primary)]/10 shadow-lg shadow-[var(--aethel-primary)]/10'
                    : 'border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] hover:border-[var(--aethel-border-primary)] hover:bg-[var(--aethel-surface-tertiary)]'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--aethel-surface-tertiary)]">
                  <t.icon className="h-5 w-5 text-[var(--aethel-info)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--aethel-text-primary)]">{t.name}</p>
                  <p className="text-xs text-[var(--aethel-text-tertiary)] mt-0.5">{t.description}</p>
                  {t.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {t.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-[var(--aethel-surface-tertiary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Name & Description */}
      {step === 1 && (
        <div>
          <h2 className={`${CANONICAL_TYPOGRAPHY.h1} text-[var(--aethel-text-primary)] mb-2`}>
            Name your project
          </h2>
          <p className={`${CANONICAL_TYPOGRAPHY.body} text-[var(--aethel-text-tertiary)] mb-6`}>
            You can change it later.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--aethel-text-secondary)] mb-1.5">
                Project name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-awesome-project"
                autoFocus
                className="w-full rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-4 py-3 text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:border-[var(--aethel-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--aethel-primary)]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--aethel-text-secondary)] mb-1.5">
                Description (opcional)
              </label>
              <input
                type="text"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Uma breve description..."
                className="w-full rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-4 py-3 text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:border-[var(--aethel-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--aethel-primary)]/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Ready! */}
      {step === 2 && (
        <div className="text-center py-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--aethel-success)]/15 border border-[var(--aethel-success)]/30">
            <Check className="h-10 w-10 text-[var(--aethel-success)]" />
          </div>
          <h2 className={`${CANONICAL_TYPOGRAPHY.h1} text-[var(--aethel-text-primary)] mb-2`}>
            All set!
          </h2>
          <p className={`${CANONICAL_TYPOGRAPHY.body} text-[var(--aethel-text-tertiary)] mb-2`}>
            Project: <strong className="text-[var(--aethel-text-primary)]">{projectName}</strong>
          </p>
          <p className={`${CANONICAL_TYPOGRAPHY.meta} text-[var(--aethel-text-tertiary)] mb-8`}>
            Template: {TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <div>
          {onSkip && step === 0 && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] underline"
            >
              Skip to Studio
            </button>
          )}
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]"
            >
              ? Back
            </button>
          )}
        </div>
        <div>
          {step < 2 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={(step === 0 && !selectedTemplate) || (step === 1 && !projectName.trim())}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)] px-6 py-2.5 text-sm font-medium text-[var(--aethel-text-inverse)] shadow-lg shadow-[var(--aethel-primary)]/25 transition-all duration-200 hover:shadow-[var(--aethel-primary)]/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--aethel-success)] to-[var(--aethel-secondary)] px-6 py-2.5 text-sm font-medium text-[var(--aethel-text-inverse)] shadow-lg shadow-[var(--aethel-success)]/25 transition-all duration-200 hover:shadow-[var(--aethel-success)]/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Open in IDE <Sparkles className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingWizard
