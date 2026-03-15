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
import { ToastProvider } from '@/components/ui/Toast'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05060a]/88 backdrop-blur-xl">
      <div className="flex min-w-[260px] flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/20 bg-gradient-to-br from-indigo-500/20 via-slate-900 to-sky-500/10">
          <div className="h-9 w-9 rounded-xl border-2 border-sky-400/80 border-t-transparent animate-spin" />
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),transparent_60%)]" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-slate-100">Inicializando studio</p>
          <p className="text-xs text-slate-400">Carregando runtime, comandos e contexto do Aethel.</p>
        </div>
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
      <ToastProvider>
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
      </ToastProvider>
    </I18nextProvider>
  );
}
