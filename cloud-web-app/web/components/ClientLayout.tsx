'use client';

import { useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
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

// Hook para registrar comandos padrao no layout
function DefaultCommandsRegistration() {
  useDefaultCommands();
  return null;
}

interface ClientLayoutProps {
  children: React.ReactNode;
}

// Loading fallback para componentes assincronos
function LoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-xl">
      <div className="flex min-w-[260px] flex-col items-center gap-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_4%,transparent)] px-8 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] via-[var(--aethel-surface-secondary)] to-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]">
          <div className="h-9 w-9 rounded-xl border-2 border-[color-mix(in_srgb,var(--aethel-info)_80%,transparent)] border-t-transparent animate-spin" />
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--aethel-primary)_22%,transparent),transparent_60%)]" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Inicializando studio</p>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Carregando runtime, comandos e contexto do Aethel.</p>
        </div>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize design system CSS custom properties
    createCSSCustomProperties();
  }, []);

  const isStudioSurface = Boolean(pathname && /^\/(dashboard|ide|admin|billing|settings|profile|nexus|projects|workspace)(\/|$)/.test(pathname));

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <ErrorBoundaryProvider>
          <A11yProvider>
            <SessionTrackerProvider>
              <CommandRegistryProvider>
                <DevToolsProvider>
                  <AethelProvider>
                    <OnboardingProvider enabled={isStudioSurface}>
                      <DefaultCommandsRegistration />
                      <Suspense fallback={<LoadingFallback />}>
                        {children}

                        {/* Componentes globais de UI */}
                        {isStudioSurface ? (
                          <>
                            <WelcomeModal />
                            <OnboardingChecklist />
                            <LowBalanceModalAuto />
                            <AISuggestionBubbleAuto />
                          </>
                        ) : null}
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
