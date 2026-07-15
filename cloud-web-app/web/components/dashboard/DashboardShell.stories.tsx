/**
 * DashboardShell.stories.tsx — V31 Wave B3
 *
 * Canonical dashboard shell stories.
 * Shows the 4 real states users encounter after login.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { DashboardShell } from './DashboardShell'
import type { DashboardShellProps } from './DashboardShell'

// ── Shared defaults ───────────────────────────────────────────────────────────
// These cover all required props with safe no-op values so each story
// only overrides what it actually varies.
const BASE_PROPS: DashboardShellProps = {
  theme: 'dark',
  isTrialActive: false,
  showTrialBanner: false,
  trialDaysLeft: 0,
  onDismissTrialBanner: () => {},
  onUpgradeTrial: () => {},
  authErrorText: null,
  billingErrorText: null,
  sidebarOpen: false,
  activeTab: 'overview',
  sessionFilter: 'all',
  onToggleSidebar: () => {},
  onCloseSidebar: () => {},
  onResetDashboard: () => {},
  onToggleTheme: () => {},
  backendOnline: true,
  aiProviderConfigured: true,
  onOpenProviderSettings: () => {},
  fullAccessActive: false,
  fullAccessExpiresAt: null,
  fullAccessBusy: false,
  onToggleFullAccess: () => {},
  onOpenIde: () => {},
  onCreateNewSession: () => {},
  onSelectSessionFilter: () => {},
  onSelectTab: () => {},
  entryMission: null,
  entrySource: null,
  onResumeEntryMission: undefined,
  onDismissEntryIntent: undefined,
  showOnboardingWizard: false,
  onOnboardingComplete: () => {},
  onOnboardingSkip: () => {},
  dashboardMainProps: {
    activeTab: 'overview',
    sessionFilter: 'all',
    onSelectTab: () => {},
    onSelectSessionFilter: () => {},
    onOpenIde: () => {},
    onCreateNewSession: () => {},
  } as any,
  toast: null,
}

// ── Meta ──────────────────────────────────────────────────────────────────────
const meta = {
  title: 'Shells/DashboardShell',
  component: DashboardShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**DashboardShell** — canonical post-login workspace shell.

Three visible paths: Overview, Projects, Activity. No card wall.
Props note: this shell has 35+ props because it owns all dashboard state —
consider splitting into DashboardHeader + DashboardLayout in a future wave.

V31 status: ✅ copy cleaned (no "mission"/"Studio Home") | ⚠️ prop surface too large
        `.trim(),
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DashboardShell>

export default meta
type Story = StoryObj<typeof meta>

// ── Stories ───────────────────────────────────────────────────────────────────

/**
 * Default — user lands here after login. No active trial, no errors.
 * This is the highest-traffic state.
 */
export const Default: Story = {
  name: 'Default — post-login',
  args: { ...BASE_PROPS },
}

/**
 * Trial active — user is on a free trial, N days remaining.
 * Trial banner appears at the top.
 */
export const TrialActive: Story = {
  name: 'Trial active — 7 days left',
  args: {
    ...BASE_PROPS,
    isTrialActive: true,
    showTrialBanner: true,
    trialDaysLeft: 7,
  },
}

/**
 * AI provider not configured — the most common friction point
 * after initial signup. Should show a clear, non-blocking notice.
 */
export const AIProviderMissing: Story = {
  name: 'AI provider not configured',
  args: {
    ...BASE_PROPS,
    aiProviderConfigured: false,
  },
}

/**
 * Entry context — user arrived from an agent link or notification.
 * Entry banner shows "Continue where you left off" with project context.
 */
export const EntryContext: Story = {
  name: 'Entry context — resume from notification',
  args: {
    ...BASE_PROPS,
    entryMission: 'Finish auth module refactor — 3 files changed, tests pending.',
    entrySource: 'agent',
    onResumeEntryMission: () => {},
    onDismissEntryIntent: () => {},
  },
}

/**
 * Onboarding wizard — first-time user flow.
 * The wizard takes over the main content area.
 */
export const OnboardingActive: Story = {
  name: 'Onboarding — first-time user',
  args: {
    ...BASE_PROPS,
    showOnboardingWizard: true,
  },
}

/**
 * Auth error — usually a session expiry or provider mismatch.
 * Error strip appears below topbar, does not block the UI.
 */
export const AuthError: Story = {
  name: 'Auth error — session expired',
  args: {
    ...BASE_PROPS,
    authErrorText: 'Session expired. Please sign in again.',
  },
}
