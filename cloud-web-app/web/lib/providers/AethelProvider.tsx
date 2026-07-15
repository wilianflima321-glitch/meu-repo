'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import useSWR from 'swr';
import { AethelContext } from './aethel-provider.context';
import type {
  AethelContextValue,
  AIThinkingStep,
  Notification,
  Preferences,
  RealtimeMessage,
  User,
  WalletState,
} from './aethel-provider.contracts';
import { getNextStep, getPlanLabel, getPlanLimit, initialState } from './aethel-provider.defaults';
import { aethelReducer } from './aethel-provider.reducer';

export type {
  AethelAction,
  AethelContextValue,
  AethelState,
  AISession,
  AIThinkingStep,
  Notification,
  OnboardingState,
  Preferences,
  RealtimeMessage,
  User,
  WalletState,
} from './aethel-provider.contracts';
export {
  useAethel,
  useAISession,
  useNotifications,
  useOnboarding,
  usePreferences,
  useUser,
  useWallet,
} from './aethel-provider.hooks';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface AethelProviderProps {
  children: ReactNode;
  runtimeReady?: boolean;
}

export function AethelProvider({ children, runtimeReady = true }: AethelProviderProps) {
  const [state, dispatch] = useReducer(aethelReducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const isBrowser = typeof window !== 'undefined';
  const allowRuntimeFetch = isBrowser && runtimeReady;

  // Fetch authenticated user (JWT-only, no server sessions)
  const { data: userData } = useSWR(allowRuntimeFetch ? '/api/auth/me' : null, fetcher, {
    revalidateOnFocus: false,
  });

  // Fetch wallet data
  const { data: walletData, mutate: mutateWallet } = useSWR(
    allowRuntimeFetch && state.isAuthenticated ? '/api/wallet/summary' : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Fetch onboarding status
  const { data: onboardingData } = useSWR(
    allowRuntimeFetch && state.isAuthenticated ? '/api/onboarding' : null,
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

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    localStorage.setItem('aethel_preferences', JSON.stringify(state.preferences));
  }, [state.preferences, isBrowser]);

  // Update user from auth endpoint (supports both shapes)
  useEffect(() => {
    if (userData === undefined) return;

    if (userData?.authenticated === false || userData?.user === null) {
      dispatch({ type: 'SET_USER', payload: null });
      return;
    }

    const rawUser = userData?.user ?? userData;
    if (rawUser?.id) {
      dispatch({ type: 'SET_USER', payload: rawUser });
      return;
    }

    dispatch({ type: 'SET_USER', payload: null });
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

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: RealtimeMessage) => {
    switch (data.type) {
      case 'BALANCE_UPDATED':
        if (typeof data.balance === 'number') {
          dispatch({
            type: 'UPDATE_WALLET',
            payload: {
              balance: data.balance,
              lowBalanceWarning: data.balance < 100,
            },
          });
        }
        break;

      case 'AI_STEP_START':
        if (data.step) {
          dispatch({ type: 'ADD_AI_STEP', payload: data.step });
        }
        break;

      case 'AI_STEP_UPDATE':
        if (data.stepId && data.updates) {
          dispatch({
            type: 'UPDATE_AI_STEP',
            payload: { stepId: data.stepId, updates: data.updates },
          });
        }
        break;

      case 'AI_SESSION_COMPLETE':
        dispatch({ type: 'COMPLETE_AI_SESSION', payload: { result: data.result } });
        break;

      case 'NOTIFICATION':
        if (data.notification) {
          dispatch({ type: 'ADD_NOTIFICATION', payload: data.notification });
        }
        break;
    }
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!runtimeReady || !state.isAuthenticated) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    
    try {
      wsRef.current = new WebSocket(`${wsUrl}/realtime`);
      
      wsRef.current.onopen = () => {
        dispatch({ type: 'SET_WS_CONNECTED', payload: true });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RealtimeMessage;
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
  }, [runtimeReady, state.isAuthenticated, handleWebSocketMessage]);

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

export default AethelProvider;
