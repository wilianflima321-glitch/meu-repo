'use client';

import { useCallback } from 'react';
import { useAethel } from './aethel-provider.context';
import type { Preferences } from './aethel-provider.contracts';

export { useAethel } from './aethel-provider.context';

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
