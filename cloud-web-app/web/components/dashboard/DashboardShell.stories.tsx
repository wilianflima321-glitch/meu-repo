import type { Meta, StoryObj } from '@storybook/react'
import { DashboardShell } from './DashboardShell'

const noop = () => {}
const noopAsync = async () => {}

const projects = [
  { id: 1, name: 'Acme Workspace', type: 'web', status: 'active', settings: null },
]

const firstValueSessionSummary = {
  startedAt: null,
  completedAt: null,
  durationMs: null,
  targetMs: 90_000,
  status: 'in_progress' as const,
  milestones: {
    firstProjectCreatedAt: null,
    firstAiSuccessAt: null,
    firstIdeOpenedAt: null,
  },
}

const overviewProps: Parameters<typeof DashboardShell>[0]['dashboardMainProps']['overviewProps'] = {
  aiActivity: 'Agent lane ready for the active workspace.',
  projects,
  livePreviewSuggestions: ['Tighten the hero copy', 'Add a review receipt'],
  authReady: true,
  hasToken: true,
  backendOnline: true,
  aiProviderConfigured: true,
  currentPlanName: 'Pro',
  onOpenProjects: noop,
  onOpenAiChat: noop,
  onOpenIde: noop,
  onOpenBilling: noop,
  onRefreshWallet: noop,
  lastWalletUpdate: null,
  walletLoading: false,
  walletError: null,
  walletData: undefined,
  walletTransactions: [],
  formatCurrencyLabel: (currency?: string | null) => currency ?? 'credits',
  connectivityData: undefined,
  connectivityLoading: false,
  connectivityError: null,
  connectivityServices: [],
  formatConnectivityStatus: (status?: string | null) => status ?? 'not configured',
  miniPreviewExpanded: false,
  onToggleMiniPreviewExpanded: noop,
  onMagicWandSelect: noop,
  onSendSuggestion: noopAsync,
  isGenerating: false,
}

const projectsProps: Parameters<typeof DashboardShell>[0]['dashboardMainProps']['projectsProps'] = {
  projects,
  newProjectName: 'New workspace',
  newProjectType: 'web',
  entryMission: null,
  onDeleteProject: noop,
  onCreateProject: noop,
  onProjectNameChange: noop,
  onProjectTypeChange: noop,
  onApplyDirectorNote: noop,
  onOpenAiChat: noop,
  onOpenIde: noop,
}

const dashboardMainPropsStub: Parameters<typeof DashboardShell>[0]['dashboardMainProps'] = {
  activeTab: 'overview',
  showFirstValueGuide: false,
  firstProjectCreated: true,
  firstValueAiSuccess: true,
  firstValueOpenedIde: false,
  firstValueSessionSummary,
  onFirstValueStartTemplate: noop,
  onFirstValueCreateProject: noop,
  onFirstValueConfigureAI: noop,
  onFirstValueOpenAIChat: noop,
  onFirstValueOpenIdePreview: noop,
  onFirstValueDismiss: noop,
  overviewProps,
  projectsProps,
}

const baseArgs: Parameters<typeof DashboardShell>[0] = {
  theme: 'dark',
  isTrialActive: false,
  showTrialBanner: false,
  trialDaysLeft: 0,
  onDismissTrialBanner: noop,
  onUpgradeTrial: noop,
  sidebarOpen: true,
  activeTab: 'overview',
  sessionFilter: 'all',
  onToggleSidebar: noop,
  onCloseSidebar: noop,
  onResetDashboard: noop,
  onToggleTheme: noop,
  backendOnline: true,
  aiProviderConfigured: true,
  onOpenProviderSettings: noop,
  fullAccessActive: false,
  onToggleFullAccess: noop,
  onOpenIde: noop,
  onCreateNewSession: noop,
  onSelectSessionFilter: noop,
  onSelectTab: noop,
  showOnboardingWizard: false,
  onOnboardingComplete: noop,
  onOnboardingSkip: noop,
  dashboardMainProps: dashboardMainPropsStub,
}

const meta = {
  title: 'Shells/DashboardShell',
  component: DashboardShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Canonical dashboard shell. Keeps primary navigation to Overview, Projects, and Activity while secondary flows live in their dedicated product areas.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', width: '100vw' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DashboardShell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Default authenticated',
  args: baseArgs,
}

export const TrialActive: Story = {
  name: 'Trial active',
  args: {
    ...baseArgs,
    isTrialActive: true,
    showTrialBanner: true,
    trialDaysLeft: 7,
  },
}

export const OnboardingOpen: Story = {
  name: 'Onboarding wizard',
  args: {
    ...baseArgs,
    showOnboardingWizard: true,
  },
}

export const ProviderNotConfigured: Story = {
  name: 'Provider not configured',
  args: {
    ...baseArgs,
    aiProviderConfigured: false,
    dashboardMainProps: {
      ...dashboardMainPropsStub,
      overviewProps: {
        ...overviewProps,
        aiProviderConfigured: false,
      },
    },
  },
}

export const BackendOffline: Story = {
  name: 'Backend offline',
  args: {
    ...baseArgs,
    backendOnline: false,
    aiProviderConfigured: false,
    dashboardMainProps: {
      ...dashboardMainPropsStub,
      overviewProps: {
        ...overviewProps,
        backendOnline: false,
        aiProviderConfigured: false,
      },
    },
  },
}
