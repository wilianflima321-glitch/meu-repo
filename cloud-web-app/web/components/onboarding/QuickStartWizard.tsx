'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Codicon from '@/components/ide/Codicon'
import { analytics } from '@/lib/analytics'

// Domain templates
const DOMAIN_TEMPLATES = [
  {
    id: 'app-saas',
    domain: 'app',
    icon: 'globe',
    name: 'App SaaS',
    description: 'Dashboard com auth, billing, CRUD e deploy',
    stack: ['Next.js', 'Prisma', 'Stripe', 'Tailwind'],
    color: 'from-[var(--aethel-primary)] to-[var(--aethel-info)]',
    mission: 'Criar app SaaS completo com auth, dashboard e billing',
  },
  {
    id: 'app-api',
    domain: 'app',
    icon: 'server',
    name: 'REST API',
    description: 'API robusta com TypeScript, ORM e testes',
    stack: ['Express', 'Prisma', 'Jest', 'Swagger'],
    color: 'from-[var(--aethel-success)] to-[var(--aethel-info)]',
    mission: 'Criar API REST com TypeScript, validação e documentação',
  },
  {
    id: 'app-landing',
    domain: 'app',
    icon: 'browser',
    name: 'Landing Page',
    description: 'Landing de conversão com SEO e analytics',
    stack: ['Next.js', 'Tailwind', 'Framer Motion'],
    color: 'from-[var(--aethel-info)] to-[var(--aethel-primary)]',
    mission: 'Criar landing page premium com SEO, CTAs e analytics',
  },
  {
    id: 'research',
    domain: 'research',
    icon: 'search',
    name: 'Fluxo de pesquisa',
    description: 'Pesquisa com citações, plano e código',
    stack: ['Nexus Pesquisa', 'Citations', 'Code Gen'],
    color: 'from-[var(--aethel-warning)] to-[var(--aethel-warning-dark)]',
    mission: 'Pesquisar tópico, gerar plano e implementar solução',
  },
  {
    id: 'game-2d',
    domain: 'game',
    icon: 'play',
    name: 'Jogo 2D',
    description: 'Jogo com sprites, física e leaderboard',
    stack: ['Canvas', 'Rapier', 'Sprites'],
    color: 'from-[var(--aethel-info)] to-[var(--aethel-primary-light)]',
    mission: 'Criar jogo 2D com sprites, física e pontuação',
    availability: 'experimental',
  },
  {
    id: 'film-storyboard',
    domain: 'film',
    icon: 'device-camera-video',
    name: 'Storyboard',
    description: 'Diretor de cenas com IA e timeline',
    stack: ['Scenes', 'Timeline', 'AI Gen'],
    color: 'from-[var(--aethel-primary)] to-[var(--aethel-info)]',
    mission: 'Criar storyboard com cenas, diretor IA e timeline',
    availability: 'experimental',
  },
]

