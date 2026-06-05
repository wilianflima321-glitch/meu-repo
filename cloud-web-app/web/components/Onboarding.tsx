'use client'

export { OnboardingProvider, useOnboarding } from './onboarding/OnboardingProvider'
export { WelcomeModal } from './onboarding/WelcomeModal'
export { OnboardingChecklist } from './onboarding/OnboardingChecklist'
export { AchievementBadge, AchievementToast, AchievementsPanel } from './onboarding/Achievements'
export type {
  Achievement,
  DependencyInfo,
  OnboardingContextType,
  OnboardingState,
  OnboardingStep,
  SystemHealthReport,
} from './onboarding/types'
