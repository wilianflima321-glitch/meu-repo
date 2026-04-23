'use client'

import type { ComponentProps } from 'react'
import dynamic from 'next/dynamic'
import { CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'

import { FirstValueGuide } from './FirstValueGuide'
import { DashboardProjectsTab } from './DashboardProjectsTab'
import { DashboardAIChatTab } from './DashboardAIChatTab'
import { DashboardWalletTab } from './DashboardWalletTab'
import { DashboardConnectivityTab } from './DashboardConnectivityTab'
import type { DashboardOverviewTabProps } from './DashboardOverviewTab'
import type { FirstValueSessionSummary } from './useFirstValueTracking'
import {
  DashboardContentCreationTab,
  DashboardUnrealTab,
  BillingTab,
  DownloadTab,
  TemplatesTab,
  UseCasesTab,
  AdminTab,
  AgentCanvasTab,
} from './dashboard-tab-loaders'
import type { ActiveTab, UseCase, WorkflowTemplate } from './aethel-dashboard-model'

type BillingTabProps = ComponentProps<typeof BillingTab>
const DashboardOverviewTab = dynamic(
  () => import('./DashboardOverviewTab').then((mod) => mod.DashboardOverviewTab),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-4 py-4 text-sm text-[var(--aethel-text-secondary)]">
        Preparando overview do studio...
      </div>
    ),
  }
)

type DashboardMainContentProps = {
  activeTab: ActiveTab
  showFirstValueGuide: boolean
  firstProjectCreated: boolean
  firstValueAiSuccess: boolean
  firstValueOpenedIde: boolean
  firstValueSessionSummary: FirstValueSessionSummary
  onFirstValueStartTemplate: (templateId: string) => void
  onFirstValueCreateProject: () => void
  onFirstValueConfigureAI: () => void
  onFirstValueOpenAIChat: () => void
  onFirstValueOpenIdePreview: () => void
  onFirstValueDismiss: () => void
  overviewProps: DashboardOverviewTabProps
  projectsProps: ComponentProps<typeof DashboardProjectsTab>
  aiChatProps: ComponentProps<typeof DashboardAIChatTab>
  walletProps: ComponentProps<typeof DashboardWalletTab>
  billingProps: BillingTabProps
  billingError: string | null
  subscribingPlan: string | null
  connectivityProps: ComponentProps<typeof DashboardConnectivityTab>
  workflowTemplates: WorkflowTemplate[]
  useCases: UseCase[]
  onDownload: (artifactId: string) => void
  onTemplateSelect: (templateId: string) => void
  onUseCaseSelect: (useCaseId: string) => void
}

export function DashboardMainContent({
  activeTab,
  showFirstValueGuide,
  firstProjectCreated,
  firstValueAiSuccess,
  firstValueOpenedIde,
  firstValueSessionSummary,
  onFirstValueStartTemplate,
  onFirstValueCreateProject,
  onFirstValueConfigureAI,
  onFirstValueOpenAIChat,
  onFirstValueOpenIdePreview,
  onFirstValueDismiss,
  overviewProps,
  projectsProps,
  aiChatProps,
  walletProps,
  billingProps,
  billingError,
  subscribingPlan,
  connectivityProps,
  workflowTemplates,
  useCases,
  onDownload,
  onTemplateSelect,
  onUseCaseSelect,
}: DashboardMainContentProps) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      {showFirstValueGuide && activeTab === 'overview' && (
        <FirstValueGuide
          firstProjectCreated={firstProjectCreated}
          firstAiSuccess={firstValueAiSuccess}
          firstIdeOpened={firstValueOpenedIde}
          sessionSummary={firstValueSessionSummary}
          onStartTemplate={onFirstValueStartTemplate}
          onCreateProject={onFirstValueCreateProject}
          onConfigureAI={onFirstValueConfigureAI}
          onOpenAIChat={onFirstValueOpenAIChat}
          onOpenIdePreview={onFirstValueOpenIdePreview}
          onDismiss={onFirstValueDismiss}
        />
      )}

      {activeTab === 'overview' && <DashboardOverviewTab {...overviewProps} />}

      {activeTab === 'projects' && <DashboardProjectsTab {...projectsProps} />}

      {activeTab === 'ai-chat' && <DashboardAIChatTab {...aiChatProps} />}

      {activeTab === 'wallet' && <DashboardWalletTab {...walletProps} />}

      {activeTab === 'billing' && (
        <div className="space-y-4">
          <BillingTab {...billingProps} />
          {billingError && (
            <div
              className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-4 py-3 text-xs text-[var(--aethel-error)]"
              role="alert"
              aria-live="polite"
            >
              <p className={`${CANONICAL_TYPOGRAPHY.label} mb-1`}>Billing</p>
              {billingError}
            </div>
          )}
          {subscribingPlan && (
            <div
              className="mt-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-4 py-3 text-xs text-[var(--aethel-text-secondary)]"
              role="status"
              aria-live="polite"
            >
              <p className={`${CANONICAL_TYPOGRAPHY.label} mb-1 text-[var(--aethel-text-primary)]`}>Billing</p>
              Processando plano {subscribingPlan}...
            </div>
          )}
        </div>
      )}

      {activeTab === 'connectivity' && <DashboardConnectivityTab {...connectivityProps} />}

      {activeTab === 'content-creation' && <DashboardContentCreationTab />}
      {activeTab === 'unreal' && <DashboardUnrealTab />}
      {activeTab === 'download' && <DownloadTab onDownload={onDownload} />}
      {activeTab === 'templates' && <TemplatesTab templates={workflowTemplates} onSelect={onTemplateSelect} />}
      {activeTab === 'use-cases' && <UseCasesTab useCases={useCases} onSelect={onUseCaseSelect} />}
      {activeTab === 'admin' && <AdminTab />}
      {activeTab === 'agent-canvas' && <AgentCanvasTab />}
    </div>
  )
}

export default DashboardMainContent
