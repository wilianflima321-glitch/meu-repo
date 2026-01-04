'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Search,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Book,
  Zap,
  Settings,
  CreditCard,
  Users,
  Shield,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'

interface FAQ {
  question: string
  answer: string
}

interface Category {
  name: string
  icon: typeof Search
  faqs: FAQ[]
}

const categories: Category[] = [
  {
    name: 'Primeiros passos',
    icon: Zap,
    faqs: [
      {
        question: 'Como criar minha primeira conta?',
        answer: 'Acesse aethel.io/register e siga o processo de cadastro. Você pode se registrar usando seu email ou fazer login com GitHub/Google. O processo leva menos de 2 minutos.',
      },
      {
        question: 'Preciso instalar algo no meu computador?',
        answer: 'Não! A Aethel é 100% baseada na nuvem. Você só precisa de um navegador moderno (Chrome, Firefox, Safari ou Edge). Para acesso offline, oferecemos um app desktop opcional.',
      },
      {
        question: 'Quais linguagens de programação são suportadas?',
        answer: 'Suportamos todas as principais linguagens: JavaScript/TypeScript, Python, Java, C#, Go, Rust, PHP, Ruby, e mais. A IA entende e gera código em qualquer uma delas.',
      },
      {
        question: 'Posso importar projetos existentes?',
        answer: 'Sim! Você pode importar projetos diretamente do GitHub, GitLab, Bitbucket ou fazer upload de arquivos ZIP. A Aethel detecta automaticamente as configurações do projeto.',
      },
    ],
  },
  {
    name: 'Planos e pagamentos',
    icon: CreditCard,
    faqs: [
      {
        question: 'Qual a diferença entre os planos?',
        answer: 'O plano Free é ideal para projetos pessoais e aprendizado. O Pro oferece recursos avançados como projetos ilimitados e mais execuções de IA. O Enterprise inclui SSO, SLA garantido e suporte dedicado.',
      },
      {
        question: 'Posso testar o plano Pro antes de assinar?',
        answer: 'Sim! Oferecemos 14 dias de teste gratuito do plano Pro, sem necessidade de cartão de crédito. Você terá acesso completo a todas as funcionalidades durante o período de teste.',
      },
      {
        question: 'Como funciona a cobrança?',
        answer: 'A cobrança é mensal ou anual (com 20% de desconto). Aceitamos cartões de crédito, PIX e boleto bancário. Você pode cancelar a qualquer momento sem multa.',
      },
      {
        question: 'O que acontece se eu exceder minha cota de IA?',
        answer: 'Você receberá um aviso quando estiver próximo do limite. Após atingir o limite, as funcionalidades de IA ficam pausadas até o próximo ciclo, mas você pode comprar créditos adicionais.',
      },
    ],
  },
  {
    name: 'Funcionalidades',
    icon: Settings,
    faqs: [
      {
        question: 'Como funciona a IA da Aethel?',
        answer: 'Nossa IA usa modelos de última geração treinados especificamente para programação. Ela pode gerar código, explicar trechos complexos, encontrar bugs, sugerir melhorias e muito mais.',
      },
      {
        question: 'Posso usar a Aethel offline?',
        answer: 'O editor web requer conexão à internet. No entanto, oferecemos um app desktop que permite trabalhar offline com sincronização automática quando você reconectar.',
      },
      {
        question: 'Como funciona a colaboração em tempo real?',
        answer: 'Disponível no plano Pro, a colaboração permite que múltiplos usuários editem o mesmo arquivo simultaneamente, com cursores coloridos, chat integrado e histórico de alterações.',
      },
      {
        question: 'Posso integrar com meu fluxo de CI/CD existente?',
        answer: 'Sim! Oferecemos integrações nativas com GitHub Actions, GitLab CI, Jenkins, CircleCI e outros. Também temos uma API completa para integrações customizadas.',
      },
    ],
  },
  {
    name: 'Segurança e privacidade',
    icon: Shield,
    faqs: [
      {
        question: 'Meu código está seguro na Aethel?',
        answer: 'Absolutamente. Usamos criptografia AES-256 para dados em repouso e TLS 1.3 para dados em trânsito. Somos compatíveis com SOC 2 Type II e GDPR.',
      },
      {
        question: 'A IA tem acesso ao meu código?',
        answer: 'A IA processa seu código apenas quando você a invoca explicitamente. Não usamos seu código para treinar nossos modelos sem consentimento expresso.',
      },
      {
        question: 'Onde meus dados são armazenados?',
        answer: 'Nossos servidores estão localizados no Brasil (São Paulo) e nos EUA. Clientes Enterprise podem escolher a região de armazenamento de acordo com requisitos de compliance.',
      },
      {
        question: 'Vocês têm certificações de segurança?',
        answer: 'Sim! Somos certificados SOC 2 Type II, ISO 27001, e estamos em conformidade com LGPD e GDPR. Realizamos auditorias de segurança trimestrais.',
      },
    ],
  },
  {
    name: 'Times e colaboração',
    icon: Users,
    faqs: [
      {
        question: 'Como adiciono membros ao meu time?',
        answer: 'No dashboard, vá em Configurações > Time > Convidar membros. Você pode convidar por email ou gerar um link de convite. Os convites expiram em 7 dias.',
      },
      {
        question: 'Quais são os níveis de permissão disponíveis?',
        answer: 'Oferecemos 4 níveis: Viewer (apenas leitura), Editor (pode editar), Admin (gerencia membros) e Owner (controle total). Você pode criar roles customizados no plano Enterprise.',
      },
      {
        question: 'Posso ter projetos privados e públicos?',
        answer: 'Sim! Projetos podem ser privados (apenas membros do time), internos (todos da organização) ou públicos (qualquer pessoa). A configuração está nas opções de cada projeto.',
      },
      {
        question: 'Como funciona o billing para times?',
        answer: 'O billing é por usuário ativo. Você paga apenas pelos membros que realmente usam a plataforma no mês. Usuários inativos não são cobrados.',
      },
    ],
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Primeiros passos')
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)
  const [helpful, setHelpful] = useState<Record<string, boolean | null>>({})

  const filteredCategories = categories.map((cat) => ({
    ...cat,
    faqs: cat.faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => searchQuery === '' || cat.faqs.length > 0)

  const handleHelpful = (question: string, isHelpful: boolean) => {
    setHelpful((prev) => ({ ...prev, [question]: isHelpful }))
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Aethel</span>
              </Link>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-medium">Central de Ajuda</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/contact"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Contato
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-6 border-b border-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Central de Ajuda
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Encontre respostas rápidas para suas dúvidas
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar perguntas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Link
            href="/docs"
            className="flex flex-col items-center gap-2 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/50 transition-colors text-center"
          >
            <Book className="w-6 h-6 text-indigo-400" />
            <span className="text-sm text-slate-300">Documentação</span>
          </Link>
          <Link
            href="/contact"
            className="flex flex-col items-center gap-2 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/50 transition-colors text-center"
          >
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            <span className="text-sm text-slate-300">Suporte</span>
          </Link>
          <Link
            href="https://status.aethel.io"
            className="flex flex-col items-center gap-2 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/50 transition-colors text-center"
            target="_blank"
          >
            <Zap className="w-6 h-6 text-amber-400" />
            <span className="text-sm text-slate-300">Status</span>
          </Link>
          <Link
            href="https://discord.gg/aethel"
            className="flex flex-col items-center gap-2 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/50 transition-colors text-center"
            target="_blank"
          >
            <Users className="w-6 h-6 text-purple-400" />
            <span className="text-sm text-slate-300">Comunidade</span>
          </Link>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <div
              key={category.name}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() =>
                  setExpandedCategory(
                    expandedCategory === category.name ? null : category.name
                  )
                }
                className="w-full flex items-center justify-between p-6 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <category.icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-white">
                      {category.name}
                    </h2>
                    <p className="text-sm text-slate-400">
                      {category.faqs.length} perguntas
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    expandedCategory === category.name ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* FAQs */}
              {expandedCategory === category.name && (
                <div className="border-t border-slate-800">
                  {category.faqs.map((faq) => (
                    <div
                      key={faq.question}
                      className="border-b border-slate-800 last:border-0"
                    >
                      <button
                        onClick={() =>
                          setExpandedFaq(
                            expandedFaq === faq.question ? null : faq.question
                          )
                        }
                        className="w-full flex items-center justify-between p-4 px-6 hover:bg-slate-800/30 transition-colors"
                      >
                        <span className="text-slate-200 text-left pr-4">
                          {faq.question}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${
                            expandedFaq === faq.question ? 'rotate-90' : ''
                          }`}
                        />
                      </button>

                      {expandedFaq === faq.question && (
                        <div className="px-6 pb-4">
                          <p className="text-slate-400 mb-4">{faq.answer}</p>
                          <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
                            <span className="text-sm text-slate-500">
                              Esta resposta foi útil?
                            </span>
                            <button
                              onClick={() => handleHelpful(faq.question, true)}
                              className={`p-2 rounded-lg transition-colors ${
                                helpful[faq.question] === true
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleHelpful(faq.question, false)}
                              className={`p-2 rounded-lg transition-colors ${
                                helpful[faq.question] === false
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still need help */}
        <div className="mt-12 p-8 bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/30 rounded-2xl text-center">
          <h3 className="text-xl font-semibold text-white mb-2">
            Ainda precisa de ajuda?
          </h3>
          <p className="text-slate-400 mb-6">
            Nossa equipe de suporte está pronta para ajudar você
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Abrir ticket
            </Link>
            <Link
              href="https://discord.gg/aethel"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
              target="_blank"
            >
              <ExternalLink className="w-4 h-4" />
              Discord
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
