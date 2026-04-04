import type { ActiveTab } from './aethel-dashboard-model'

type DashboardFlowRailProps = {
  activeTab: ActiveTab
  entryMission?: string | null
  onSelectTab: (tab: ActiveTab) => void
  onOpenIde: () => void
}

type FlowStep = {
  id: string
  label: string
  description: string
  tab?: ActiveTab
  action?: 'ide'
}

const FLOW_STEPS: FlowStep[] = [
  {
    id: 'context',
    label: 'Contexto',
    description: 'Entender a missao e o estado operacional.',
    tab: 'overview',
  },
  {
    id: 'plan',
    label: 'Plano',
    description: 'Refinar a ideia com AI Chat e workflows.',
    tab: 'ai-chat',
  },
  {
    id: 'build',
    label: 'Build',
    description: 'Organizar projeto e seguir para a IDE.',
    tab: 'projects',
  },
  {
    id: 'validate',
    label: 'Validacao',
    description: 'Executar preview e checar readiness.',
    action: 'ide',
  },
]

function getStepState(activeTab: ActiveTab, step: FlowStep): 'active' | 'complete' | 'idle' {
  const order = ['overview', 'ai-chat', 'projects'] as const

  if (step.action === 'ide') {
    return activeTab === 'connectivity' || activeTab === 'billing' ? 'active' : 'idle'
  }

  const currentIndex = order.indexOf(activeTab as (typeof order)[number])
  const stepIndex = order.indexOf(step.tab as (typeof order)[number])

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
  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
      <div className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-4 shadow-[0_18px_50px_rgba(2,6,23,0.22)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Fluxo principal</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--aethel-text-primary)] sm:text-lg">
              Entrar, planejar, construir e validar no mesmo studio.
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--aethel-text-tertiary)]">
              {entryMission
                ? `Missao atual: ${entryMission}`
                : 'Use este trilho para reduzir troca de contexto e seguir a jornada mais curta ate o preview e a validacao.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenIde}
            className="inline-flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-info-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)]"
          >
            Abrir IDE com handoff
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {FLOW_STEPS.map((step, index) => {
            const state = getStepState(activeTab, step)
            const className =
              state === 'active'
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-primary)_28%,transparent),color-mix(in_srgb,var(--aethel-info)_16%,transparent))] text-[var(--aethel-text-primary)]'
                : state === 'complete'
                ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
                : 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-secondary)]'

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => (step.action === 'ide' ? onOpenIde() : onSelectTab(step.tab!))}
                className={`rounded-[22px] border p-4 text-left transition hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] ${className}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                    Etapa {index + 1}
                  </span>
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                    {state === 'active' ? 'Agora' : state === 'complete' ? 'Pronto' : 'Fila'}
                  </span>
                </div>
                <div className="mt-3 text-base font-semibold">{step.label}</div>
                <div className="mt-1 text-sm leading-6 text-[var(--aethel-text-secondary)]">{step.description}</div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default DashboardFlowRail
