'use client'

import type { ComponentProps } from 'react'
import { Suspense, useMemo, useState } from 'react'
import { Code, LayoutDashboard, MessageSquare } from 'lucide-react'

import type { ActiveTab, SessionFilter, ToastType } from './aethel-dashboard-model'
import { AethelDashboardSidebar } from './AethelDashboardSidebar'
import { DashboardMainContent } from './DashboardMainContent'
import { DashboardTopBar } from './DashboardTopBar'
import OnboardingWizard from '../onboarding/OnboardingWizard'
import { DashboardToast } from './DashboardToast'
import { resolveDashboardEntryLane } from './aethel-dashboard-entry-triage'
import { DashboardIntentRail } from './DashboardIntentRail'
import { MobileBottomNav } from '@/components/ui/MobileResponsiveLayout'
import { useBrowserPathname, useBrowserSearch } from '@/lib/navigation/use-browser-pathname'

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

function DashboardRoutingCopy() {
  const pathname = useBrowserPathname()
  const search = useBrowserSearch()
  const [hidden, setHidden] = useState(false)
  const searchParams = useMemo(() => new URLSearchParams(search), [search])
  const code = searchParams.get('notice')

  const copy = useMemo(() => {
    if (!code) return null
    if (code === 'labs-hidden') {
      return {
        title: 'Lab unavailable in this environment',
        body: 'Experimental routes stay hidden in production. For internal use, set NEXT_PUBLIC_SHOW_ASPIRATIONAL_ROUTES=true. Studio and /ide remain the supported paths.',
      }
    }
    if (code === 'design-demo-dev-only') {
      return {
        title: 'Design system demo',
        body: 'This route is only available in development. In production, use the --aethel-* tokens in real applications.',
      }
    }
    return {
      title: 'Redirected',
      body: 'You were routed back to the dashboard.',
    }
  }, [code])

  const dismiss = () => {
    setHidden(true)
    const next = new URLSearchParams(searchParams.toString())
    next.delete('notice')
    const query = next.toString()
    if (typeof window !== 'undefined') {
      const nextUrl = query ? `${pathname}?${query}` : pathname
      window.history.replaceState(window.history.state, '', nextUrl)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  if (hidden || !copy || !code) {
    return { routingTitle: null as string | null, routingBody: null as string | null, onDismissRouting: undefined as (() => void) | undefined }
  }
  return { routingTitle: copy.title, routingBody: copy.body, onDismissRouting: dismiss }
}

function DashboardIntentRailHost(props: {
  entryMission?: string | null
  entrySource?: string | null
  entryLaneLabel?: string
  entryLaneDescription?: string
  authErrorText?: string | null
  billingErrorText?: string | null
  trialDaysLeft?: number | null
  onResumeEntryMission?: () => void
  onDismissEntryIntent?: () => void
  onDismissTrial?: () => void
}) {
  const routing = DashboardRoutingCopy()
  return (
    <DashboardIntentRail
      {...props}
      routingTitle={routing.routingTitle}
      routingBody={routing.routingBody}
      onDismissRouting={routing.onDismissRouting}
    />
  )
}

export function DashboardShell({
  theme,
  isTrialActive,
  showTrialBanner,
  trialDaysLeft,
  onDismissTrialBanner,
  onUpgradeTrial: _onUpgradeTrial,
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
  void theme
  void _onUpgradeTrial

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

      {/* 7A.3 — single intent rail (no stacked Trial/Alert/Entry/Routing banners) */}
      <Suspense fallback={null}>
        <DashboardIntentRailHost
          entryMission={entryMission}
          entrySource={entrySource}
          entryLaneLabel={entryLane.label}
          entryLaneDescription={entryLane.description}
          authErrorText={authErrorText}
          billingErrorText={billingErrorText}
          trialDaysLeft={isTrialActive && showTrialBanner ? trialDaysLeft : null}
          onResumeEntryMission={onResumeEntryMission}
          onDismissEntryIntent={onDismissEntryIntent}
          onDismissTrial={onDismissTrialBanner}
        />
      </Suspense>

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
          { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
          { href: '/ide', label: 'IDE', icon: Code },
          { href: '/chat', label: 'Chat', icon: MessageSquare },
        ]}
      />

      {toast ? <DashboardToast message={toast.message} type={toast.type} /> : null}
    </div>
  )
}
