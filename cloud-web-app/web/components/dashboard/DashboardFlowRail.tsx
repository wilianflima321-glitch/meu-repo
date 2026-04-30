import {
  EXPLORE_TABS,
  MISSION_CONTROL_TABS,
  OPERATIONS_TABS,
  type ActiveTab,
} from './aethel-dashboard-model'

type DashboardFlowRailProps = {
  activeTab: ActiveTab
  entryMission?: string | null
  onSelectTab: (tab: ActiveTab) => void
  onOpenIde: () => void
}

type FlowStep = {
  id: string
  label: string
  tab?: ActiveTab
  action?: 'ide'
}

const FLOW_STEPS: FlowStep[] = [
  { id: 'context', label: 'Studio Home', tab: 'overview' },
  { id: 'plan', label: 'AI Console', tab: 'ai-chat' },
  { id: 'build', label: 'Projects', tab: 'projects' },
  { id: 'validate', label: 'Deep Studio', action: 'ide' },
]

function getStepState(activeTab: ActiveTab, step: FlowStep): 'active' | 'complete' | 'idle' {
  const order = MISSION_CONTROL_TABS

  if (step.action === 'ide') {
    return 'idle'
  }

  const currentIndex = order.indexOf(activeTab as (typeof order)[number])
  const stepIndex = order.indexOf(step.tab as (typeof order)[number])

  if (currentIndex === -1) return 'idle'
  if (currentIndex === stepIndex) return 'active'
  if (currentIndex > stepIndex && stepIndex >= 0) return 'complete'
  return 'idle'
}

export function DashboardFlowRail({
  activeTab,
  entryMission,
  onSelectTab,
  onOpenIde,
}: DashboardFlowRailProps) {
  const supportSurfaceActive = OPERATIONS_TABS.includes(activeTab as (typeof OPERATIONS_TABS)[number])
  const exploreSurfaceActive = EXPLORE_TABS.includes(activeTab as (typeof EXPLORE_TABS)[number])

  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
      <div className="flex flex-col gap-3 rounded-[22px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-4 shadow-[0_18px_50px_rgba(2,6,23,0.2)] lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Flow</div>
          <div className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
            {entryMission
              ? `Current mission: ${entryMission}`
              : supportSurfaceActive
                ? 'Support surface active. Resolve readiness, then return to the main mission flow.'
                : exploreSurfaceActive
                  ? 'Explore without losing the main path back to Studio Home, AI Console and Projects.'
                  : 'Stay in one Studio flow from mission intake to deeper work.'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FLOW_STEPS.map((step) => {
            const state = getStepState(activeTab, step)
            const className =
              state === 'active'
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]'
                : state === 'complete'
                  ? 'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
                  : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] text-[var(--aethel-text-secondary)]'

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => (step.action === 'ide' ? onOpenIde() : onSelectTab(step.tab!))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] ${className}`}
              >
                {step.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default DashboardFlowRail
