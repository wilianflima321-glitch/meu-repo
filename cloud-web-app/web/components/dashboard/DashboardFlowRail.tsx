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
      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-4 shadow-[0_18px_50px_rgba(2,6,23,0.22)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Fluxo principal</p>
            <h2 className="mt-1 text-base font-semibold text-zinc-100 sm:text-lg">
              Entrar, planejar, construir e validar no mesmo studio.
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">
              {entryMission
                ? `Missao atual: ${entryMission}`
                : 'Use este trilho para reduzir troca de contexto e seguir a jornada mais curta ate o preview e a validacao.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenIde}
            className="inline-flex items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-400/15"
          >
            Abrir IDE com handoff
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {FLOW_STEPS.map((step, index) => {
            const state = getStepState(activeTab, step)
            const className =
              state === 'active'
                ? 'border-sky-400/35 bg-[linear-gradient(135deg,rgba(79,70,229,0.28),rgba(14,165,233,0.16))] text-white'
                : state === 'complete'
                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-50'
                : 'border-white/10 bg-white/[0.03] text-zinc-200'

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => (step.action === 'ide' ? onOpenIde() : onSelectTab(step.tab!))}
                className={`rounded-[22px] border p-4 text-left transition hover:border-white/20 hover:bg-white/[0.05] ${className}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Etapa {index + 1}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                    {state === 'active' ? 'Agora' : state === 'complete' ? 'Pronto' : 'Fila'}
                  </span>
                </div>
                <div className="mt-3 text-base font-semibold">{step.label}</div>
                <div className="mt-1 text-sm leading-6 text-zinc-300">{step.description}</div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default DashboardFlowRail
