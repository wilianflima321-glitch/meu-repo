'use client'

import Link from 'next/link'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { Activity, ExternalLink, PanelTopOpen } from 'lucide-react'
import { CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'

import { FirstValueGuide } from './FirstValueGuide'
import { DashboardProjectsTab } from './DashboardProjectsTab'
import { DashboardOverviewTab, type DashboardOverviewTabProps } from './DashboardOverviewTab'
import type { FirstValueSessionSummary } from './useFirstValueTracking'
import {
  resolvePrimaryDashboardTab,
  type ActiveTab,
  type WorkflowTemplate,
} from './aethel-dashboard-model'

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
  aiChatProps?: unknown
  walletProps?: unknown
  billingProps?: unknown
  billingError?: string | null
  subscribingPlan?: string | null
  connectivityProps?: unknown
  workflowTemplates?: WorkflowTemplate[]
  onTemplateSelect?: (templateId: string) => void
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
        className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-5 py-5 shadow-[var(--aethel-shadow-lg)] sm:px-6"
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

function ActivityCard({
  label,
  title,
  body,
  children,
}: {
  label: string
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <article className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] p-5 shadow-[var(--aethel-shadow-lg)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">{label}</p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{body}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  )
}

function DashboardActivitySurface({ overviewProps, sourceTab }: { overviewProps: DashboardOverviewTabProps; sourceTab: ActiveTab }) {
  const {
    aiActivity,
    authReady,
    hasToken,
    walletLoading,
    walletError,
    walletData,
    formatCurrencyLabel,
    connectivityData,
    connectivityLoading,
    connectivityError,
    connectivityServices = [],
    formatConnectivityStatus,
    backendOnline,
    aiProviderConfigured,
    currentPlanName,
    onOpenAiChat,
    onOpenBilling,
    onOpenIde,
    onOpenProjects,
  } = overviewProps

  const walletSummary = !authReady
    ? 'Checking session'
    : !hasToken
      ? 'Sign in required'
      : walletLoading
        ? 'Syncing budget'
        : walletError
          ? 'Wallet needs review'
          : walletData
            ? `${walletData.balance.toLocaleString()} ${formatCurrencyLabel(walletData.currency)}`
            : 'No wallet data'

  const trustSummary = connectivityLoading
    ? 'Checking services'
    : connectivityError
          ? 'Status needs review'
      : connectivityData
        ? formatConnectivityStatus(connectivityData.overall_status)
        : 'Not configured'

  const legacyNotice = sourceTab === 'activity' ? null : (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-4 py-3 text-xs leading-5 text-[var(--aethel-text-secondary)]">
      <span className={CANONICAL_TYPOGRAPHY.label}>Path compressed</span>
      <span className="ml-2">The old `{sourceTab}` tab now opens here so Studio Home keeps only three primary paths.</span>
    </div>
  )

  return (
    <SurfaceFrame
      eyebrow="Activity"
      title="Agents, status and receipts without another control room"
      description="This is the compact work lane. Deep work opens only when the mission needs it."
      icon={<Activity className="h-5 w-5" />}
    >
      <div className="space-y-4">
        {legacyNotice}
        <div className="grid gap-4 xl:grid-cols-3">
          <ActivityCard
            label="Agents"
            title={aiProviderConfigured ? 'Agent lane ready' : 'Provider setup needed'}
            body={aiActivity || 'Open the IDE agent sidecar when planning becomes implementation.'}
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenAiChat('Continue this mission in the IDE agent sidecar.')}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--aethel-text-primary)] px-3 py-2 text-sm font-semibold text-[var(--aethel-surface-primary)]"
              >
                Open agents <ExternalLink className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onOpenIde}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-subtle)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
              >
                Open IDE
              </button>
            </div>
          </ActivityCard>

          <ActivityCard
            label="Cost"
            title={walletSummary}
            body={`Plan: ${currentPlanName ?? 'not selected'}. Budget stays visible here, while plan changes live in Billing.`}
          >
            <button
              type="button"
              onClick={onOpenBilling}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-subtle)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              Open billing
            </button>
          </ActivityCard>

          <ActivityCard
            label="Trust"
            title={trustSummary}
            body={backendOnline ? 'Runtime and provider signals are summarized here. Deep diagnostics stay out of the first fold.' : 'Backend is not reachable; keep execution held until runtime is healthy.'}
          >
            <div className="space-y-2">
              {connectivityServices.slice(0, 3).map((service) => (
                <div key={service.name} className="flex items-center justify-between rounded-2xl border border-[var(--aethel-border-subtle)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
                  <span>{service.name.replace(/_/g, ' ')}</span>
                  <span>{formatConnectivityStatus(service.status)}</span>
                </div>
              ))}
              <Link href="/settings?tab=integrations" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
                Open settings <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </ActivityCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link href="/evidence" className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] p-4 text-sm text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-primary)]">
            <span className="block font-semibold text-[var(--aethel-text-primary)]">Receipts</span>
            Receipts, blockers, release checks and runtime status.
          </Link>
          <Link href="/studio" className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] p-4 text-sm text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-primary)]">
            <span className="block font-semibold text-[var(--aethel-text-primary)]">Creative Studio</span>
            World, character, FX, film and logic lanes.
          </Link>
          <button type="button" onClick={onOpenProjects} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] p-4 text-left text-sm text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-primary)]">
            <span className="block font-semibold text-[var(--aethel-text-primary)]">Projects</span>
            Return to workspace selection and continuity.
          </button>
        </div>
      </div>
    </SurfaceFrame>
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
}: DashboardMainContentProps) {
  const primaryActiveTab = resolvePrimaryDashboardTab(activeTab)

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-3 sm:px-5 lg:px-6 lg:py-5" data-dashboard-primary-surface={primaryActiveTab}>
      {showFirstValueGuide && primaryActiveTab === 'overview' && (
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

      {primaryActiveTab === 'overview' && <DashboardOverviewTab {...overviewProps} />}

      {primaryActiveTab === 'projects' && (
        <SurfaceFrame
          eyebrow="Projects"
          title="Workspace continuity before deep execution"
          description="Choose or shape the right workspace before handing off to the IDE or Creative Studio."
          icon={<PanelTopOpen className="h-5 w-5" />}
        >
          <DashboardProjectsTab {...projectsProps} />
        </SurfaceFrame>
      )}

      {primaryActiveTab === 'activity' && <DashboardActivitySurface overviewProps={overviewProps} sourceTab={activeTab} />}
    </div>
  )
}

export default DashboardMainContent
