'use client'

import type { ComponentProps } from 'react'
import { Code, LayoutDashboard, MessageSquare } from 'lucide-react'

import type { ActiveTab, SessionFilter, ToastType } from './aethel-dashboard-model'
import { TrialBanner } from './TrialBanner'
import { AethelDashboardSidebar } from './AethelDashboardSidebar'
import { DashboardMainContent } from './DashboardMainContent'
import { DashboardTopBar } from './DashboardTopBar'
import OnboardingWizard from '../onboarding/OnboardingWizard'
import { DashboardToast } from './DashboardToast'
import { DashboardRoutingNotice } from './DashboardRoutingNotice'
import { resolveDashboardEntryLane } from './aethel-dashboard-entry-triage'
import { DashboardAlertBanners } from './DashboardAlertBanners'
import { DashboardEntryIntentBanner } from './DashboardEntryIntentBanner'
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
  const entryLane = resolveDashboardEntryLane(entrySource)

  return (
    <div
      className={`relative flex min-h-screen flex-col overflow-hidden ${
        'bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_8%,transparent)]" />
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--aethel-surface-secondary)] focus:px-3 focus:py-2 focus:text-[var(--aethel-text-primary)] focus:ring-2 focus:ring-[var(--aethel-primary)]"
      >
        Skip to dashboard content
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

      <DashboardTopBar
        theme={theme}
        sidebarOpen={sidebarOpen}
        backendOnline={backendOnline}
        aiProviderConfigured={aiProviderConfigured}
        fullAccessActive={fullAccessActive}
        fullAccessExpiresAt={fullAccessExpiresAt}
        fullAccessBusy={fullAccessBusy}
        onToggleSidebar={onToggleSidebar}
        onResetDashboard={onResetDashboard}
        onToggleTheme={onToggleTheme}
        onOpenProviderSettings={onOpenProviderSettings}
        onToggleFullAccess={onToggleFullAccess}
        onOpenIde={onOpenIde}
      />

      <DashboardAlertBanners 
        authErrorText={authErrorText} 
        billingErrorText={billingErrorText} 
      />

      <DashboardEntryIntentBanner
        entryMission={entryMission}
        entrySource={entrySource}
        entryLaneLabel={entryLane.label}
        entryLaneDescription={entryLane.description}
        onResumeEntryMission={onResumeEntryMission}
        onDismissEntryIntent={onDismissEntryIntent}
      />

      <div className="relative z-10 flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar menu"
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
          { href: '/dashboard', label: 'Home', icon: LayoutDashboard, matchPaths: ['/dashboard'] },
          { href: '/ide', label: 'Studio', icon: Code, matchPaths: ['/ide'] },
          { href: '/ide?panel=agents', label: 'Agents', icon: MessageSquare, matchPaths: ['/ide'] },
        ]}
      />

      {toast ? <DashboardToast message={toast.message} type={toast.type} /> : null}
    </div>
  )
}
