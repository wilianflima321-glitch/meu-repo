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
    <div className="min-h-screen bg-black text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-primary-dark)]/[0.07] blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--aethel-info)]/[0.05] blur-[150px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 px-6 pb-16 pt-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <section className="lg:pt-8">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--aethel-primary)]/20 bg-[var(--aethel-primary)]/10 px-3 py-1.5 text-sm font-medium text-[var(--aethel-primary-light)]">
                Enterprise
              </span>

              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                Conversa comercial sem promessas infladas.
              </h1>

              <p className="mt-6 text-xl leading-relaxed text-[var(--aethel-text-secondary)]">
                Esta pagina nao simula envio nem mostra logos inventados. O CTA abaixo abre um email
                pre-preenchido com o contexto do seu time.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {enterpriseFeatures.map((feature) => (
                  <article key={feature.icon} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-4">
                    <span className="mb-2 block text-xs font-bold tracking-[0.2em] text-[var(--aethel-text-secondary)]">{feature.icon}</span>
                    <h2 className="font-semibold text-[var(--aethel-text-primary)]">{feature.title}</h2>
                    <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">{feature.desc}</p>
                  </article>
                ))}
              </div>

              <div className="mt-10 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-5">
                <p className="text-sm font-semibold text-[var(--aethel-warning-light)]">Estado atual para compras enterprise</p>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-warning-light)]/85">
                  A base tecnica e forte, mas ainda existem lacunas objetivas em billing runtime, preview sandbox default e evidencia operacional de L4. Esta conversa comercial deve tratar o estado do produto como ele realmente esta.
                </p>
              </div>
            </section>

            <section className="lg:pt-8">
              <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-8 backdrop-blur-sm">
                <h2 className="text-2xl font-bold">Abrir email para vendas</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  Preencha os campos essenciais. O CTA abre seu cliente de email com o resumo pronto para enviar para <span className="font-medium text-[var(--aethel-text-primary)]">sales@aethel.dev</span>.
                </p>

                <div className="mt-8 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">Nome *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] transition-all focus:border-[var(--aethel-primary)]/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Seu nome"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">Email corporativo *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] transition-all focus:border-[var(--aethel-primary)]/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="voce@empresa.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">Empresa *</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] transition-all focus:border-[var(--aethel-primary)]/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Nome da empresa"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">Cargo</label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] transition-all focus:border-[var(--aethel-primary)]/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Seu cargo"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">Tamanho do time</label>
                      <select
                        value={formData.teamSize}
                        onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                        className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] transition-all focus:border-[var(--aethel-primary)]/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="" className="bg-[var(--aethel-surface-secondary)]">Selecione</option>
                        <option value="1-10" className="bg-[var(--aethel-surface-secondary)]">1-10</option>
                        <option value="11-50" className="bg-[var(--aethel-surface-secondary)]">11-50</option>
                        <option value="51-200" className="bg-[var(--aethel-surface-secondary)]">51-200</option>
                        <option value="201-500" className="bg-[var(--aethel-surface-secondary)]">201-500</option>
                        <option value="500+" className="bg-[var(--aethel-surface-secondary)]">500+</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">Contexto e requisitos</label>
                    <textarea
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full resize-none rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 py-3 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] transition-all focus:border-[var(--aethel-primary)]/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Ex: tamanho do time, necessidades de compliance, preview sandbox, billing enterprise, SSO."
                    />
                  </div>

                  <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_20%,transparent)] p-4">
                    <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Fluxo atual</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                      O CTA abaixo abre um email local com o contexto preenchido. Ainda nao existe envio automatizado desta pagina para CRM.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <a
                      href={requiredReady ? mailtoUrl : undefined}
                      aria-disabled={!requiredReady}
                      className={`aethel-button w-full rounded-xl px-6 py-3 text-sm font-semibold ${
                        requiredReady
                          ? 'aethel-button-primary'
                          : 'cursor-not-allowed bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] text-[var(--aethel-text-tertiary)]'
                      }`}
                    >
                      Abrir email para vendas
                    </a>
                    <Link
                      href="/pricing"
                      className="aethel-button aethel-button-secondary w-full rounded-xl px-6 py-3 text-sm font-semibold"
                    >
                      Revisar pricing
                    </Link>
                  </div>

                  {!requiredReady && (
                    <p className="text-xs text-[var(--aethel-text-tertiary)]">
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
