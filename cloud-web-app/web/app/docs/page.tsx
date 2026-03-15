'use client'

import Link from 'next/link'
import { Book, Code2, Rocket, Layers, Terminal, Puzzle, Search, ChevronRight, ExternalLink } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const sections = [
  {
    title: 'Guia de inicio',
    description: 'Comece a usar o Aethel com passos diretos.',
    icon: Rocket,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    items: [
      { title: 'Instalacao', href: '/docs/getting-started/installation' },
      { title: 'Primeiro projeto', href: '/docs/getting-started/first-project' },
      { title: 'Configuracao', href: '/docs/getting-started/configuration' },
      { title: 'Conceitos base', href: '/docs/getting-started/concepts' },
    ],
  },
  {
    title: 'API Reference',
    description: 'Documentacao tecnica da API.',
    icon: Code2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    items: [
      { title: 'Autenticacao', href: '/docs/api/authentication' },
      { title: 'Endpoints', href: '/docs/api/endpoints' },
      { title: 'Webhooks', href: '/docs/api/webhooks' },
      { title: 'Rate limits', href: '/docs/api/rate-limits' },
    ],
  },
  {
    title: 'Componentes',
    description: 'Biblioteca UI e padroes do studio.',
    icon: Layers,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    items: [
      { title: 'Buttons', href: '/docs/components/button' },
      { title: 'Inputs', href: '/docs/components/input' },
      { title: 'Cards', href: '/docs/components/card' },
      { title: 'Modals', href: '/docs/components/modal' },
    ],
  },
  {
    title: 'CLI',
    description: 'Ferramentas de linha de comando.',
    icon: Terminal,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    items: [
      { title: 'Instalacao', href: '/docs/cli/installation' },
      { title: 'Comandos', href: '/docs/cli/commands' },
      { title: 'Configuracao', href: '/docs/cli/config' },
      { title: 'Plugins', href: '/docs/cli/plugins' },
    ],
  },
  {
    title: 'Integracoes',
    description: 'Conecte com ferramentas externas.',
    icon: Puzzle,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    items: [
      { title: 'GitHub', href: '/docs/integrations/github' },
      { title: 'VS Code', href: '/docs/integrations/vscode' },
      { title: 'Vercel', href: '/docs/integrations/vercel' },
      { title: 'AWS', href: '/docs/integrations/aws' },
    ],
  },
  {
    title: 'Guias avancados',
    description: 'Operacao, seguranca e escala.',
    icon: Book,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    items: [
      { title: 'Performance', href: '/docs/guides/performance' },
      { title: 'Seguranca', href: '/docs/guides/security' },
      { title: 'Escalabilidade', href: '/docs/guides/scaling' },
      { title: 'Testing', href: '/docs/guides/testing' },
    ],
  },
]

const popularArticles = [
  { title: 'Como criar seu primeiro projeto', views: '12.4k' },
  { title: 'Configurando autenticacao OAuth', views: '8.2k' },
  { title: 'Boas praticas de performance', views: '6.8k' },
  { title: 'Integrando com GitHub Actions', views: '5.3k' },
  { title: 'Variaveis de ambiente', views: '4.9k' },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-blue-600/[0.06] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-cyan-600/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-5xl px-6 pt-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-300">
            Documentacao oficial
          </div>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Como podemos ajudar?</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Tutoriais, referencias e guias para operar o Aethel Studio com evidencias reais.
          </p>

          <div className="mx-auto mt-8 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar artigos, guias, API..."
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 text-white placeholder-slate-500 transition-colors focus:border-blue-500/60 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <div
                key={section.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${section.bgColor}`}>
                  <section.icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <p className="mt-2 text-sm text-slate-400">{section.description}</p>
                <ul className="mt-4 space-y-2">
                  {section.items.map((item) => (
                    <li key={item.title}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-blue-300"
                      >
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-5xl px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Artigos populares</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Mais acessados</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {popularArticles.map((article) => (
              <Link
                key={article.title}
                href="#"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-blue-500/40"
              >
                <div className="flex items-center gap-3">
                  <Book className="h-5 w-5 text-slate-500" />
                  <span className="text-sm text-slate-200">{article.title}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{article.views} views</span>
                  <ExternalLink className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-5xl px-6 pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            <Link
              href="/docs/changelog"
              className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/20 to-cyan-600/10 p-6 text-white transition-colors hover:border-blue-500/50"
            >
              <h3 className="text-lg font-semibold">Changelog</h3>
              <p className="mt-2 text-sm text-slate-200">
                Acompanhe releases, gates e melhorias publicas.
              </p>
            </Link>
            <Link
              href="/docs/support"
              className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600/20 to-teal-600/10 p-6 text-white transition-colors hover:border-emerald-500/50"
            >
              <h3 className="text-lg font-semibold">Suporte</h3>
              <p className="mt-2 text-sm text-slate-200">
                Abra tickets ou fale com o time diretamente.
              </p>
            </Link>
            <Link
              href="/docs/community"
              className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-600/20 to-orange-600/10 p-6 text-white transition-colors hover:border-amber-500/50"
            >
              <h3 className="text-lg font-semibold">Comunidade</h3>
              <p className="mt-2 text-sm text-slate-200">
                Participe do Discord e feedback loops.
              </p>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
