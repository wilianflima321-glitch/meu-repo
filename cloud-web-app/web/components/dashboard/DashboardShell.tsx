'use client'

import type { ComponentProps } from 'react'
import { Code, CreditCard, LayoutDashboard, MessageSquare, Settings } from 'lucide-react'

import type { ActiveTab, SessionFilter, ToastType } from './aethel-dashboard-model'
import { TrialBanner } from './TrialBanner'
import StudioGlobalNav from '../studio/StudioGlobalNav'
import StudioActionRail from '../studio/StudioActionRail'
import { AethelDashboardSidebar } from './AethelDashboardSidebar'
import { DashboardMainContent } from './DashboardMainContent'
import OnboardingWizard from '../onboarding/OnboardingWizard'
import { DashboardToast } from './DashboardToast'
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
  showOnboardingWizard,
  onOnboardingComplete,
  onOnboardingSkip,
  dashboardMainProps,
  toast,
}: DashboardShellProps) {
  return (
    <div
      className={`relative min-h-screen aethel-flex flex-column overflow-hidden ${
        theme === 'dark' ? 'bg-slate-950 text-slate-50' : 'bg-slate-100 text-slate-900'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_28%),linear-gradient(180deg,transparent,rgba(2,6,23,0.18))]" />
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-white focus:ring-2 focus:ring-blue-500"
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
          <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-slate-200">
            {authErrorText && (
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs text-rose-200">
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

      <div className="relative z-10 aethel-flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Fechar menu lateral"
            className="fixed inset-0 z-40 bg-slate-950/70 md:hidden"
            onClick={onCloseSidebar}
          />
        )}

        <AethelDashboardSidebar
          sidebarOpen={sidebarOpen}
          activeTab={activeTab}
          sessionFilter={sessionFilter}
          onCreateNewSession={onCreateNewSession}
          onSelectSessionFilter={onSelectSessionFilter}
          onSelectTab={onSelectTab}
          onCloseMobile={onCloseSidebar}
        />
        <main id="dashboard-main-content" className="flex-1 overflow-y-auto relative has-mobile-nav">
          {showOnboardingWizard ? (
            <div className="aethel-p-6">
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
