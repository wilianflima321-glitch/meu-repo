/**
 * AethelProvider - Provider Centralizado do Aethel Engine
 * 
 * Gerencia estado global da aplicação:
 * - Autenticação e usuário
 * - Wallet e billing
 * - AI sessions e thinking
 * - Onboarding progress
 * - WebSocket connections
 * - Theme e preferences
 * 
 * @module lib/providers/AethelProvider
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useEffect, 
  useCallback,
  useMemo,
  useRef,
  type ReactNode 
} from 'react';
import useSWR from 'swr';

// ============================================================================
// TYPES
// ============================================================================

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

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

type AethelAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_WALLET'; payload: Partial<WalletState> }
  | { type: 'START_AI_SESSION'; payload: { id: string; prompt: string } }
  | { type: 'ADD_AI_STEP'; payload: AIThinkingStep }
  | { type: 'UPDATE_AI_STEP'; payload: { stepId: string; updates: Partial<AIThinkingStep> } }
  | { type: 'COMPLETE_AI_SESSION'; payload: { result?: any } }
  | { type: 'UPDATE_ONBOARDING'; payload: Partial<OnboardingState> }
  | { type: 'SET_PREFERENCES'; payload: Partial<Preferences> }
  | { type: 'SET_WS_CONNECTED'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' };

// ============================================================================
// INITIAL STATE
// ============================================================================

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  language: 'pt-BR',
  reducedMotion: false,
  soundEnabled: true,
  autoSave: true,
  telemetry: true,
};

const initialState: AethelState = {
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

// ============================================================================
// REDUCER
// ============================================================================

function aethelReducer(state: AethelState, action: AethelAction): AethelState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'UPDATE_WALLET':
      return {
        ...state,
        wallet: state.wallet 
          ? { ...state.wallet, ...action.payload }
          : action.payload as WalletState,
      };

    case 'START_AI_SESSION':
      return {
        ...state,
        aiSession: {
          id: action.payload.id,
          status: 'thinking',
          prompt: action.payload.prompt,
          steps: [],
          startTime: Date.now(),
        },
      };

    case 'ADD_AI_STEP':
      return {
        ...state,
        aiSession: {
          ...state.aiSession,
          steps: [...state.aiSession.steps, action.payload],
        },
      };

    case 'UPDATE_AI_STEP':
      return {
        ...state,
        aiSession: {
          ...state.aiSession,
          steps: state.aiSession.steps.map(step =>
            step.id === action.payload.stepId
              ? { ...step, ...action.payload.updates }
              : step
          ),
        },
      };

    case 'COMPLETE_AI_SESSION':
      return {
        ...state,
        aiSession: {
          ...state.aiSession,
          status: 'complete',
          endTime: Date.now(),
        },
      };

    case 'UPDATE_ONBOARDING':
      return {
        ...state,
        onboarding: { ...state.onboarding, ...action.payload },
      };

    case 'SET_PREFERENCES':
      const newPrefs = { ...state.preferences, ...action.payload };
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('aethel_preferences', JSON.stringify(newPrefs));
      }
      return { ...state, preferences: newPrefs };

    case 'SET_WS_CONNECTED':
      return { ...state, wsConnected: action.payload };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50),
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };

    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface AethelContextValue {
  state: AethelState;
  dispatch: React.Dispatch<AethelAction>;
  // Convenience methods
  updateWallet: (data: Partial<WalletState>) => void;
  startAISession: (prompt: string) => string;
  completeOnboardingStep: (step: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  showNotification: (type: Notification['type'], title: string, message: string) => void;
  refreshWallet: () => void;
}

const AethelContext = createContext<AethelContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface AethelProviderProps {
  children: ReactNode;
}

export function AethelProvider({ children }: AethelProviderProps) {
  const [state, dispatch] = useReducer(aethelReducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch user session
  const { data: userData } = useSWR('/api/auth/session', fetcher, {
    revalidateOnFocus: false,
  });

  // Fetch wallet data
  const { data: walletData, mutate: mutateWallet } = useSWR(
    state.isAuthenticated ? '/api/wallet/summary' : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Fetch onboarding status
  const { data: onboardingData } = useSWR(
    state.isAuthenticated ? '/api/onboarding' : null,
    fetcher
  );

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aethel_preferences');
      if (stored) {
        try {
          const prefs = JSON.parse(stored);
          dispatch({ type: 'SET_PREFERENCES', payload: prefs });
        } catch {
          // Invalid stored prefs
        }
      }

      // Check if first run
      const hasCompletedOnboarding = localStorage.getItem('aethel_onboarding_complete');
      if (!hasCompletedOnboarding) {
        dispatch({ type: 'UPDATE_ONBOARDING', payload: { showWizard: true } });
      }
    }
  }, []);

  // Update user from session
  useEffect(() => {
    if (userData?.user) {
      dispatch({ type: 'SET_USER', payload: userData.user });
    } else if (userData === null) {
      dispatch({ type: 'SET_USER', payload: null });
    }
  }, [userData]);

  // Update wallet state
  useEffect(() => {
    if (walletData) {
      const balance = walletData.balance || 0;
      dispatch({
        type: 'UPDATE_WALLET',
        payload: {
          balance,
          reserved: 0,
          plan: state.user?.plan || 'free',
          planLabel: getPlanLabel(state.user?.plan || 'free'),
          monthlyUsage: 0,
          monthlyLimit: getPlanLimit(state.user?.plan || 'free'),
          lowBalanceWarning: balance < 100,
          lastUpdated: new Date().toISOString(),
        },
      });
    }
  }, [walletData, state.user?.plan]);

  // Update onboarding state
  useEffect(() => {
    if (onboardingData?.onboarding) {
      const ob = onboardingData.onboarding;
      dispatch({
        type: 'UPDATE_ONBOARDING',
        payload: {
          isComplete: ob.progressPercent >= 100,
          currentStep: ob.currentStep,
          completedSteps: ob.completedSteps,
          totalXP: ob.stats?.aiPromptsUsed * 10 || 0,
          showWizard: !ob.completedSteps?.includes('welcome'),
        },
      });
    }
  }, [onboardingData]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    
    try {
      wsRef.current = new WebSocket(`${wsUrl}/realtime`);
      
      wsRef.current.onopen = () => {
        dispatch({ type: 'SET_WS_CONNECTED', payload: true });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch {
          // Invalid message
        }
      };

      wsRef.current.onclose = () => {
        dispatch({ type: 'SET_WS_CONNECTED', payload: false });
      };

      wsRef.current.onerror = () => {
        dispatch({ type: 'SET_WS_CONNECTED', payload: false });
      };
    } catch {
      // WebSocket not available
    }

    return () => {
      wsRef.current?.close();
    };
  }, [state.isAuthenticated]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'BALANCE_UPDATED':
        dispatch({
          type: 'UPDATE_WALLET',
          payload: {
            balance: data.balance,
            lowBalanceWarning: data.balance < 100,
          },
        });
        break;

      case 'AI_STEP_START':
        dispatch({ type: 'ADD_AI_STEP', payload: data.step });
        break;

      case 'AI_STEP_UPDATE':
        dispatch({
          type: 'UPDATE_AI_STEP',
          payload: { stepId: data.stepId, updates: data.updates },
        });
        break;

      case 'AI_SESSION_COMPLETE':
        dispatch({ type: 'COMPLETE_AI_SESSION', payload: { result: data.result } });
        break;

      case 'NOTIFICATION':
        dispatch({ type: 'ADD_NOTIFICATION', payload: data.notification });
        break;
    }
  }, []);

  // Convenience methods
  const updateWallet = useCallback((data: Partial<WalletState>) => {
    dispatch({ type: 'UPDATE_WALLET', payload: data });
  }, []);

  const startAISession = useCallback((prompt: string): string => {
    const sessionId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    dispatch({ type: 'START_AI_SESSION', payload: { id: sessionId, prompt } });
    return sessionId;
  }, []);

  const completeOnboardingStep = useCallback((step: string) => {
    const newCompleted = [...state.onboarding.completedSteps, step];
    dispatch({
      type: 'UPDATE_ONBOARDING',
      payload: {
        completedSteps: newCompleted,
        currentStep: getNextStep(step),
      },
    });

    // Persist to backend
    fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_step', step }),
    });
  }, [state.onboarding.completedSteps]);

  const setTheme = useCallback((theme: 'dark' | 'light' | 'system') => {
    dispatch({ type: 'SET_PREFERENCES', payload: { theme } });
    
    // Apply theme to document
    if (typeof window !== 'undefined') {
      const resolved = theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : theme;
      document.documentElement.setAttribute('data-theme', resolved);
    }
  }, []);

  const showNotification = useCallback((
    type: Notification['type'],
    title: string,
    message: string
  ) => {
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  }, []);

  const refreshWallet = useCallback(() => {
    mutateWallet();
  }, [mutateWallet]);

  const contextValue = useMemo<AethelContextValue>(() => ({
    state,
    dispatch,
    updateWallet,
    startAISession,
    completeOnboardingStep,
    setTheme,
    showNotification,
    refreshWallet,
  }), [
    state,
    updateWallet,
    startAISession,
    completeOnboardingStep,
    setTheme,
    showNotification,
    refreshWallet,
  ]);

  return (
    <AethelContext.Provider value={contextValue}>
      {children}
    </AethelContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useAethel() {
  const context = useContext(AethelContext);
  if (!context) {
    throw new Error('useAethel must be used within AethelProvider');
  }
  return context;
}

export function useUser() {
  const { state } = useAethel();
  return { user: state.user, isAuthenticated: state.isAuthenticated, isLoading: state.isLoading };
}

export function useWallet() {
  const { state, updateWallet, refreshWallet } = useAethel();
  return { wallet: state.wallet, updateWallet, refreshWallet };
}

export function useAISession() {
  const { state, startAISession } = useAethel();
  return { session: state.aiSession, startSession: startAISession };
}

export function useOnboarding() {
  const { state, completeOnboardingStep, dispatch } = useAethel();
  
  const closeWizard = useCallback(() => {
    dispatch({ type: 'UPDATE_ONBOARDING', payload: { showWizard: false } });
    localStorage.setItem('aethel_onboarding_complete', 'true');
  }, [dispatch]);

  return {
    onboarding: state.onboarding,
    completeStep: completeOnboardingStep,
    closeWizard,
  };
}

export function usePreferences() {
  const { state, dispatch, setTheme } = useAethel();
  
  const updatePreferences = useCallback((prefs: Partial<Preferences>) => {
    dispatch({ type: 'SET_PREFERENCES', payload: prefs });
  }, [dispatch]);

  return {
    preferences: state.preferences,
    updatePreferences,
    setTheme,
  };
}

export function useNotifications() {
  const { state, dispatch, showNotification } = useAethel();

  const markRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  }, [dispatch]);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, [dispatch]);

  return {
    notifications: state.notifications,
    unreadCount: state.notifications.filter(n => !n.read).length,
    showNotification,
    markRead,
    clearAll,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };
  return labels[plan] || 'Free';
}

function getPlanLimit(plan: string): number {
  const limits: Record<string, number> = {
    free: 500,
    starter: 5000,
    pro: 50000,
    enterprise: 500000,
  };
  return limits[plan] || 500;
}

function getNextStep(current: string): string {
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

export default AethelProvider;
