import Link from 'next/link'
import {
  Sparkles,
  Check,
  ArrowRight,
  Zap,
  Users,
  Shield,
  Clock,
  Headphones,
} from 'lucide-react'

const plans = [
  {
    name: 'Free',
    description: 'Para começar e experimentar a plataforma',
    price: 0,
    priceNote: 'Grátis para sempre',
    cta: 'Começar grátis',
    ctaLink: '/register?plan=free',
    popular: false,
    features: [
      { text: '3 projetos ativos', included: true },
      { text: '100MB de armazenamento', included: true },
      { text: 'Editor completo', included: true },
      { text: '1.000 execuções AI/mês', included: true },
      { text: 'Suporte por email', included: true },
      { text: 'Colaboração básica', included: true },
      { text: 'Templates básicos', included: true },
      { text: 'Projetos privados', included: false },
      { text: 'Deploy automatizado', included: false },
      { text: 'Suporte prioritário', included: false },
    ],
  },
  {
    name: 'Pro',
    description: 'Para desenvolvedores e pequenos times',
    price: 29,
    priceNote: '/mês por usuário',
    cta: 'Iniciar teste de 14 dias',
    ctaLink: '/register?plan=pro',
    popular: true,
    features: [
      { text: 'Projetos ilimitados', included: true },
      { text: '50GB de armazenamento', included: true },
      { text: 'Editor completo + extensões', included: true },
      { text: '50.000 execuções AI/mês', included: true },
      { text: 'Suporte prioritário', included: true },
      { text: 'Colaboração em tempo real', included: true },
      { text: 'Templates premium', included: true },
      { text: 'Projetos privados', included: true },
      { text: 'Deploy automatizado', included: true },
      { text: 'Analytics avançado', included: true },
    ],
  },
  {
    name: 'Enterprise',
    description: 'Para grandes organizações',
    price: null,
    priceNote: 'Preço personalizado',
    cta: 'Falar com vendas',
    ctaLink: '/contact-sales',
    popular: false,
    features: [
      { text: 'Tudo do Pro, mais:', included: true },
      { text: 'Armazenamento ilimitado', included: true },
      { text: 'AI ilimitada', included: true },
      { text: 'SSO/SAML', included: true },
      { text: 'SLA garantido de 99.9%', included: true },
      { text: 'Audit logs', included: true },
      { text: 'Self-hosted option', included: true },
      { text: 'Gerente de conta dedicado', included: true },
      { text: 'Onboarding personalizado', included: true },
      { text: 'Suporte 24/7', included: true },
    ],
  },
]

const additionalFeatures = [
  {
    icon: Zap,
    title: 'Performance extrema',
    description: 'Infraestrutura otimizada para máxima velocidade',
  },
  {
    icon: Shield,
    title: 'Segurança enterprise',
    description: 'Criptografia end-to-end e compliance SOC2',
  },
  {
    icon: Users,
    title: 'Colaboração sem limites',
    description: 'Trabalhe com seu time em tempo real',
  },
  {
    icon: Clock,
    title: '99.9% Uptime',
    description: 'Infraestrutura redundante e confiável',
  },
]

const faqs = [
  {
    question: 'Posso trocar de plano a qualquer momento?',
    answer: 'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças são aplicadas imediatamente e os valores são calculados proporcionalmente.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer: 'Aceitamos cartões de crédito (Visa, Mastercard, American Express), PIX, boleto bancário e transferência bancária para planos anuais.',
  },
  {
    question: 'O que acontece quando acabo minhas execuções de AI?',
    answer: 'Você pode continuar usando a plataforma normalmente. As funcionalidades de AI ficam pausadas até o próximo ciclo de cobrança, ou você pode comprar créditos adicionais.',
  },
  {
    question: 'Existe desconto para planos anuais?',
    answer: 'Sim! Planos anuais têm 20% de desconto comparado ao pagamento mensal. Entre em contato para mais informações.',
  },
  {
    question: 'Como funciona o período de teste?',
    answer: 'O período de teste do plano Pro é de 14 dias com acesso completo a todas as funcionalidades. Não pedimos cartão de crédito para começar.',
  },
  {
    question: 'Vocês oferecem descontos para educação ou ONGs?',
    answer: 'Sim! Oferecemos descontos especiais para instituições educacionais, estudantes e organizações sem fins lucrativos. Entre em contato conosco para saber mais.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Aethel</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
              >
                Começar grátis
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Preços simples e{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
              transparentes
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Comece grátis e escale conforme seu projeto cresce. 
            Sem surpresas, sem taxas escondidas.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`
                  relative rounded-2xl p-8
                  ${plan.popular
                    ? 'bg-gradient-to-b from-indigo-600/20 to-purple-600/10 border-2 border-indigo-500'
                    : 'bg-slate-900 border border-slate-800'
                  }
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium rounded-full">
                      Mais popular
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm">{plan.description}</p>
                </div>

                <div className="mb-8">
                  {plan.price !== null ? (
                    <>
                      <span className="text-5xl font-bold text-white">
                        R${plan.price}
                      </span>
                      <span className="text-slate-400 ml-2">{plan.priceNote}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {plan.priceNote}
                    </span>
                  )}
                </div>

                <Link
                  href={plan.ctaLink}
                  className={`
                    flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium transition-all
                    ${plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }
                  `}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <div className="mt-8 pt-8 border-t border-slate-700/50">
                  <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check
                          className={`w-5 h-5 mt-0.5 ${
                            feature.included
                              ? 'text-emerald-400'
                              : 'text-slate-600'
                          }`}
                        />
                        <span
                          className={
                            feature.included ? 'text-slate-300' : 'text-slate-600'
                          }
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Incluído em todos os planos
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {additionalFeatures.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Perguntas frequentes
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="p-6 bg-slate-900 border border-slate-800 rounded-xl"
              >
                <h3 className="text-lg font-semibold text-white mb-3">
                  {faq.question}
                </h3>
                <p className="text-slate-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-3xl">
            <Headphones className="w-12 h-12 text-indigo-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Precisa de ajuda para escolher?
            </h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto">
              Nosso time de vendas está pronto para ajudar você a encontrar 
              o plano perfeito para suas necessidades.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact-sales"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
              >
                Falar com vendas
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
              >
                Ver documentação
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-400">
            © 2025 Aethel Engine. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
