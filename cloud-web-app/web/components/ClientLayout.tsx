'use client';

import { useEffect, Suspense } from 'react';
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

export default function ClientLayout({ children }: ClientLayoutProps) {
  useEffect(() => {
    // Initialize design system CSS custom properties
    createCSSCustomProperties();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <ErrorBoundaryProvider>
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
                      </Suspense>
                    </OnboardingProvider>
                  </AethelProvider>
                </DevToolsProvider>
              </CommandRegistryProvider>
            </SessionTrackerProvider>
          </A11yProvider>
        </ErrorBoundaryProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}