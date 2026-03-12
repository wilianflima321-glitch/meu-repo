'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Codicon from '@/components/ide/Codicon'
import { analytics } from '@/lib/analytics'

/* ── Domain templates ─────────────────────── */
const DOMAIN_TEMPLATES = [
  {
    id: 'app-saas',
    domain: 'app',
    icon: 'globe',
    name: 'SaaS App',
    description: 'Dashboard com auth, billing, CRUD e deploy',
    stack: ['Next.js', 'Prisma', 'Stripe', 'Tailwind'],
    color: 'from-blue-500 to-cyan-500',
    mission: 'Criar app SaaS completo com auth, dashboard e billing',
  },
  {
    id: 'app-api',
    domain: 'app',
    icon: 'server',
    name: 'REST API',
    description: 'API robusta com TypeScript, ORM e testes',
    stack: ['Express', 'Prisma', 'Jest', 'Swagger'],
    color: 'from-emerald-500 to-teal-500',
    mission: 'Criar API REST com TypeScript, validacao e documentacao',
  },
  {
    id: 'app-landing',
    domain: 'app',
    icon: 'browser',
    name: 'Landing Page',
    description: 'Landing de conversao com SEO e analytics',
    stack: ['Next.js', 'Tailwind', 'Framer Motion'],
    color: 'from-sky-500 to-blue-500',
    mission: 'Criar landing page premium com SEO, CTAs e analytics',
  },
  {
    id: 'research',
    domain: 'research',
    icon: 'search',
    name: 'Research Workflow',
    description: 'Pesquisa com citacoes, plano e codigo',
    stack: ['Nexus Research', 'Citations', 'Code Gen'],
    color: 'from-amber-500 to-orange-500',
    mission: 'Pesquisar topico, gerar plano e implementar solucao',
  },
  {
    id: 'game-2d',
    domain: 'game',
    icon: 'play',
    name: 'Jogo 2D',
    description: 'Jogo com sprites, fisica e leaderboard',
    stack: ['Canvas', 'Rapier', 'Sprites'],
    color: 'from-cyan-500 to-sky-500',
    mission: 'Criar jogo 2D com sprites, fisica e pontuacao',
  },
  {
    id: 'film-storyboard',
    domain: 'film',
    icon: 'device-camera-video',
    name: 'Storyboard',
    description: 'Director de cenas com AI e timeline',
    stack: ['Scenes', 'Timeline', 'AI Gen'],
    color: 'from-blue-500 to-cyan-500',
    mission: 'Criar storyboard com cenas, diretor AI e timeline',
  },
]

/* ── Provider presets ─────────────────────── */
const PROVIDER_PRESETS = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Acesso a 100+ modelos via uma API',
    envKey: 'OPENROUTER_API_KEY',
    recommended: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4, o1 e modelos mais recentes',
    envKey: 'OPENAI_API_KEY',
    recommended: false,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.5, Claude 4 e Haiku',
    envKey: 'ANTHROPIC_API_KEY',
    recommended: false,
  },
  {
    id: 'demo',
    name: 'Modo Demo',
    description: 'Explore sem API key. Respostas pre-geradas.',
    envKey: '',
    recommended: false,
  },
]

type Step = 'domain' | 'provider' | 'ready'

interface QuickStartWizardProps {
  isOpen: boolean
  onComplete: (config: { template?: string; provider?: string; mission?: string }) => void
  onDismiss: () => void
  initialMission?: string
}

