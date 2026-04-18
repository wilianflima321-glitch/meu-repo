'use client'

import type { ComponentProps } from 'react'
import { Code, CreditCard, LayoutDashboard, MessageSquare, Settings } from 'lucide-react'

import type { ActiveTab, SessionFilter, ToastType } from './aethel-dashboard-model'
import { TrialBanner } from './TrialBanner'
import StudioGlobalNav from '../studio/StudioGlobalNav'
import StudioActionRail from '../studio/StudioActionRail'
import { AethelDashboardSidebar } from './AethelDashboardSidebar'
import { DashboardFlowRail } from './DashboardFlowRail'
import { DashboardMainContent } from './DashboardMainContent'
import OnboardingWizard from '../onboarding/OnboardingWizard'
import { DashboardToast } from './DashboardToast'
import { DashboardRoutingNotice } from './DashboardRoutingNotice'
import { MobileBottomNav } from '@/components/ui/MobileResponsiveLayout'

type OnboardingCompleteHandler = ComponentProps<typeof OnboardingWizard>['onComplete']
type OnboardingSkipHandler = ComponentProps<typeof OnboardingWizard>['onSkip']

export type DashboardShellProps = {
  theme: 'dark' | 'light'
  isTrialActive: boolean
  showTrialBanner: boolean
  trialDaysLeft: number
  onDismissTrialBanner: () => void
  onUpgradeTrial: () => void
  authErrorText?: string | null
  billingErrorText?: string | null
  sidebarOpen: boolean
  activeTab: ActiveTab
  sessionFilter: SessionFilter
  onToggleSidebar: () => void
  onCloseSidebar: () => void
  onResetDashboard: () => void
  onToggleTheme: () => void
  backendOnline: boolean
  aiProviderConfigured: boolean
  onOpenProviderSettings: () => void
  fullAccessActive: boolean
  fullAccessExpiresAt?: string | null
  fullAccessBusy?: boolean
  onToggleFullAccess: () => void
  onOpenIde: () => void
  onCreateNewSession: () => void
  onSelectSessionFilter: (filter: SessionFilter) => void
  onSelectTab: (tab: ActiveTab) => void
  entryMission?: string | null
  entrySource?: string | null
  onResumeEntryMission?: () => void
  onDismissEntryIntent?: () => void
  showOnboardingWizard: boolean
  onOnboardingComplete: OnboardingCompleteHandler
  onOnboardingSkip: OnboardingSkipHandler
  dashboardMainProps: ComponentProps<typeof DashboardMainContent>
  toast?: { message: string; type: ToastType } | null
}

