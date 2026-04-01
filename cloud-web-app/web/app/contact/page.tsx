'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Send, Mail, MessageSquare, Phone, MapPin, Clock, CheckCircle, Building, Users, Briefcase } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const contactReasons = [
  { value: 'sales', label: 'Falar com vendas', icon: Briefcase },
  { value: 'support', label: 'Suporte tecnico', icon: MessageSquare },
  { value: 'enterprise', label: 'Plano Enterprise', icon: Building },
  { value: 'partnership', label: 'Parcerias', icon: Users },
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    reason: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'Falha ao enviar mensagem')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
        <PublicHeader />
        <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]">
              <CheckCircle className="h-8 w-8 text-[var(--aethel-success)]" />
            </div>
            <h1 className="text-2xl font-bold">Mensagem enviada</h1>
            <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
              Obrigado pelo contato. Respondemos por email em ate 24 horas uteis.
            </p>
            <Link
              href="/"
              className="aethel-button aethel-button-primary mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-semibold"
            >
              Voltar ao inicio
            </Link>
          </div>
        </main>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-primary-dark)]/[0.06] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--aethel-info)]/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pt-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-primary)]/20 bg-[var(--aethel-primary)]/10 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">
            Contato
          </div>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Entre em contato</h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--aethel-text-secondary)]">
            Envie sua mensagem e descreva seu contexto. Se for enterprise, detalhe requisitos de compliance.
          </p>
        </section>

        <section className="mx-auto mt-10 max-w-6xl px-6 pb-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
                <h2 className="text-lg font-semibold">Canais</h2>
                <div className="mt-4 space-y-4 text-sm text-[var(--aethel-text-secondary)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--aethel-primary)]/10 text-[var(--aethel-primary-light)]">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[var(--aethel-text-primary)]">Email</p>
                      <p>contato@aethel.io</p>
                      <p>suporte@aethel.io</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--aethel-primary)]/10 text-[var(--aethel-primary-light)]">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[var(--aethel-text-primary)]">Telefone</p>
                      <p>+55 (11) 4000-0000</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--aethel-primary)]/10 text-[var(--aethel-primary-light)]">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[var(--aethel-text-primary)]">Endereco</p>
                      <p>Av. Paulista, 1000 - Bela Vista</p>
                      <p>Sao Paulo - SP</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--aethel-primary)]/10 text-[var(--aethel-primary-light)]">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[var(--aethel-text-primary)]">Horario</p>
                      <p>Seg a sex: 9h - 18h</p>
                      <p>Suporte estendido para planos avancados</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
                <h3 className="text-[var(--aethel-text-primary)] font-semibold">Perguntas frequentes</h3>
                <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
                  Algumas respostas estao na FAQ do pricing. Confira antes de abrir um ticket.
                </p>
                <Link
                  href="/pricing#faq"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-primary-light)]"
                >
                  Ver FAQ
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
              <h2 className="text-lg font-semibold">Envie sua mensagem</h2>
              <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
                Preencha o formulario com o maximo de contexto possivel.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {error && (
                  <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[var(--aethel-error)]/10 p-3 text-sm text-[var(--aethel-error-light)]">
                    {error}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">Nome</label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:outline-none focus:border-[var(--aethel-primary)]/60"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">Email</label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:outline-none focus:border-[var(--aethel-primary)]/60"
                      placeholder="voce@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">Empresa (opcional)</label>
                  <input
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:outline-none focus:border-[var(--aethel-primary)]/60"
                    placeholder="Nome da empresa"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">Motivo do contato</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {contactReasons.map((reason) => (
                      <button
                        key={reason.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, reason: reason.value }))
                        }
                        className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all ${
                          formData.reason == reason.value
                            ? 'border-[var(--aethel-primary)]/50 bg-[var(--aethel-primary)]/15 text-[var(--aethel-text-primary)]'
                            : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)]'
                        }`}
                      >
                        <reason.icon className="h-5 w-5" />
                        <span className="font-medium">{reason.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">Mensagem</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    required
                    className="w-full resize-none rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 py-3 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:outline-none focus:border-[var(--aethel-primary)]/60"
                    placeholder="Como podemos ajudar?"
                  />
                </div>

                <button
                  type="submit"
                  className="aethel-button aethel-button-primary w-full rounded-xl px-6 py-3 text-sm font-semibold"
                >
                  {loading ? 'Enviando...' : 'Enviar mensagem'}
                  {!loading && <Send className="h-4 w-4" />}
                </button>

                <p className="text-xs text-[var(--aethel-text-tertiary)] text-center">
                  Ao enviar, voce concorda com a nossa{' '}
                  <Link href="/privacy" className="text-[var(--aethel-primary-light)] hover:text-[var(--aethel-primary-light)]">
                    Politica de Privacidade
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
