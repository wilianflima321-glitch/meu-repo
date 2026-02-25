export type OnboardingStep = 
  | 'welcome'
  | 'profile_setup'
  | 'first_project'
  | 'explore_editor'
  | 'try_ai'
  | 'invite_team'
  | 'publish_first'
  | 'completed';

export type TourType = 
  | 'getting_started'
  | 'blueprint_editor'
  | 'level_editor'
  | 'niagara_editor'
  | 'ai_assistant'
  | 'collaboration'
  | 'marketplace'
  | 'billing';

export type AchievementCategory = 
  | 'beginner'
  | 'creator'
  | 'collaborator'
  | 'ai_master'
  | 'publisher'
  | 'community';

export interface OnboardingState {
  userId: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skipped: boolean;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  action?: {
    type: 'click' | 'input' | 'wait' | 'custom';
    value?: string;
    validator?: () => boolean;
  };
  spotlight?: boolean;
  disableOverlay?: boolean;
  allowClickThrough?: boolean;
  beforeShow?: () => void | Promise<void>;
  afterHide?: () => void | Promise<void>;
}

export interface Tour {
  id: TourType;
  name: string;
  description: string;
  steps: TourStep[];
  prerequisites?: TourType[];
  estimatedTime?: number; // minutos
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  secret?: boolean;
  condition: {
    type: 'count' | 'milestone' | 'streak' | 'combination';
    target: string;
    value: number;
    values?: string[];
  };
  reward?: {
    type: 'badge' | 'feature' | 'discount' | 'tokens';
    value: string | number;
  };
}

export interface UserProgress {
  userId: string;
  onboarding: OnboardingState;
  completedTours: TourType[];
  achievements: string[];
  totalPoints: number;
  level: number;
  stats: {
    projectsCreated: number;
    filesEdited: number;
    aiPromptsUsed: number;
    collaborationsJoined: number;
    buildsCompleted: number;
    daysActive: number;
    streak: number;
  };
  hints: {
    shown: string[];
    dismissed: string[];
  };
}

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}
