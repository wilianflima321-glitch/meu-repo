'use client';

import { useEffect, Suspense, useState, useCallback } from 'react';
import { createCSSCustomProperties } from '../lib/design-system';
import { I18nextProvider } from 'react-i18next'
import i18n from '../lib/i18n'
import { AuthProvider } from '../contexts/AuthContext'
import { ErrorBoundaryProvider } from './error/ErrorBoundary'
import { A11yProvider } from '../lib/a11y/accessibility'
import { SessionTrackerProvider } from '@/lib/hooks/use-session-tracker'
import { OnboardingProvider, WelcomeModal, OnboardingChecklist } from './Onboarding'
import { AethelProvider } from '@/lib/providers/AethelProvider'
import { LowBalanceModalAuto } from './billing/LowBalanceModal'
import { AISuggestionBubbleAuto } from './ai/AISuggestionBubble'
import { CommandRegistryProvider, useDefaultCommands } from '@/lib/commands/command-registry'
import { DevToolsProvider } from '@/lib/debug/devtools-provider'
import CommandPaletteUnified from './CommandPaletteUnified'
import { ToastProvider } from './ui/Toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a stable QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Hook para registrar comandos padrão no layout
function DefaultCommandsRegistration() {
  useDefaultCommands();
  return null;
}

interface ClientLayoutProps {
  children: React.ReactNode;
}

// Loading fallback para componentes assíncronos
function LoadingFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400">Carregando Aethel Engine...</span>
      </div>
    </div>
  );
}

// Global Command Palette wrapper with keyboard shortcut
function GlobalCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+P or Cmd+Shift+P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setIsOpen(true);
      }
      // Also support Ctrl+P / Cmd+P for quick open
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <CommandPaletteUnified
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  useEffect(() => {
    // Initialize design system CSS custom properties
    createCSSCustomProperties();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <ErrorBoundaryProvider>
            <ToastProvider>
              <A11yProvider>
                <SessionTrackerProvider>
                  <CommandRegistryProvider>
                    <DevToolsProvider>
                      <AethelProvider>
                        <OnboardingProvider>
                          <DefaultCommandsRegistration />
                          <Suspense fallback={<LoadingFallback />}>
                            {children}
                            
                            {/* Componentes globais de UI */}
                            <WelcomeModal />
                            <OnboardingChecklist />
                            <LowBalanceModalAuto />
                            <AISuggestionBubbleAuto />
                            <GlobalCommandPalette />
                          </Suspense>
                        </OnboardingProvider>
                      </AethelProvider>
                    </DevToolsProvider>
                  </CommandRegistryProvider>
                </SessionTrackerProvider>
              </A11yProvider>
            </ToastProvider>
          </ErrorBoundaryProvider>
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}