export default function QuickStartWizard({ isOpen, onComplete, onDismiss, initialMission }: QuickStartWizardProps) {
  const [step, setStep] = useState<Step>('domain')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [domainFilter, setDomainFilter] = useState<string>('all')
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      analytics?.track?.('project', 'project_open', { metadata: { source: 'quick-start-wizard' } })
    }
  }, [isOpen])

  const handleComplete = useCallback(() => {
    const tpl = DOMAIN_TEMPLATES.find((t) => t.id === selectedTemplate)
    analytics?.track?.('project', 'project_open', {
      metadata: {
        source: 'quick-start-wizard-complete',
        template: selectedTemplate,
        provider: selectedProvider,
      },
    })
    onComplete({
      template: selectedTemplate || undefined,
      provider: selectedProvider || undefined,
      mission: tpl?.mission || initialMission,
    })
  }, [selectedTemplate, selectedProvider, initialMission, onComplete])

  if (!isOpen) return null

  const filtered = domainFilter === 'all' ? DOMAIN_TEMPLATES : DOMAIN_TEMPLATES.filter((t) => t.domain === domainFilter)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Wizard de configuracao inicial">
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-3xl border border-white/[0.08] bg-zinc-950 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Fechar wizard"
        >
          <Codicon name="close" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 px-6 pt-6">
          {(['domain', 'provider', 'ready'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step === s
                    ? 'bg-blue-500 text-white'
                    : (['domain', 'provider', 'ready'].indexOf(step) > i)
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/[0.06] text-zinc-600'
                }`}
              >
                {(['domain', 'provider', 'ready'].indexOf(step) > i) ? (
                  <Codicon name="check" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && <div className="h-px w-8 bg-white/[0.06] sm:w-12" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Domain / Template ── */}
        {step === 'domain' && (
          <div className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">O que voce quer criar?</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Escolha um template para comecar com estrutura e contexto prontos.
              </p>
            </div>

            {/* Domain filter */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'app', label: 'Apps' },
                { id: 'research', label: 'Research' },
                { id: 'game', label: 'Games' },
                { id: 'film', label: 'Films' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDomainFilter(f.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    domainFilter === f.id
                      ? 'bg-white text-black'
                      : 'bg-white/[0.05] text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {filtered.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={`group relative rounded-xl border p-4 text-left transition-all ${
                    selectedTemplate === tpl.id
                      ? 'border-blue-500/50 bg-blue-500/[0.08]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                  }`}
                >
                  {selectedTemplate === tpl.id && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-xs">
                      <Codicon name="check" />
                    </span>
                  )}
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${tpl.color} text-white`}>
                    <Codicon name={tpl.icon} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{tpl.name}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{tpl.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tpl.stack.map((s) => (
                      <span key={s} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">{s}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={onDismiss}
                className="text-sm text-zinc-500 transition-colors hover:text-white"
              >
                Pular wizard
              </button>
              <button
                type="button"
                onClick={() => setStep('provider')}
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-40"
              >
                Proximo
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Provider ── */}
        {step === 'provider' && (
          <div className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">Configurar AI Provider</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Escolha como a IA vai funcionar. Pode mudar depois em Settings.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {PROVIDER_PRESETS.map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setSelectedProvider(prov.id)}
                  className={`group relative flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                    selectedProvider === prov.id
                      ? 'border-blue-500/50 bg-blue-500/[0.08]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    prov.id === 'demo' ? 'bg-zinc-800 text-zinc-400' : 'bg-white/10 text-white'
                  }`}>
                    <Codicon name={prov.id === 'demo' ? 'beaker' : 'key'} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{prov.name}</span>
                      {prov.recommended && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">{prov.description}</p>
                  </div>
                  {selectedProvider === prov.id && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-xs">
                      <Codicon name="check" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Info box */}
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
              <p className="flex items-start gap-2 text-xs text-amber-300/80">
                <Codicon name="info" />
                <span>
                  {selectedProvider === 'demo'
                    ? 'O modo demo usa respostas pre-geradas para exploracao. Nao requer API key.'
                    : 'Voce pode configurar a API key depois em Settings > AI Provider. O wizard nao armazena keys.'}
                </span>
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('domain')}
                className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep('ready')}
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-zinc-200 active:scale-[0.98]"
              >
                Proximo
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Ready ── */}
        {step === 'ready' && (
          <div className="p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white text-2xl">
                <Codicon name="rocket" />
              </div>
              <h2 className="text-2xl font-bold text-white">Tudo pronto!</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Seu workspace esta configurado. Voce vai ser direcionado para o dashboard.
              </p>
            </div>

            {/* Summary */}
            <div className="mt-6 space-y-3">
              {selectedTemplate && (
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Codicon name="project" />
                  </span>
                  <div>
                    <p className="text-xs text-zinc-500">Template</p>
                    <p className="text-sm font-medium text-white">
                      {DOMAIN_TEMPLATES.find((t) => t.id === selectedTemplate)?.name || 'Nenhum'}
                    </p>
                  </div>
                </div>
              )}
              {selectedProvider && (
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
                    <Codicon name="key" />
                  </span>
                  <div>
                    <p className="text-xs text-zinc-500">AI Provider</p>
                    <p className="text-sm font-medium text-white">
                      {PROVIDER_PRESETS.find((p) => p.id === selectedProvider)?.name || 'Nenhum'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick tips */}
            <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Proximos passos</p>
              <ul className="mt-3 space-y-2">
                {[
                  'Use o chat para descrever o que quer criar',
                  'Clique em @codebase para dar contexto ao agente',
                  'Abra o IDE para ver e editar o codigo gerado',
                  'Use Apply/Rollback para controlar as mudancas',
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-xs text-zinc-400">
                    <span className="mt-0.5 text-emerald-500"><Codicon name="check" /></span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('provider')}
                className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-cyan-500 active:scale-[0.98]"
              >
                Abrir Dashboard
                <Codicon name="arrow-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
