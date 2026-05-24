'use client'

import { useId, type ComponentProps, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { Blocks, CloudCog, CreditCard, PanelTopOpen, ShieldCheck, Sparkles } from 'lucide-react'
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
  TemplatesTab,
} from './dashboard-tab-loaders'
import type { ActiveTab, WorkflowTemplate } from './aethel-dashboard-model'

type BillingTabProps = ComponentProps<typeof BillingTab>
const DashboardOverviewTab = dynamic(
  () => import('./DashboardOverviewTab').then((mod) => mod.DashboardOverviewTab),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-4 py-4 text-sm text-[var(--aethel-text-secondary)]">
        Preparing Studio overview...
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
  onTemplateSelect: (templateId: string) => void
}

type SurfaceFrameProps = {
  eyebrow: string
  title: string
  description: string
  icon: ReactNode
  children: ReactNode
}

function SurfaceFrame({ eyebrow, title, description, icon, children }: SurfaceFrameProps) {
  const headingId = useId()

  return (
    <div className="space-y-4">
      <section
        className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-5 py-5 shadow-[0_20px_70px_rgba(2,6,23,0.20)] sm:px-6"
        aria-labelledby={headingId}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">{eyebrow}</p>
            <h2 id={headingId} className="mt-2 text-2xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">
              {title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--aethel-text-secondary)]">{description}</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] p-3 text-[var(--aethel-info-light)]">
            {icon}
          </div>
        </div>
      </section>
      {children}
    </div>
  )
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
  onTemplateSelect,
}: DashboardMainContentProps) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-3 sm:px-5 lg:px-6 lg:py-5">
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

      {activeTab === 'projects' && (
        <SurfaceFrame
          eyebrow="Projects"
          title="Workspace continuity before deep execution"
          description="Use this surface to choose or shape the right workspace before handing off to the full Studio."
          icon={<PanelTopOpen className="h-5 w-5" />}
        >
          <DashboardProjectsTab {...projectsProps} />
        </SurfaceFrame>
      )}

      {activeTab === 'ai-chat' && (
        <SurfaceFrame
          eyebrow="AI Console"
          title="Plan, research and coordinate before the heavy cockpit opens"
          description="Keep the mission thread coherent here, then expand into deeper Studio surfaces when artifact review or implementation becomes the dominant task."
          icon={<Sparkles className="h-5 w-5" />}
        >
          <DashboardAIChatTab {...aiChatProps} />
        </SurfaceFrame>
      )}

      {activeTab === 'wallet' && (
        <SurfaceFrame
          eyebrow="Wallet"
          title="Cost awareness stays close to the mission"
          description="Review balance, credits and spend without turning Studio Home into a finance dashboard."
          icon={<CreditCard className="h-5 w-5" />}
        >
          <DashboardWalletTab {...walletProps} />
        </SurfaceFrame>
      )}

      {activeTab === 'billing' && (
        <SurfaceFrame
          eyebrow="Billing"
          title="Commercial readiness, without losing product continuity"
          description="Plan selection, limits and billing state stay visible as an operational support surface, not as the main product identity."
          icon={<ShieldCheck className="h-5 w-5" />}
        >
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
                Processing {subscribingPlan} plan...
              </div>
            )}
          </div>
        </SurfaceFrame>
      )}

      {activeTab === 'connectivity' && (
        <SurfaceFrame
          eyebrow="Connectivity"
          title="Provider and service readiness"
          description="Use this surface to confirm platform trust and service health before expecting operator, preview or deploy flows to feel solid."
          icon={<CloudCog className="h-5 w-5" />}
        >
          <DashboardConnectivityTab {...connectivityProps} />
        </SurfaceFrame>
      )}

      {activeTab === 'content-creation' && (
        <SurfaceFrame
          eyebrow="Content creation"
          title="Media and asset generation stay in a focused lane"
          description="Keep this as an exploration and production support surface instead of mixing it into the primary mission layer."
          icon={<Blocks className="h-5 w-5" />}
        >
          <DashboardContentCreationTab />
        </SurfaceFrame>
      )}

      {activeTab === 'unreal' && (
        <SurfaceFrame
          eyebrow="Unreal"
          title="Viewport-heavy creation belongs to its own depth mode"
          description="This lane exists to support deeper creation workflows without forcing Unreal-grade density into the main entry surfaces."
          icon={<Blocks className="h-5 w-5" />}
        >
          <DashboardUnrealTab />
        </SurfaceFrame>
      )}

      {activeTab === 'templates' && (
        <SurfaceFrame
          eyebrow="Templates"
          title="Start from strong patterns without cluttering the entry flow"
          description="Templates stay available as accelerators, but Studio Home remains centered on the current mission, not on browsing everything at once."
          icon={<Blocks className="h-5 w-5" />}
        >
          <TemplatesTab templates={workflowTemplates} onSelect={onTemplateSelect} />
        </SurfaceFrame>
      )}

    </div>
  )
}

export default DashboardMainContent
