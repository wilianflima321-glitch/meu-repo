'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const enterpriseFeatures = [
  { icon: 'RBAC', title: 'Governanca e RBAC', desc: 'Controles operacionais, audit trail e readiness por superficie.' },
  { icon: 'AGT', title: 'Multi-agent orchestration', desc: 'Architect, Engineer e Critic com contratos explicitos.' },
  { icon: 'RCH', title: 'Research -> Plan -> Code', desc: 'Fluxo unico para times que precisam ir de analise a execucao.' },
  { icon: 'OPS', title: 'Acompanhamento de rollout', desc: 'Readiness, apply/rollback e trilha de mudancas auditavel.' },
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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-blue-600/[0.07] blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/[0.05] blur-[150px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 px-6 pb-16 pt-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <section className="lg:pt-8">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-300">
                Enterprise
              </span>

              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                Conversa comercial sem promessas infladas.
              </h1>

              <p className="mt-6 text-xl leading-relaxed text-slate-400">
                Esta pagina nao simula envio nem mostra logos inventados. Use o formulario para abrir um email pre-preenchido para o time comercial, com o contexto do seu time.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {enterpriseFeatures.map((feature) => (
                  <article key={feature.icon} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <span className="mb-2 block text-xs font-bold tracking-[0.2em] text-slate-300">{feature.icon}</span>
                    <h2 className="font-semibold text-white">{feature.title}</h2>
                    <p className="mt-1 text-sm text-slate-400">{feature.desc}</p>
                  </article>
                ))}
              </div>

              <div className="mt-10 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                <p className="text-sm font-semibold text-amber-200">Estado atual para compras enterprise</p>
                <p className="mt-2 text-sm leading-6 text-amber-100/85">
                  A base tecnica e forte, mas ainda existem lacunas objetivas em billing runtime, preview sandbox default e evidencia operacional de L4. Esta conversa comercial deve tratar o estado do produto como ele realmente esta.
                </p>
              </div>
            </section>

            <section className="lg:pt-8">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <h2 className="text-2xl font-bold">Abrir email para vendas</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Preencha os campos essenciais. O CTA abre seu cliente de email com o resumo pronto para enviar para <span className="font-medium text-white">sales@aethel.dev</span>.
                </p>

                <div className="mt-8 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Nome *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-slate-500 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Seu nome"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Email corporativo *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-slate-500 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="voce@empresa.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Empresa *</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-slate-500 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Nome da empresa"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Cargo</label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-slate-500 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Seu cargo"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Tamanho do time</label>
                      <select
                        value={formData.teamSize}
                        onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="" className="bg-zinc-900">Selecione</option>
                        <option value="1-10" className="bg-zinc-900">1-10</option>
                        <option value="11-50" className="bg-zinc-900">11-50</option>
                        <option value="51-200" className="bg-zinc-900">51-200</option>
                        <option value="201-500" className="bg-zinc-900">201-500</option>
                        <option value="500+" className="bg-zinc-900">500+</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Contexto e requisitos</label>
                    <textarea
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Ex: tamanho do time, necessidades de compliance, preview sandbox, billing enterprise, SSO."
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-medium text-white">Fluxo atual</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      O CTA abaixo abre um email local com o contexto preenchido. Ainda nao existe envio automatizado desta pagina para CRM.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <a
                      href={requiredReady ? mailtoUrl : undefined}
                      aria-disabled={!requiredReady}
                      className={`flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold transition-colors ${
                        requiredReady
                          ? 'bg-white text-black hover:bg-slate-200'
                          : 'cursor-not-allowed bg-white/10 text-slate-500'
                      }`}
                    >
                      Abrir email para vendas
                    </a>
                    <Link
                      href="/pricing"
                      className="flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      Revisar pricing
                    </Link>
                  </div>

                  {!requiredReady && (
                    <p className="text-xs text-slate-500">
                      Preencha nome, email e empresa para liberar o CTA de email.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
