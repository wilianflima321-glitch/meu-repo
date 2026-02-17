'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Send,
  Mail,
  MessageSquare,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  Building,
  Users,
  Briefcase,
} from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'

const contactReasons = [
  { value: 'sales', label: 'Falar com vendas', icon: Briefcase },
  { value: 'support', label: 'Suporte técnico', icon: MessageSquare },
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <Card variant="elevated" padding="lg" className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Mensagem enviada!
          </h1>
          <p className="text-slate-400 mb-6">
            Obrigado pelo contato. Nossa equipe responderá em até 24 horas úteis.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            Voltar ao início
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Aethel</span>
            </Link>
            <Link
              href="/login"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left Column - Info */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Entre em contato
            </h1>
            <p className="text-xl text-slate-400 mb-12">
              Estamos aqui para ajudar. Preencha o formulário e nossa equipe
              entrará em contato o mais breve possível.
            </p>

            {/* Contact Info */}
            <div className="space-y-6 mb-12">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Email</h3>
                  <p className="text-slate-400">contato@aethel.io</p>
                  <p className="text-slate-400">suporte@aethel.io</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Telefone</h3>
                  <p className="text-slate-400">+55 (11) 4000-0000</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Endereço</h3>
                  <p className="text-slate-400">
                    Av. Paulista, 1000 - Bela Vista
                    <br />
                    São Paulo - SP, 01310-100
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Horário</h3>
                  <p className="text-slate-400">
                    Segunda a Sexta: 9h - 18h
                    <br />
                    Suporte 24/7 para planos Pro e Enterprise
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="text-white font-medium mb-2">
                Perguntas frequentes
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Talvez sua dúvida já tenha sido respondida em nossa FAQ.
              </p>
              <Link
                href="/pricing#faq"
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                Ver perguntas frequentes →
              </Link>
            </div>
          </div>

          {/* Right Column - Form */}
          <div>
            <Card variant="elevated" padding="lg">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Nome"
                    name="name"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <Input
                  label="Empresa (opcional)"
                  name="company"
                  placeholder="Nome da empresa"
                  value={formData.company}
                  onChange={handleChange}
                />

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Motivo do contato
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {contactReasons.map((reason) => (
                      <button
                        key={reason.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, reason: reason.value }))
                        }
                        className={`
                          flex items-center gap-3 p-4 rounded-xl border transition-all text-left
                          ${
                            formData.reason === reason.value
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                          }
                        `}
                      >
                        <reason.icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{reason.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    name="message"
                    placeholder="Como podemos ajudar?"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    required
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={loading}
                  icon={!loading && <Send className="w-4 h-4" />}
                  iconPosition="right"
                >
                  {loading ? 'Enviando...' : 'Enviar mensagem'}
                </Button>

                <p className="text-xs text-slate-500 text-center">
                  Ao enviar, você concorda com nossa{' '}
                  <Link href="/privacy" className="text-slate-400 hover:text-slate-300">
                    Política de Privacidade
                  </Link>
                </p>
              </form>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
