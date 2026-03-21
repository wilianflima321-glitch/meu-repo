'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Mail, ShieldCheck, Users, Workflow } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const enterpriseFeatures = [
  {
    icon: ShieldCheck,
    title: 'Governanca e readiness',
    desc: 'Controles operacionais, audit trail e estado explicito por superficie.',
  },
  {
    icon: Workflow,
    title: 'Research -> plan -> code',
    desc: 'Fluxo unico para times que precisam sair da analise e entrar em execucao.',
  },
  {
    icon: Users,
    title: 'Times e operacao',
    desc: 'Ponto de partida para alinhamento comercial com workspace, roles e rollout.',
  },
]

const DEAL_STEPS = [
  'Voce descreve tamanho do time, contexto e necessidades de compliance.',
  'Nosso fluxo atual abre um email local pre-preenchido com esse resumo.',
  'A conversa comercial continua fora do app enquanto o CRM nativo nao estiver ativo.',
]

function buildMailtoUrl(formData: {
  name: string
  email: string
  company: string
  role: string
  teamSize: string
  message: string
}) {
  const subject = `[Aethel Enterprise] ${formData.company || 'Novo interesse enterprise'}`
  const body = [
    `Nome: ${formData.name || '-'}`,
    `Email: ${formData.email || '-'}`,
    `Empresa: ${formData.company || '-'}`,
    `Cargo: ${formData.role || '-'}`,
    `Tamanho do time: ${formData.teamSize || '-'}`,
    '',
    'Contexto:',
    formData.message || '-',
  ].join('\n')

  return `mailto:sales@aethel.dev?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default function ContactSalesPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    teamSize: '',
    message: '',
  })

  const mailtoUrl = useMemo(() => buildMailtoUrl(formData), [formData])
  const requiredReady = formData.name.trim() && formData.email.trim() && formData.company.trim()
  const fieldBase =
    'h-12 w-full rounded-2xl border border-white/[0.08] bg-slate-950/60 px-4 text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/20'
  const textAreaBase =
    'w-full resize-none rounded-2xl border border-white/[0.08] bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/20'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.10),transparent_30%),#020617] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_8%,transparent)] blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-sky-500/[0.06] blur-[150px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="grid gap-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(340px,0.72fr)] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">
                Enterprise conversation
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Conversa comercial honesta, com contexto do produto e sem teatro de formulario.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Ainda nao fingimos CRM ou automacao enterprise dentro desta pagina. Em vez disso,
                organizamos o contexto, mostramos o estado atual do produto e abrimos um contato comercial limpo.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {enterpriseFeatures.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <article key={feature.title} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-100">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mt-4 text-lg font-semibold text-white">{feature.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{feature.desc}</p>
                    </article>
                  )
                })}
              </div>
            </div>

            <aside className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.92))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.42)]">
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-slate-950">
                <Image
                  src="/screenshots/dashboard.png"
                  alt="Dashboard do Aethel Studio"
                  width={1600}
                  height={960}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
              <div className="mt-5 rounded-[24px] border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-warning-light)]">Estado atual</p>
                <p className="mt-3 text-sm leading-6 text-[color-mix(in_srgb,var(--aethel-warning-light)_85%,transparent)]">
                  A base tecnica e forte, mas billing runtime, preview sandbox default e evidencia L4 continua dependente de ativacao externa.
                </p>
              </div>
            </aside>
          </section>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(300px,0.52fr)]">
            <div className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.92))] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Abrir email para vendas</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Monte o contexto e abra o contato comercial</h2>
                </div>
                <Mail className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                O CTA continua sendo um email local para <span className="font-medium text-white">sales@aethel.dev</span>.
                A diferenca agora e que a pagina organiza melhor o briefing e deixa claro o proximo passo.
              </p>

              <div className="mt-8 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Nome *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      className={fieldBase}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Email corporativo *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      className={fieldBase}
                      placeholder="voce@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Empresa *</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(event) => setFormData({ ...formData, company: event.target.value })}
                    className={fieldBase}
                    placeholder="Nome da empresa"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Cargo</label>
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                      className={fieldBase}
                      placeholder="Seu cargo"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Tamanho do time</label>
                    <select
                      value={formData.teamSize}
                      onChange={(event) => setFormData({ ...formData, teamSize: event.target.value })}
                      className={fieldBase}
                    >
                      <option value="" className="bg-slate-950">Selecione</option>
                      <option value="1-10" className="bg-slate-950">1-10</option>
                      <option value="11-50" className="bg-slate-950">11-50</option>
                      <option value="51-200" className="bg-slate-950">51-200</option>
                      <option value="201-500" className="bg-slate-950">201-500</option>
                      <option value="500+" className="bg-slate-950">500+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Contexto e requisitos</label>
                  <textarea
                    rows={5}
                    value={formData.message}
                    onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                    className={textAreaBase}
                    placeholder="Ex: necessidades de compliance, preview sandbox, billing enterprise, SSO, audit trail."
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href={requiredReady ? mailtoUrl : undefined}
                    aria-disabled={!requiredReady}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition ${
                      requiredReady
                        ? 'bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.92))] text-white shadow-[0_18px_40px_rgba(56,189,248,0.24)] hover:brightness-110'
                        : 'cursor-not-allowed border border-white/10 bg-white/[0.04] text-slate-500'
                    }`}
                  >
                    Abrir email para vendas
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <Link
                    href="/pricing"
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  >
                    Revisar pricing
                  </Link>
                </div>

                {!requiredReady && (
                  <p className="text-xs text-slate-500">Preencha nome, email e empresa para liberar o CTA de email.</p>
                )}
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Como isso funciona</p>
                <div className="mt-4 space-y-3">
                  {DEAL_STEPS.map((item, index) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-[11px] font-semibold text-slate-200">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-slate-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-400/10 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">Sem esconder lacunas</p>
                <p className="mt-3 text-sm leading-6 text-cyan-50/85">
                  Se o time precisar de CRM, procurement ou provas adicionais de maturidade, isso ainda entra na conversa humana. A pagina nao tenta mascarar esse gap.
                </p>
              </div>
            </aside>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
