export interface OnboardingStep {
  id: string
  title: string
  description: string
  target?: string
  action?: string
  completed: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  unlockedAt?: Date
}

export interface OnboardingState {
  currentStep: string
  completedSteps: string[]
  completedTours: string[]
  achievements: string[]
  stats: Record<string, number>
}

export interface DependencyInfo {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'checking'
  required: boolean
  installCommand?: string
  installUrl?: string
  errorMessage?: string
}

export interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  dependencies: DependencyInfo[]
  canRunFullFeatures?: boolean
  canRunBasicFeatures?: boolean
  missingRequired?: string[]
  missingOptional?: string[]
}

export interface OnboardingContextType {
  state: OnboardingState | null
  loading: boolean
  completeStep: (step: string) => Promise<void>
  completeTour: (tour: string) => Promise<void>
  skipOnboarding: () => Promise<void>
  showWelcome: boolean
  setShowWelcome: (show: boolean) => void
}
