import Link from 'next/link'

// === SVG Icons ===
const SparklesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const ZapIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HeadphonesIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const plans = [
  {
    id: 'free',
    name: 'Hobby',
    description: 'Perfeito para projetos pessoais e experimentação',
    price: 0,
    priceNote: 'Grátis para sempre',
    cta: 'Começar grátis',
    ctaLink: '/register?plan=free',
    popular: false,
    highlight: false,
    features: [
      { text: '3 projetos ativos', included: true },
      { text: '100MB de armazenamento', included: true },
      { text: 'Editor Monaco completo', included: true },
      { text: '1.000 requisições IA/mês', included: true },
      { text: 'Suporte por comunidade', included: true },
      { text: 'Templates básicos', included: true },
      { text: 'Projetos privados', included: false },
      { text: 'Colaboração em tempo real', included: false },
      { text: 'Deploy automatizado', included: false },
      { text: 'Suporte prioritário', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para desenvolvedores sérios e times pequenos',
    price: 29,
    priceNote: '/mês por usuário',
    cta: 'Iniciar teste de 14 dias',
    ctaLink: '/register?plan=pro',
    popular: true,
    highlight: true,
    features: [
      { text: 'Projetos ilimitados', included: true },
      { text: '50GB de armazenamento', included: true },
      { text: 'Editor + extensões premium', included: true },
      { text: '50.000 requisições IA/mês', included: true },
      { text: 'Suporte prioritário 24h', included: true },
      { text: 'Colaboração em tempo real', included: true },
      { text: 'Templates premium', included: true },
      { text: 'Projetos privados', included: true },
      { text: 'Deploy automatizado', included: true },
      { text: 'Analytics avançados', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Para organizações que precisam de escala',
    price: null,
    priceNote: 'Preço personalizado',
    cta: 'Falar com vendas',
    ctaLink: '/contact-sales',
    popular: false,
    highlight: false,
    features: [
      { text: 'Tudo do Pro, mais:', included: true },
      { text: 'Armazenamento ilimitado', included: true },
      { text: 'IA ilimitada + modelos custom', included: true },
      { text: 'SSO/SAML + SCIM', included: true },
      { text: 'SLA 99.99% garantido', included: true },
      { text: 'Logs de auditoria', included: true },
      { text: 'Opção self-hosted', included: true },
      { text: 'Gerente de conta dedicado', included: true },
      { text: 'Onboarding personalizado', included: true },
      { text: 'Suporte 24/7 premium', included: true },
    ],
  },
];

const additionalFeatures = [
  {
    icon: ZapIcon,
    title: 'Performance extrema',
    description: 'Infraestrutura edge para latência <50ms global',
  },
  {
    icon: ShieldIcon,
    title: 'Segurança enterprise',
    description: 'SOC2 Type II, criptografia end-to-end',
  },
  {
    icon: UsersIcon,
    title: 'Colaboração sem limites',
    description: 'Múltiplos cursores, presença em tempo real',
  },
  {
    icon: ClockIcon,
    title: '99.99% de uptime',
    description: 'Infraestrutura multi-região redundante',
  },
];

const faqs = [
  {
    question: 'Posso trocar de plano a qualquer momento?',
    answer: 'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças são aplicadas imediatamente e os valores são calculados proporcionalmente (pro-rata).',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer: 'Aceitamos cartões de crédito (Visa, Mastercard, Amex), PIX, boleto bancário e transferência bancária para planos anuais. Para Enterprise, também aceitamos faturamento.',
  },
  {
    question: 'O que acontece quando acabo minhas requisições de IA?',
    answer: 'Você pode continuar usando a plataforma normalmente. As funcionalidades de IA ficam pausadas até o próximo ciclo, ou você pode comprar créditos adicionais instantaneamente.',
  },
  {
    question: 'Existe desconto para planos anuais?',
    answer: 'Sim! Planos anuais têm 20% de desconto comparado ao pagamento mensal. O Pro anual sai por R$23/mês.',
  },
  {
    question: 'Como funciona o período de teste?',
    answer: 'O teste do Pro é de 14 dias com acesso completo a todas as funcionalidades. Não pedimos cartão de crédito para começar.',
  },
  {
    question: 'Vocês oferecem descontos para educação ou startups?',
    answer: 'Sim! Oferecemos 50% de desconto para estudantes e educadores, e programas especiais para startups early-stage. Entre em contato.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* === Background Effects === */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[150px]" />
      </div>

      {/* === Navbar === */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <SparklesIcon />
            </div>
            <span className="text-xl font-bold">Aethel</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link
              href="/register"
              className="h-9 px-4 flex items-center bg-white text-black font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* === Hero === */}
      <section className="relative pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            20% de desconto em planos anuais
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Preços simples,{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              poder ilimitado
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Comece grátis e escale conforme seu projeto cresce.
            Sem surpresas, sem taxas escondidas, sem compromisso.
          </p>
        </div>
      </section>

      {/* === Pricing Cards === */}
      <section className="relative px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`
                  relative rounded-2xl p-8 transition-all duration-300
                  ${plan.highlight
                    ? 'bg-gradient-to-b from-violet-500/20 via-fuchsia-500/10 to-transparent border-2 border-violet-500/50 shadow-2xl shadow-violet-500/20 scale-105'
                    : 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                  }
                `}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold rounded-full shadow-lg shadow-violet-500/30">
                      Mais popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  {plan.price !== null ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-white">R${plan.price}</span>
                      <span className="text-slate-400">{plan.priceNote}</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-white">{plan.priceNote}</span>
                  )}
                </div>

                {/* CTA Button */}
                <Link
                  href={plan.ctaLink}
                  className={`
                    flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold transition-all duration-200 group
                    ${plan.highlight
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                    }
                  `}
                >
                  {plan.cta}
                  <ArrowRightIcon />
                </Link>

                {/* Features */}
                <div className="mt-8 pt-8 border-t border-white/10">
                  <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        {feature.included ? (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckIcon className="w-3 h-3 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-500/10 flex items-center justify-center">
                            <XIcon className="w-3 h-3 text-slate-600" />
                          </div>
                        )}
                        <span className={feature.included ? 'text-slate-300' : 'text-slate-600'}>
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

      {/* === Additional Features === */}
      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Incluído em todos os planos
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Recursos essenciais que todo desenvolvedor precisa, independente do plano escolhido.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {additionalFeatures.map((feature) => (
              <div
                key={feature.title}
                className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/30 transition-all"
              >
                <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <feature.icon />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === Comparison Table === */}
      <section className="relative py-24 px-6 border-t border-white/5 hidden lg:block">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Comparação detalhada
          </h2>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Recurso</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white">Hobby</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-violet-400 bg-violet-500/10">Pro</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { feature: 'Projetos', hobby: '3', pro: 'Ilimitados', enterprise: 'Ilimitados' },
                  { feature: 'Armazenamento', hobby: '100MB', pro: '50GB', enterprise: 'Ilimitado' },
                  { feature: 'Requisições IA/mês', hobby: '1.000', pro: '50.000', enterprise: 'Ilimitado' },
                  { feature: 'Colaboradores', hobby: '1', pro: '10', enterprise: 'Ilimitados' },
                  { feature: 'SSO/SAML', hobby: '—', pro: '—', enterprise: '✓' },
                  { feature: 'SLA', hobby: '—', pro: '99.9%', enterprise: '99.99%' },
                  { feature: 'Suporte', hobby: 'Comunidade', pro: '24h', enterprise: '24/7 Premium' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-sm text-slate-300">{row.feature}</td>
                    <td className="px-6 py-4 text-center text-sm text-slate-400">{row.hobby}</td>
                    <td className="px-6 py-4 text-center text-sm text-white bg-violet-500/5">{row.pro}</td>
                    <td className="px-6 py-4 text-center text-sm text-slate-400">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* === FAQ === */}
      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            Perguntas frequentes
          </h2>
          <p className="text-slate-400 text-center mb-12">
            Tudo o que você precisa saber sobre nossos planos e preços.
          </p>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group p-6 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <h3 className="text-lg font-semibold text-white pr-4">{faq.question}</h3>
                  <div className="flex-shrink-0 text-slate-400 group-open:rotate-180 transition-transform">
                    <ChevronDownIcon />
                  </div>
                </summary>
                <p className="mt-4 text-slate-400 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA === */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl p-12 sm:p-16 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/20 to-pink-600/20 border border-violet-500/30">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-violet-500/20 rounded-full blur-[100px]" />

            <div className="relative text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white">
                <HeadphonesIcon />
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Precisa de ajuda para escolher?
              </h2>
              <p className="text-slate-300 mb-8 max-w-xl mx-auto leading-relaxed">
                Nosso time está pronto para ajudar você a encontrar o plano perfeito
                para suas necessidades. Agende uma demo sem compromisso.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact-sales"
                  className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-white text-black font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Falar com vendas
                  <ArrowRightIcon />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
                >
                  Ver documentação
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-slate-400 text-sm">
                © 2026 Aethel Engine. Todos os direitos reservados.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link href="/terms" className="hover:text-white transition-colors">Termos</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
              <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
              <Link href="/status" className="hover:text-white transition-colors">Status</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
