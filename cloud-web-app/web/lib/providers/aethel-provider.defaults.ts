import type { AethelState, Preferences } from './aethel-provider.contracts';

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  language: 'en',
  reducedMotion: false,
  soundEnabled: true,
  autoSave: true,
  telemetry: true,
};

export const initialState: AethelState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  wallet: null,
  aiSession: {
    id: '',
    status: 'idle',
    steps: [],
  },
  onboarding: {
    isComplete: false,
    currentStep: 'welcome',
    completedSteps: [],
    totalXP: 0,
    level: 1,
    showWizard: false,
  },
  preferences: DEFAULT_PREFERENCES,
  wsConnected: false,
  notifications: [],
};

export function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };
  return labels[plan] || 'Free';
}

export function getPlanLimit(plan: string): number {
  const limits: Record<string, number> = {
    free: 500,
    starter: 5000,
    pro: 50000,
    enterprise: 500000,
  };
  return limits[plan] || 500;
}

export function getNextStep(current: string): string {
  const steps = [
    'welcome',
    'dependency_check',
    'profile_setup',
    'first_project',
    'explore_editor',
    'try_ai',
    'invite_team',
    'publish_first',
    'completed',
  ];
  const idx = steps.indexOf(current);
  return steps[idx + 1] || 'completed';
}
