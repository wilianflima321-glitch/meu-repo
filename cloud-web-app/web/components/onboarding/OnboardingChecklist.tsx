'use client'

import { useEffect, useState } from 'react'
import { Check, Target, X } from 'lucide-react'
import { useOnboarding } from './OnboardingProvider'
import { onboardingPrimaryButtonClass } from './styles'
import type { OnboardingStep, SystemHealthReport } from './types'

const CHECKLIST_ITEMS: OnboardingStep[] = [
  {
    id: 'dependency_check',
    title: 'Check runtime and integrations',
    description: 'Preview, storage, billing, and AI providers',
    completed: false,
  },
  {
    id: 'profile_setup',
    title: 'Tune your profile',
    description: 'Name, team, and studio preferences',
    completed: false,
  },
  {
    id: 'first_project',
    title: 'Create your first project',
    description: 'Use a base template to accelerate the flow',
    completed: false,
  },
  {
    id: 'explore_editor',
    title: 'Explore the editor',
    description: 'Meet the IDE, preview, and status panel',
    completed: false,
  },
  {
    id: 'try_ai',
    title: 'Use AI',
    description: 'Request a small change and validate the result',
    completed: false,
  },
  {
    id: 'invite_team',
    title: 'Invite your team',
    description: 'Share the workspace with your team',
    completed: false,
  },
  {
    id: 'publish_first',
    title: 'Finish a delivery',
    description: 'Export or prepare a deploy to validate the loop',
    completed: false,
  },
]

function getDependencySummary(health: SystemHealthReport | null) {
  if (!health) return 'Waiting for dependency verification...'
  const total = health.dependencies?.length || 0
  const ok = health.dependencies?.filter(dep => dep.status === 'healthy').length || 0
  const requiredMissing = health.missingRequired?.length || 0
  if (requiredMissing > 0) {
    return `${requiredMissing} critical dependencies missing`
  }
  return `${ok}/${total} dependencies ok`
}

function getHealthLabel(value: SystemHealthReport['overall']) {
  switch (value) {
    case 'healthy':
      return 'Healthy'
    case 'degraded':
      return 'Partial'
    case 'unhealthy':
      return 'Unavailable'
    default:
      return 'Unknown'
  }
}

export function OnboardingChecklist() {
  const { state, completeStep } = useOnboarding()
  const [isOpen, setIsOpen] = useState(false)
  const [health, setHealth] = useState<SystemHealthReport | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthError, setHealthError] = useState<string | null>(null)

  const fetchHealth = async () => {
    setHealthLoading(true)
    setHealthError(null)
    try {
      const res = await fetch('/api/system-health', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`system health failed (${res.status})`)
      }
      const data = (await res.json()) as SystemHealthReport
      setHealth(data)
    } catch (error) {
      setHealthError(error instanceof Error ? error.message : 'Failed to check dependencies')
    } finally {
      setHealthLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  useEffect(() => {
    if (!health || !state) return
    if (health.canRunBasicFeatures && !state.completedSteps.includes('dependency_check')) {
      completeStep('dependency_check')
    }
  }, [health, state, completeStep])

  if (!state || state.currentStep === 'completed') return null

  const dependencySummary = getDependencySummary(health)
  const items = CHECKLIST_ITEMS.map(item => ({
    ...item,
    description: item.id === 'dependency_check' ? dependencySummary : item.description,
    completed: state.completedSteps.includes(item.id),
  }))

  const completedCount = items.filter(i => i.completed).length
  const progress = Math.round((completedCount / items.length) * 100)

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {isOpen ? (
        <div className="w-80 overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_95%,transparent)] shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
          <div className="border-b border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-[var(--aethel-text-primary)]">First steps</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close onboarding"
                className="text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]">
              <div
                className="h-full bg-[var(--aethel-primary)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
              {completedCount} of {items.length} complete
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            <div className="px-2 pb-3">
              <div className="flex items-center justify-between text-xs text-[var(--aethel-text-tertiary)]">
                <span>System dependencies</span>
                <button
                  type="button"
                  onClick={fetchHealth}
                  className="text-[var(--aethel-info-light)] transition-colors hover:text-[var(--aethel-info-light)]"
                >
                  {healthLoading ? 'Checking...' : 'Recheck'}
                </button>
              </div>
              {healthError ? (
                <div className="mt-2 text-xs text-[var(--aethel-error-light)]">{healthError}</div>
              ) : null}
              {health ? <DependencyHealthSummary health={health} /> : null}
            </div>
            {items.map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => !item.completed && completeStep(item.id)}
                disabled={item.completed}
                className={`w-full rounded-xl p-3 text-left transition-colors ${
                  item.completed
                    ? 'opacity-60'
                    : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      item.completed
                        ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
                        : 'border-[var(--aethel-border-primary)]'
                    }`}
                  >
                    {item.completed ? <Check className="h-3 w-3 text-[var(--aethel-text-primary)]" /> : null}
                  </div>
                  <div>
                    <div
                      className={`font-medium ${
                        item.completed
                          ? 'text-[var(--aethel-text-quaternary)] line-through'
                          : 'text-[var(--aethel-text-primary)]'
                      }`}
                    >
                      {item.title}
                    </div>
                    <div className="text-xs text-[var(--aethel-text-tertiary)]">{item.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={onboardingPrimaryButtonClass.replace('px-6 py-2 text-sm', 'px-4 py-2 text-xs')}
          aria-label="Open onboarding checklist"
        >
          <Target className="h-4 w-4" />
          {completedCount}/{items.length}
        </button>
      )}
    </div>
  )
}

function DependencyHealthSummary({ health }: { health: SystemHealthReport }) {
  return (
    <div className="mt-2 space-y-1 text-xs text-[var(--aethel-text-secondary)]">
      <div className="flex items-center justify-between">
        <span>Overall status</span>
        <span
          className={
            health.overall === 'healthy'
              ? 'text-[var(--aethel-success-light)]'
              : health.overall === 'degraded'
              ? 'text-[var(--aethel-warning-light)]'
              : 'text-[var(--aethel-error-light)]'
          }
        >
          {getHealthLabel(health.overall)}
        </span>
      </div>
      {health.missingRequired && health.missingRequired.length > 0 ? (
        <div className="text-[var(--aethel-error-light)]">Critical: {health.missingRequired.join(', ')}</div>
      ) : null}
      {health.missingOptional && health.missingOptional.length > 0 ? (
        <div className="text-[var(--aethel-text-tertiary)]">Optional: {health.missingOptional.join(', ')}</div>
      ) : null}
      {health.dependencies && health.dependencies.length > 0 ? (
        <div className="mt-2 space-y-1">
          {health.dependencies
            .filter(dep => dep.status === 'unhealthy' || dep.status === 'degraded')
            .slice(0, 6)
            .map(dep => (
              <div key={dep.name} className="text-xs text-[var(--aethel-text-tertiary)]">
                <span
                  className={
                    dep.status === 'unhealthy'
                      ? 'text-[var(--aethel-error-light)]'
                      : 'text-[var(--aethel-warning-light)]'
                  }
                >
                  {dep.name}
                </span>
                {dep.installCommand ? (
                  <span className="text-[var(--aethel-text-quaternary)]"> - {dep.installCommand}</span>
                ) : null}
                {dep.installUrl && !dep.installCommand ? (
                  <span className="text-[var(--aethel-text-quaternary)]"> - {dep.installUrl}</span>
                ) : null}
              </div>
            ))}
        </div>
      ) : null}
    </div>
  )
}
