'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
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
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

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
        answer: 'Acesse a p?gina de cadastro e siga o fluxo guiado. O cadastro leva poucos minutos e j? permite iniciar um projeto com templates prontos.',
      },
      {
        question: 'Preciso instalar algo no meu computador?',
        answer: 'N?o. O Aethel roda no navegador. Para uso offline ou performance local, o app desktop pode ser usado quando dispon?vel.',
      },
      {
        question: 'Quais linguagens s?o suportadas?',
        answer: 'O IDE suporta JavaScript/TypeScript, Python, Java, C#, Go, Rust, PHP e outras. A IA entende o contexto do projeto e gera c?digo de acordo com a stack.',
      },
      {
        question: 'Posso importar projetos existentes?',
        answer: 'Sim. Voc? pode importar projetos via GitHub ou upload ZIP. O sistema detecta a stack e configura o ambiente automaticamente.',
      },
    ],
  },
  {
    name: 'Planos e pagamentos',
    icon: CreditCard,
    faqs: [
      {
        question: 'Qual a diferen?a entre os planos?',
        answer: 'Os planos variam por limites de projetos, tokens de IA, colabora??o e acesso a recursos avan?ados (preview sandbox, RAG, deploy). Os detalhes est?o na p?gina de pricing.',
      },
      {
        question: 'Preciso de cart?o de cr?dito para come?ar?',
        answer: 'Voc? pode iniciar pelo plano gratuito. Quando o checkout Stripe estiver ativo, os planos pagos poder?o ser contratados diretamente pela plataforma.',
      },
      {
        question: 'Como funciona a cobran?a?',
        answer: 'A cobran?a ? mensal ou anual (com desconto no ciclo anual). O gateway padr?o ? Stripe. Ajustes e cancelamentos ficam dispon?veis no portal do cliente.',
      },
      {
        question: 'O que acontece se eu exceder minha cota?',
        answer: 'Voc? recebe avisos antes de atingir o limite. Quando a cota estoura, novas execu??es de IA ficam suspensas at? o ciclo seguinte ou upgrade de plano.',
      },
    ],
  },
  {
    name: 'Funcionalidades',
    icon: Settings,
    faqs: [
      {
        question: 'Como funciona a IA do Aethel?',
        answer: 'O sistema opera com agentes especializados (Architect, Engineer, Critic) e aplica mudan?as com valida??o e rollback. Nada ? tratado como ?sucesso? sem evid?ncia.',
      },
      {
        question: 'Existe colabora??o em tempo real?',
        answer: 'Sim, com limites por plano. Colabora??o avan?ada e stress tests ficam mais completos nos tiers superiores.',
      },
      {
        question: 'Posso integrar com meu CI/CD?',
        answer: 'Sim. O Aethel se integra com GitHub Actions e outros fluxos. Deploy one-click est? em fase de ativa??o para servi?os compat?veis.',
      },
      {
        question: 'O preview ? em sandbox real?',
        answer: 'O preview ? can?nico e unificado. O sandbox gerenciado (E2B/WebContainers) entra como default assim que o token e o runtime estiverem ativos.',
      },
    ],
  },
  {
    name: 'Seguran?a e privacidade',
    icon: Shield,
    faqs: [
      {
        question: 'Meu c?digo est? seguro no Aethel?',
        answer: 'Sim. Os dados s?o criptografados em tr?nsito (TLS). Para dados em repouso e vault de credenciais, seguimos a pol?tica de seguran?a descrita na documenta??o.',
      },
      {
        question: 'A IA treina com meu c?digo?',
        answer: 'N?o. O c?digo s? ? enviado ao provider quando voc? solicita uma a??o. N?o usamos o seu c?digo para treinar modelos sem consentimento expl?cito.',
      },
      {
        question: 'Voc?s possuem certifica??es de seguran?a?',
        answer: 'Estamos estruturando o caminho para SOC2 e compliance completo. As evid?ncias p?blicas ser?o publicadas conforme o processo avan?ar.',
      },
      {
        question: 'Onde meus dados ficam?',
        answer: 'O ambiente pode operar em regi?es espec?ficas via cloud providers. Para requisitos enterprise, a regi?o ? negociada com o time comercial.',
      },
    ],
  },
  {
    name: 'Times e colabora??o',
    icon: Users,
    faqs: [
      {
        question: 'Como adiciono membros ao meu time?',
        answer: 'No painel, acesse Configura??es ? Time. Voc? pode convidar pessoas por email e controlar permiss?es por papel.',
      },
      {
        question: 'Quais n?veis de permiss?o est?o dispon?veis?',
        answer: 'Visualizador, Editor e Admin. Pap?is customizados e RBAC completo ficam dispon?veis nos planos superiores.',
      },
      {
        question: 'Posso ter projetos privados e p?blicos?',
        answer: 'Sim. Cada projeto tem controle de visibilidade e acesso, ajust?vel pelo propriet?rio.',
      },
      {
        question: 'O faturamento ? por usu?rio?',
        answer: 'Sim, os planos em geral escalam por assentos. O detalhamento completo aparece no pricing e no portal de billing quando ativo.',
      },
    ],
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Primeiros passos')
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)
  const [helpful, setHelpful] = useState<Record<string, boolean | null>>({})

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      faqs: cat.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat) => searchQuery === '' || cat.faqs.length > 0)

  const handleHelpful = (question: string, isHelpful: boolean) => {
    setHelpful((prev) => ({ ...prev, [question]: isHelpful }))
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-blue-600/[0.06] blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-sky-600/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pt-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-300">
            Central de ajuda
          </div>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Como podemos ajudar?</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Respostas objetivas, sem promessas infladas. Se faltar evid?ncia, n?s falamos.
          </p>

          <div className="mx-auto mt-8 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar perguntas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 text-white placeholder-slate-500 transition-colors focus:border-blue-500/60 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-6xl px-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Link
              href="/docs"
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-blue-500/40 hover:bg-white/[0.06]"
            >
              <Book className="mb-2 h-6 w-6 text-blue-400" />
              <h3 className="text-sm font-semibold text-white group-hover:text-blue-300">Documenta??o</h3>
              <p className="mt-1 text-xs text-slate-500">Guias e refer?ncia t?cnica</p>
            </Link>
            <Link
              href="/contact"
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-emerald-500/40 hover:bg-white/[0.06]"
            >
              <MessageSquare className="mb-2 h-6 w-6 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300">Suporte</h3>
              <p className="mt-1 text-xs text-slate-500">Fale com o time</p>
            </Link>
            <Link
              href="/status"
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-yellow-500/40 hover:bg-white/[0.06]"
            >
              <Zap className="mb-2 h-6 w-6 text-yellow-400" />
              <h3 className="text-sm font-semibold text-white group-hover:text-yellow-300">Status</h3>
              <p className="mt-1 text-xs text-slate-500">Checks p?blicos em tempo real</p>
            </Link>
            <Link
              href="https://discord.gg/aethel"
              target="_blank"
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-cyan-500/40 hover:bg-white/[0.06]"
            >
              <Users className="mb-2 h-6 w-6 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300">Comunidade</h3>
              <p className="mt-1 text-xs text-slate-500">Discord oficial</p>
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-6xl px-6 pb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Perguntas frequentes</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Atualizado continuamente</span>
          </div>

          <div className="mt-6 space-y-4">
            {filteredCategories.map((category) => (
              <div
                key={category.name}
                className="rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <button
                  onClick={() =>
                    setExpandedCategory(expandedCategory === category.name ? null : category.name)
                  }
                  className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                    <category.icon className="h-5 w-5" />
                  </div>
                  <span className="flex-1 font-medium text-white">{category.name}</span>
                  <span className="text-xs text-slate-500">{category.faqs.length} perguntas</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      expandedCategory === category.name ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedCategory === category.name && (
                  <div className="border-t border-white/10">
                    {category.faqs.map((faq) => (
                      <div key={faq.question} className="border-b border-white/10 last:border-0">
                        <button
                          onClick={() =>
                            setExpandedFaq(expandedFaq === faq.question ? null : faq.question)
                          }
                          className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-white/[0.02]"
                        >
                          <span className="text-sm text-slate-200">{faq.question}</span>
                          <ChevronRight
                            className={`h-4 w-4 text-slate-500 transition-transform ${
                              expandedFaq === faq.question ? 'rotate-90' : ''
                            }`}
                          />
                        </button>

                        {expandedFaq === faq.question && (
                          <div className="px-6 pb-5">
                            <p className="text-sm text-slate-400">{faq.answer}</p>
                            <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-4">
                              <span className="text-xs text-slate-500">Esta resposta foi ?til?</span>
                              <button
                                onClick={() => handleHelpful(faq.question, true)}
                                className={`rounded-lg p-2 transition-colors ${
                                  helpful[faq.question] === true
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'text-slate-400 hover:bg-white/[0.06]'
                                }`}
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleHelpful(faq.question, false)}
                                className={`rounded-lg p-2 transition-colors ${
                                  helpful[faq.question] === false
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'text-slate-400 hover:bg-white/[0.06]'
                                }`}
                              >
                                <ThumbsDown className="h-4 w-4" />
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
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-transparent p-10 text-center">
            <h3 className="text-2xl font-semibold text-white">Ainda precisa de ajuda?</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
              Nosso time responde por email ou comunidade. Em demandas enterprise, fale direto com vendas.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="aethel-button aethel-button-primary rounded-xl px-6 py-3 text-sm font-semibold"
              >
                <MessageSquare className="h-4 w-4" />
                Abrir ticket
              </Link>
              <Link
                href="/contact-sales"
                className="aethel-button aethel-button-secondary rounded-xl px-6 py-3 text-sm font-semibold"
              >
                Falar com vendas
              </Link>
              <Link
                href="https://discord.gg/aethel"
                target="_blank"
                className="aethel-button aethel-button-ghost rounded-xl px-6 py-3 text-sm font-semibold"
              >
                <ExternalLink className="h-4 w-4" />
                Discord
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