// Provider presets
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
    description: 'GPT-5.x, GPT-4.1, o3/o4 e variantes recentes',
    envKey: 'OPENAI_API_KEY',
    recommended: false,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 4.6/4.5, Claude 3.7 e Haiku',
    envKey: 'ANTHROPIC_API_KEY',
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
      analytics?.track?.('project', 'project_open', { metadata: { source: 'quick-start-assistente' } })
    }
  }, [isOpen])

  const handleComplete = useCallback(() => {
    const tpl = DOMAIN_TEMPLATES.find((t) => t.id === selectedTemplate)
    analytics?.track?.('project', 'project_open', {
      metadata: {
        source: 'quick-start-assistente-complete',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Assistente de configuração inicial">
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] hover:text-[var(--aethel-text-primary)]"
          aria-label="Fechar assistente"
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
 ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)]'
 : (['domain', 'provider', 'ready'].indexOf(step) > i)
 ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
 : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] text-[var(--aethel-text-quaternary)]'
 }`}
              >
                {(['domain', 'provider', 'ready'].indexOf(step) > i) ? (
                  <Codicon name="check" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && <div className="h-px w-8 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] sm:w-12" />}
            </div>
          ))}
        </div>

        {/* Step 1: Domain / Template */}
        {step === 'domain' && (
          <div className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[var(--aethel-text-primary)]">O que você quer criar?</h2>
              <p className="mt-2 text-sm text-[var(--aethel-text-tertiary)]">
                Escolha um template para começar com estrutura e contexto prontos.
              </p>
            </div>

            {/* Domain filter */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'app', label: 'Apps' },
                { id: 'research', label: 'Pesquisa' },
                { id: 'game', label: 'Jogos' },
                { id: 'film', label: 'Filmes' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDomainFilter(f.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
 domainFilter === f.id
 ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]'
 : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] hover:text-[var(--aethel-text-primary)]'
 }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {filtered.map((tpl) => {
                const isDisabled = tpl.availability === 'experimental'
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => !isDisabled && setSelectedTemplate(tpl.id)}
                    disabled={isDisabled}
                    className={`group relative rounded-xl border p-4 text-left transition-all ${
 selectedTemplate === tpl.id
 ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]'
 : 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]'
 } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    {isDisabled && (
                      <span className="absolute right-3 top-3 rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[color-mix(in_srgb,var(--aethel-warning-light)_85%,transparent)]">
                        Em roadmap
                      </span>
                    )}
                    {selectedTemplate === tpl.id && !isDisabled && (
                      <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)] text-xs">
                        <Codicon name="check" />
                      </span>
                    )}
                    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${tpl.color} text-[var(--aethel-text-primary)]`}>
                      <Codicon name={tpl.icon} />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{tpl.name}</h3>
                    <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">{tpl.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tpl.stack.map((s) => (
                        <span key={s} className="rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)]">{s}</span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={onDismiss}
                className="text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]"
              >
                Pular assistente
              </button>
              <button
                type="button"
                onClick={() => setStep('provider')}
                className="flex items-center gap-2 rounded-xl bg-[var(--aethel-surface-secondary)] px-5 py-2.5 text-sm font-semibold text-[var(--aethel-text-primary)] transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-40"
              >
                Próximo
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Provider */}
        {step === 'provider' && (
          <div className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[var(--aethel-text-primary)]">Configurar provedor de IA</h2>
              <p className="mt-2 text-sm text-[var(--aethel-text-tertiary)]">
                Escolha como a IA vai funcionar. Você pode mudar depois em Configurações.
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
 ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]'
 : 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]'
 }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
 prov.id === 'demo' ? 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] text-[var(--aethel-text-primary)]'
 }`}>
                    <Codicon name={prov.id === 'demo' ? 'beaker' : 'key'} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">{prov.name}</span>
                      {prov.recommended && (
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--aethel-success-light)]">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--aethel-text-tertiary)]">{prov.description}</p>
                  </div>
                  {selectedProvider === prov.id && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)] text-xs">
                      <Codicon name="check" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Info box */}
            <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] bg-[var(--aethel-warning)]/[0.05] p-4">
              <p className="flex items-start gap-2 text-xs text-[color-mix(in_srgb,var(--aethel-warning-light)_80%,transparent)]">
                <Codicon name="info" />
                <span>
                  Você pode configurar a API key depois em Configurações {'>'} Provedor de IA. O assistente não armazena keys.
                </span>
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('domain')}
                className="flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep('ready')}
                className="flex items-center gap-2 rounded-xl bg-[var(--aethel-surface-secondary)] px-5 py-2.5 text-sm font-semibold text-[var(--aethel-text-primary)] transition-all hover:brightness-95 active:scale-[0.98]"
              >
                Próximo
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 'ready' && (
          <div className="p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--aethel-success),var(--aethel-info))] text-[var(--aethel-text-primary)] text-2xl">
                <Codicon name="rocket" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--aethel-text-primary)]">Tudo pronto!</h2>
              <p className="mt-2 text-sm text-[var(--aethel-text-tertiary)]">
                Seu workspace está configurado. Você será direcionado para o dashboard.
              </p>
            </div>

            {/* Summary */}
            <div className="mt-6 space-y-3">
              {selectedTemplate && (
                <div className="flex items-center gap-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]">
                    <Codicon name="project" />
                  </span>
                  <div>
                    <p className="text-xs text-[var(--aethel-text-tertiary)]">Template</p>
                    <p className="text-sm font-medium text-[var(--aethel-text-primary)]">
                      {DOMAIN_TEMPLATES.find((t) => t.id === selectedTemplate)?.name || 'Nenhum'}
                    </p>
                  </div>
                </div>
              )}
              {selectedProvider && (
                <div className="flex items-center gap-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]">
                    <Codicon name="key" />
                  </span>
                  <div>
                    <p className="text-xs text-[var(--aethel-text-tertiary)]">Provedor de IA</p>
                    <p className="text-sm font-medium text-[var(--aethel-text-primary)]">
                      {PROVIDER_PRESETS.find((p) => p.id === selectedProvider)?.name || 'Nenhum'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick tips */}
            <div className="mt-6 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Próximos passos</p>
              <ul className="mt-3 space-y-2">
                {[
                  'Use o chat para descrever o que quer criar',
                  'Clique em @codebase para dar contexto ao agente',
                  'Abra o IDE para ver e editar o código gerado',
                  'Use Apply/Rollback para controlar as mudanças',
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-xs text-[var(--aethel-text-tertiary)]">
                    <span className="mt-0.5 text-[var(--aethel-success-light)]"><Codicon name="check" /></span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('provider')}
                className="flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,var(--aethel-primary),var(--aethel-info))] px-6 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-lg shadow-[0_18px_40px_color-mix(in_srgb,var(--aethel-info)_35%,transparent)] transition-all hover:brightness-110 active:scale-[0.98]"
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



