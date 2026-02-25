'use client'

type UseCaseCard = {
  title: string
  description: string
}

const AGENT_USE_CASES: UseCaseCard[] = [
  {
    title: 'Pesquisa e analise',
    description: 'Coletar informacoes, analisar dados e gerar insights.',
  },
  {
    title: 'Criacao de conteudo',
    description: 'Gerar artigos, codigo, documentacao e conteudo criativo.',
  },
  {
    title: 'Automacao',
    description: 'Criar fluxos, scripts e processos automatizados.',
  },
  {
    title: 'Resolucao de problemas',
    description: 'Depurar codigo, otimizar performance e resolver issues complexas.',
  },
  {
    title: 'Geracao de codigo',
    description: 'Gerar, depurar e otimizar codigo em varias linguagens.',
  },
  {
    title: 'Analise de dados',
    description: 'Analisar datasets, criar visualizacoes e extrair insights.',
  },
  {
    title: 'Design criativo',
    description: 'Desenhar UI/UX, graficos e conceitos criativos.',
  },
  {
    title: 'Estrategia de negocios',
    description: 'Planejamento estrategico, analise de mercado e desenvolvimento de negocios.',
  },
]

export function AgentUseCaseGrid() {
  return (
    <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-4">
      {AGENT_USE_CASES.map((card) => (
        <div
          key={card.title}
          className="aethel-card aethel-p-4 aethel-text-left aethel-border aethel-border-slate-800"
        >
          <h3 className="aethel-font-semibold aethel-mb-2">{card.title}</h3>
          <p className="aethel-text-sm aethel-text-slate-400">{card.description}</p>
        </div>
      ))}
    </div>
  )
}

type CapabilityToolbarProps = {
  controls: string[]
}

function CapabilityToolbar({ controls }: CapabilityToolbarProps) {
  return (
    <div className="aethel-absolute aethel-top-4 aethel-left-4 aethel-flex aethel-gap-2">
      {controls.map((label) => (
        <button
          key={label}
          type="button"
          disabled
          aria-disabled="true"
          title="Capability gated in this release phase."
          className="aethel-button aethel-button-ghost aethel-text-xs aethel-opacity-60 cursor-not-allowed"
        >
          {label}
        </button>
      ))}
    </div>
  )
}

type DashboardCapabilityGateCardProps = {
  title: string
  description: string
  capability: string
  milestone: string
  controls: string[]
}

function DashboardCapabilityGateCard({
  title,
  description,
  capability,
  milestone,
  controls,
}: DashboardCapabilityGateCardProps) {
  return (
    <div className="aethel-card aethel-p-6 aethel-max-w-6xl aethel-mx-auto">
      <div className="aethel-mb-4 aethel-flex aethel-items-center aethel-justify-between aethel-gap-3">
        <div>
          <h3 className="aethel-text-lg aethel-font-semibold">{title}</h3>
          <p className="aethel-text-sm aethel-text-slate-400 aethel-mt-1">{description}</p>
        </div>
        <span className="aethel-text-[11px] aethel-rounded-full aethel-border aethel-border-amber-500/40 aethel-bg-amber-500/10 aethel-text-amber-300 aethel-px-2 aethel-py-1">
          PARTIAL · {milestone}
        </span>
      </div>
      <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-4 aethel-min-h-96 aethel-border aethel-border-slate-700 aethel-relative">
        <CapabilityToolbar controls={controls} />
        <div className="aethel-text-center aethel-text-slate-500 aethel-py-32">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <p className="aethel-text-lg aethel-font-medium aethel-mb-2">{title}</p>
          <p className="aethel-text-sm">Capability gate ativo para este ciclo.</p>
          <p className="aethel-text-xs aethel-text-slate-400 aethel-mt-2">
            Capability: <span className="aethel-font-mono">{capability}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export function CanvasCapabilityGate() {
  return (
    <DashboardCapabilityGateCard
      title="Canvas interativo"
      description="Canvas visual para trabalho colaborativo com IA."
      capability="STUDIO_CANVAS_RUNTIME"
      milestone="P1"
      controls={['Desenhar', 'Formas', 'Texto', 'Melhorar com IA']}
    />
  )
}

type CapabilityCardProps = {
  title: string
  description: string
  capability: string
}

function CapabilityCard({ title, description, capability }: CapabilityCardProps) {
  return (
    <div className="aethel-card aethel-p-6">
      <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">{title}</h3>
      <p className="aethel-text-slate-400 aethel-mb-4">{description}</p>
      <div className="aethel-inline-flex aethel-items-center aethel-gap-2 aethel-text-xs aethel-rounded-full aethel-border aethel-border-amber-500/40 aethel-bg-amber-500/10 aethel-text-amber-300 aethel-px-2 aethel-py-1">
        <span>PARTIAL</span>
        <span className="aethel-font-mono">{capability}</span>
      </div>
    </div>
  )
}

export function ContentCreationCapabilityGate() {
  return (
    <div className="aethel-p-6">
      <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Criacao de conteudo</h2>
      <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
        <CapabilityCard
          title="Conteudo com IA"
          description="Geracao assistida permanece visivel, mas sem acao direta enquanto o runtime dedicado nao estiver liberado."
          capability="CONTENT_CREATION_RUNTIME"
        />
        <CapabilityCard
          title="Modelos"
          description="Catalogo de modelos permanece em gate para evitar caminhos sem entrega operacional."
          capability="TEMPLATE_MARKET_RUNTIME"
        />
      </div>
    </div>
  )
}

export function UnrealCapabilityGate() {
  return (
    <div className="aethel-p-6">
      <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Integracao com Unreal Engine</h2>
      <div className="aethel-card aethel-p-6">
        <p className="aethel-text-slate-400 aethel-mb-4">
          Integracao Unreal permanece em gate nesta fase para evitar promessa fora de capacidade runtime atual.
        </p>
        <div className="aethel-inline-flex aethel-items-center aethel-gap-2 aethel-text-xs aethel-rounded-full aethel-border aethel-border-amber-500/40 aethel-bg-amber-500/10 aethel-text-amber-300 aethel-px-2 aethel-py-1">
          <span>PARTIAL</span>
          <span className="aethel-font-mono">UNREAL_WEB_BRIDGE</span>
        </div>
      </div>
    </div>
  )
}
