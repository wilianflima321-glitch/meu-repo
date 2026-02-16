'use client';

import { useState } from 'react';
import Link from 'next/link';

const SparklesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const features = [
  { icon: 'SSO', title: 'SSO/SAML', desc: 'Single Sign-On para toda a organizacao' },
  { icon: 'SEC', title: 'SOC2 Compliance', desc: 'Seguranca de nivel enterprise' },
  { icon: 'ANL', title: 'Analytics Avancados', desc: 'Metricas detalhadas de uso e performance' },
  { icon: 'SLA', title: 'SLA 99.99%', desc: 'Uptime garantido em contrato' },
  { icon: 'CSM', title: 'Gerente Dedicado', desc: 'Suporte personalizado para seu time' },
  { icon: 'ONB', title: 'Onboarding Custom', desc: 'Treinamento e setup personalizado' },
];

export default function ContactSalesPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    teamSize: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />
        </div>

        <div className="relative text-center max-w-lg">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold mb-4">Mensagem enviada!</h1>
          <p className="text-slate-400 text-lg mb-8">
            Obrigado pelo seu interesse. Nossa equipe de vendas entrara em contato em ate 24 horas uteis.
          </p>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
          >
            Voltar ao inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[150px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center">
              <SparklesIcon />
            </div>
            <span className="text-xl font-bold">Aethel</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-slate-400 hover:text-white transition-colors">
              Precos
            </Link>
            <Link
              href="/register"
              className="h-9 px-4 flex items-center bg-white text-black font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Comecar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="relative pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left - Info */}
            <div className="lg:pt-8">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium mb-6">
                Enterprise
              </span>

              <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
                Solucoes para{' '}
                <span className="bg-gradient-to-r from-blue-400 to-sky-400 bg-clip-text text-transparent">
                  grandes times
                </span>
              </h1>

              <p className="text-xl text-slate-400 mb-10 leading-relaxed">
                Agende uma demonstracao personalizada e descubra como o Aethel pode transformar a produtividade do seu time de desenvolvimento.
              </p>

              {/* Features */}
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <span className="text-xs font-bold tracking-[0.2em] text-slate-300 mb-2 block">{feature.icon}</span>
                    <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-400">{feature.desc}</p>
                  </div>
                ))}
              </div>

              {/* Trusted By */}
              <div className="mt-10 pt-10 border-t border-white/10">
                <p className="text-sm text-slate-500 mb-4">Confiado por empresas inovadoras</p>
                <div className="flex items-center gap-8 text-slate-600">
                  <span className="text-lg font-bold">TechCorp</span>
                  <span className="text-lg font-bold">StartupX</span>
                  <span className="text-lg font-bold">DevHouse</span>
                </div>
              </div>
            </div>

            {/* Right - Form */}
            <div className="lg:pt-8">
              <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6">Agende uma demo</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nome *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        placeholder="Seu nome"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        E-mail corporativo *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        placeholder="voce@empresa.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      placeholder="Nome da empresa"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Cargo
                      </label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        placeholder="Seu cargo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Tamanho do time
                      </label>
                      <select
                        value={formData.teamSize}
                        onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                        className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
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
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Como podemos ajudar?
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
                      placeholder="Conte-nos sobre suas necessidades..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-sky-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-sky-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Enviando...' : 'Agendar demonstracao'}
                  </button>

                  <p className="text-xs text-slate-500 text-center">
                    Ao enviar, voce concorda com nossa{' '}
                    <Link href="/privacy" className="text-blue-400 hover:underline">
                      Politica de Privacidade
                    </Link>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


