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
      <div className="min-h-screen bg-black text-white">
        <PublicHeader />
        <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold">Mensagem enviada</h1>
            <p className="mt-3 text-sm text-slate-400">
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
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-blue-600/[0.06] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-cyan-600/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pt-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-300">
            Contato
          </div>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Entre em contato</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-400">
            Envie sua mensagem e descreva seu contexto. Se for enterprise, detalhe requisitos de compliance.
          </p>
        </section>

        <section className="mx-auto mt-10 max-w-6xl px-6 pb-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-lg font-semibold">Canais</h2>
                <div className="mt-4 space-y-4 text-sm text-slate-400">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-white">Email</p>
                      <p>contato@aethel.io</p>
                      <p>suporte@aethel.io</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-white">Telefone</p>
                      <p>+55 (11) 4000-0000</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-white">Endereco</p>
                      <p>Av. Paulista, 1000 - Bela Vista</p>
                      <p>Sao Paulo - SP</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-white">Horario</p>
                      <p>Seg a sex: 9h - 18h</p>
                      <p>Suporte estendido para planos avancados</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h3 className="text-white font-semibold">Perguntas frequentes</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Algumas respostas estao na FAQ do pricing. Confira antes de abrir um ticket.
                </p>
                <Link
                  href="/pricing#faq"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200"
                >
                  Ver FAQ
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold">Envie sua mensagem</h2>
              <p className="mt-2 text-sm text-slate-400">
                Preencha o formulario com o maximo de contexto possivel.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {error && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {error}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Nome</label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
                      placeholder="voce@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Empresa (opcional)</label>
                  <input
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
                    placeholder="Nome da empresa"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Motivo do contato</label>
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
                            ? 'border-blue-500/50 bg-blue-500/15 text-white'
                            : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <reason.icon className="h-5 w-5" />
                        <span className="font-medium">{reason.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Mensagem</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    required
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
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

                <p className="text-xs text-slate-500 text-center">
                  Ao enviar, voce concorda com a nossa{' '}
                  <Link href="/privacy" className="text-blue-300 hover:text-blue-200">
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