export function DashboardShell({
  theme,
  isTrialActive,
  showTrialBanner,
  trialDaysLeft,
  onDismissTrialBanner,
  onUpgradeTrial,
  authErrorText,
  billingErrorText,
  sidebarOpen,
  activeTab,
  sessionFilter,
  onToggleSidebar,
  onCloseSidebar,
  onResetDashboard,
  onToggleTheme,
  backendOnline,
  aiProviderConfigured,
  onOpenProviderSettings,
  fullAccessActive,
  fullAccessExpiresAt,
  fullAccessBusy,
  onToggleFullAccess,
  onOpenIde,
  onCreateNewSession,
  onSelectSessionFilter,
  onSelectTab,
  entryMission,
  entrySource,
  onResumeEntryMission,
  onDismissEntryIntent,
  showOnboardingWizard,
  onOnboardingComplete,
  onOnboardingSkip,
  dashboardMainProps,
  toast,
}: DashboardShellProps) {
  return (
    <div
      className={`relative flex min-h-screen flex-col overflow-hidden ${
 'bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]'
 }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_28%),linear-gradient(180deg,transparent,rgba(2,6,23,0.18))]" />
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--aethel-surface-secondary)] focus:px-3 focus:py-2 focus:text-[var(--aethel-text-primary)] focus:ring-2 focus:ring-[var(--aethel-primary)]"
      >
        Pular para o conteudo do dashboard
      </a>
      <div className="sr-only" role="status" aria-live="polite" />
      {isTrialActive && showTrialBanner && (
        <TrialBanner
          trialDaysLeft={trialDaysLeft}
          onDismiss={onDismissTrialBanner}
          onUpgrade={onUpgradeTrial}
        />
      )}

      <DashboardRoutingNotice />

      <StudioGlobalNav
        title="Studio Home"
        subtitle="Operacao, IA, preview e billing no mesmo shell."
        rightSlot={
          <StudioActionRail
            sidebarOpen={sidebarOpen}
            onToggleSidebar={onToggleSidebar}
            onResetDashboard={onResetDashboard}
            onToggleTheme={onToggleTheme}
            theme={theme}
            backendOnline={backendOnline}
            aiProviderConfigured={aiProviderConfigured}
            onOpenProviderSettings={onOpenProviderSettings}
            fullAccessActive={fullAccessActive}
            fullAccessExpiresAt={fullAccessExpiresAt}
            fullAccessBusy={fullAccessBusy}
            onToggleFullAccess={onToggleFullAccess}
            onOpenIde={onOpenIde}
          />
        }
      />

      {(authErrorText || billingErrorText) && (
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
          <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3 text-xs text-[var(--aethel-text-secondary)]">
            {authErrorText && (
              <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-1 text-xs text-[var(--aethel-error-light)]">
                Auth: {authErrorText}
              </span>
            )}
            {billingErrorText && (
              <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-1 text-xs text-[var(--aethel-warning-light)]">
                Billing: {billingErrorText}
              </span>
            )}
          </div>
        </div>
      )}

      {(entryMission || entrySource) && (
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
          <div className="flex flex-col gap-3 rounded-[24px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.9),rgba(14,165,233,0.08))] px-4 py-4 shadow-[0_20px_60px_rgba(2,6,23,0.28)] md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info)]">
                  Fluxo principal
                </span>
                {entrySource ? (
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
                    origem {entrySource}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-2 text-base font-semibold text-[var(--aethel-text-primary)] sm:text-lg">
                Continue a missao sem trocar de produto no meio do caminho.
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
                {entryMission
                  ? entryMission
                  : 'Entre, refine o contexto no AI Chat e siga para preview e IDE com o mesmo handoff.'}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {onResumeEntryMission ? (
                <button
                  type="button"
                  onClick={onResumeEntryMission}
                  className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_14px_32px_rgba(56,189,248,0.24)] transition hover:brightness-110"
                >
                  Retomar no AI Chat
                </button>
              ) : null}
              {onDismissEntryIntent ? (
                <button
                  type="button"
                  onClick={onDismissEntryIntent}
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-primary)]"
                >
                  Ocultar contexto
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <DashboardFlowRail
        activeTab={activeTab}
        entryMission={entryMission}
        onSelectTab={onSelectTab}
        onOpenIde={onOpenIde}
      />

      <div className="relative z-10 flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Fechar menu lateral"
            className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] md:hidden"
            onClick={onCloseSidebar}
          />
        )}

        <AethelDashboardSidebar
          sidebarOpen={sidebarOpen}
          activeTab={activeTab}
          sessionFilter={sessionFilter}
          entryMission={entryMission}
          onCreateNewSession={onCreateNewSession}
          onSelectSessionFilter={onSelectSessionFilter}
          onSelectTab={onSelectTab}
          onOpenIde={onOpenIde}
          onCloseMobile={onCloseSidebar}
        />
        <main id="dashboard-main-content" className="flex-1 overflow-y-auto relative has-mobile-nav">
          {showOnboardingWizard ? (
            <div className="p-6">
              <OnboardingWizard onComplete={onOnboardingComplete} onSkip={onOnboardingSkip} />
            </div>
          ) : (
            <DashboardMainContent {...dashboardMainProps} />
          )}
        </main>
      </div>

      <MobileBottomNav
        items={[
          { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, matchPaths: ['/dashboard'] },
          { href: '/ide', label: 'IDE', icon: Code, matchPaths: ['/ide'] },
          { href: '/dashboard?tab=ai-chat', label: 'Chat', icon: MessageSquare, matchPaths: [] },
          { href: '/billing', label: 'Faturamento', icon: CreditCard, matchPaths: ['/billing'] },
          { href: '/settings', label: 'Ajustes', icon: Settings, matchPaths: ['/settings'] },
        ]}
      />

      {toast ? <DashboardToast message={toast.message} type={toast.type} /> : null}
    </div>
  )
}
