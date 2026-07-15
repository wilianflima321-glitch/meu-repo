'use client'

import { useEffect } from 'react'
import { Award, Check, X } from 'lucide-react'
import { useOnboarding } from './OnboardingProvider'
import type { Achievement } from './types'

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_project', name: 'First project', description: 'Created the first project', icon: 'P1', category: 'beginner' },
  { id: 'ai_master', name: 'AI flow', description: 'Ran 10 AI changes', icon: 'AI', category: 'ai' },
  { id: 'collaborator', name: 'Collaboration', description: 'Invited a teammate', icon: 'TEAM', category: 'social' },
  { id: 'publisher', name: 'Delivery ready', description: 'Generated a valid delivery', icon: 'DEP', category: 'delivery' },
  { id: 'week_streak', name: 'Weekly rhythm', description: 'Active for 7 days', icon: '7D', category: 'engagement' },
]

export function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[var(--aethel-surface-tertiary)] p-3">
      <div className="text-3xl">{achievement.icon}</div>
      <div>
        <div className="font-medium text-[var(--aethel-text-primary)]">{achievement.name}</div>
        <div className="text-xs text-[var(--aethel-text-tertiary)]">{achievement.description}</div>
      </div>
    </div>
  )
}

export function AchievementToast({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed right-4 top-4 z-50 animate-slide-in-right">
      <div className="flex items-center gap-4 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[var(--aethel-surface-secondary)] p-4 shadow-2xl">
        <Award className="h-8 w-8 text-[var(--aethel-warning-light)]" />
        <div>
          <div className="text-xs font-medium text-[var(--aethel-warning-light)]">Achievement unlocked</div>
          <div className="font-semibold text-[var(--aethel-text-primary)]">{achievement.name}</div>
          <div className="text-sm text-[var(--aethel-text-secondary)]">{achievement.description}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close achievement notification"
          className="text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function AchievementsPanel() {
  const { state } = useOnboarding()

  if (!state) return null

  const unlockedIds = state.achievements
  const achievements = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlockedIds.includes(a.id),
  }))

  return (
    <div className="p-4">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--aethel-text-primary)]">
        <Award className="h-5 w-5 text-[var(--aethel-warning-light)]" />
        Achievements
      </h2>

      <div className="grid gap-3">
        {achievements.map(achievement => (
          <div
            key={achievement.id}
            className={`flex items-center gap-3 rounded-lg p-3 transition-all ${
              achievement.unlocked
                ? 'border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[var(--aethel-surface-secondary)]'
                : 'bg-[var(--aethel-surface-tertiary)] opacity-50 grayscale'
            }`}
          >
            <div className="text-2xl">{achievement.icon}</div>
            <div className="flex-1">
              <div className="font-medium text-[var(--aethel-text-primary)]">{achievement.name}</div>
              <div className="text-xs text-[var(--aethel-text-tertiary)]">{achievement.description}</div>
            </div>
            {achievement.unlocked ? <Check className="h-5 w-5 text-[var(--aethel-warning-light)]" /> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
