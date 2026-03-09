'use client'

import type { ComponentProps } from 'react'

import { FirstValueGuide } from './FirstValueGuide'
import { DashboardOverviewTab } from './DashboardOverviewTab'
import { DashboardProjectsTab } from './DashboardProjectsTab'
import { DashboardAIChatTab } from './DashboardAIChatTab'
import { DashboardWalletTab } from './DashboardWalletTab'
import { DashboardConnectivityTab } from './DashboardConnectivityTab'
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
  overviewProps: ComponentProps<typeof DashboardOverviewTab>
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
    <>
      {showFirstValueGuide && (
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
        <div className="aethel-p-6">
          <BillingTab {...billingProps} />
          {billingError && (
            <div className="aethel-state aethel-state-error aethel-mt-4 aethel-text-xs" role="alert" aria-live="polite">
              {billingError}
            </div>
          )}
          {subscribingPlan && (
            <div className="aethel-state aethel-state-loading aethel-mt-2 aethel-text-xs" role="status" aria-live="polite">
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
    </>
  )
}

export default DashboardMainContent
