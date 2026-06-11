import type React from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface WalletState {
  balance: number;
  reserved: number;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  planLabel: string;
  monthlyUsage: number;
  monthlyLimit: number;
  lowBalanceWarning: boolean;
  lastUpdated: string;
}

export interface AISession {
  id: string;
  status: 'idle' | 'thinking' | 'generating' | 'complete' | 'error';
  prompt?: string;
  steps: AIThinkingStep[];
  startTime?: number;
  endTime?: number;
}

export interface AIThinkingStep {
  id: string;
  type: string;
  title: string;
  content: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  timestamp: number;
  duration?: number;
}

export interface OnboardingState {
  isComplete: boolean;
  currentStep: string;
  completedSteps: string[];
  totalXP: number;
  level: number;
  showWizard: boolean;
}

export interface Preferences {
  theme: 'dark' | 'light' | 'system';
  language: string;
  reducedMotion: boolean;
  soundEnabled: boolean;
  autoSave: boolean;
  telemetry: boolean;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface AethelState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  wallet: WalletState | null;
  aiSession: AISession;
  onboarding: OnboardingState;
  preferences: Preferences;
  wsConnected: boolean;
  notifications: Notification[];
}

export interface RealtimeMessage {
  type?: string;
  balance?: number;
  step?: AIThinkingStep;
  stepId?: string;
  updates?: Partial<AIThinkingStep>;
  result?: unknown;
  notification?: Notification;
}

export type AethelAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_WALLET'; payload: Partial<WalletState> }
  | { type: 'START_AI_SESSION'; payload: { id: string; prompt: string } }
  | { type: 'ADD_AI_STEP'; payload: AIThinkingStep }
  | { type: 'UPDATE_AI_STEP'; payload: { stepId: string; updates: Partial<AIThinkingStep> } }
  | { type: 'COMPLETE_AI_SESSION'; payload: { result?: unknown } }
  | { type: 'UPDATE_ONBOARDING'; payload: Partial<OnboardingState> }
  | { type: 'SET_PREFERENCES'; payload: Partial<Preferences> }
  | { type: 'SET_WS_CONNECTED'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' };

export interface AethelContextValue {
  state: AethelState;
  dispatch: React.Dispatch<AethelAction>;
  updateWallet: (data: Partial<WalletState>) => void;
  startAISession: (prompt: string) => string;
  completeOnboardingStep: (step: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  showNotification: (type: Notification['type'], title: string, message: string) => void;
  refreshWallet: () => void;
}
