'use client'

import Link from 'next/link'
import { 
  Sparkles, 
  Book, 
  Code2, 
  Rocket, 
  Layers, 
  Terminal,
  Puzzle,
  Search,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'

const sections = [
  {
    title: 'Guia de Início',
    description: 'Comece a usar a Aethel em minutos',
    icon: Rocket,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    items: [
      { title: 'Instalação', href: '/docs/getting-started/installation' },
      { title: 'Primeiro Projeto', href: '/docs/getting-started/first-project' },
      { title: 'Configuração', href: '/docs/getting-started/configuration' },
      { title: 'Conceitos Básicos', href: '/docs/getting-started/concepts' },
    ],
  },
  {
    title: 'API Reference',
    description: 'Documentação completa da API',
    icon: Code2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    items: [
      { title: 'Autenticação', href: '/docs/api/authentication' },
      { title: 'Endpoints', href: '/docs/api/endpoints' },
      { title: 'Webhooks', href: '/docs/api/webhooks' },
      { title: 'Rate Limits', href: '/docs/api/rate-limits' },
    ],
  },
  {
    title: 'Componentes',
    description: 'Biblioteca de componentes UI',
    icon: Layers,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    items: [
      { title: 'Button', href: '/docs/components/button' },
      { title: 'Input', href: '/docs/components/input' },
      { title: 'Card', href: '/docs/components/card' },
      { title: 'Modal', href: '/docs/components/modal' },
    ],
  },
  {
    title: 'CLI',
    description: 'Interface de linha de comando',
    icon: Terminal,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    items: [
      { title: 'Instalação', href: '/docs/cli/installation' },
      { title: 'Comandos', href: '/docs/cli/commands' },
      { title: 'Configuração', href: '/docs/cli/config' },
      { title: 'Plugins', href: '/docs/cli/plugins' },
    ],
  },
  {
    title: 'Integrações',
    description: 'Conecte com suas ferramentas favoritas',
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
    title: 'Guias Avançados',
    description: 'Domine recursos avançados',
    icon: Book,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    items: [
      { title: 'Performance', href: '/docs/guides/performance' },
      { title: 'Segurança', href: '/docs/guides/security' },
      { title: 'Escalabilidade', href: '/docs/guides/scaling' },
      { title: 'Testing', href: '/docs/guides/testing' },
    ],
  },
]

const popularArticles = [
  { title: 'Como criar seu primeiro projeto', views: '12.4k' },
  { title: 'Configurando autenticação OAuth', views: '8.2k' },
  { title: 'Melhores práticas de performance', views: '6.8k' },
  { title: 'Integrando com GitHub Actions', views: '5.3k' },
  { title: 'Trabalhando com variáveis de ambiente', views: '4.9k' },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Aethel</span>
              </Link>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-medium">Documentação</span>
            </div>
            
            {/* Search */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar na documentação... (⌘K)"
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="https://github.com/aethel"
                className="text-slate-400 hover:text-white transition-colors"
                target="_blank"
              >
                GitHub
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-6 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Como podemos ajudar?
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Encontre tutoriais, guias e referências para construir com a Aethel
          </p>
          
          {/* Large Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar artigos, tutoriais, API..."
              className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-lg"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* Sections Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {sections.map((section) => (
            <div
              key={section.title}
              className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors"
            >
              <div className={`w-12 h-12 ${section.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                <section.icon className={`w-6 h-6 ${section.color}`} />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {section.title}
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                {section.description}
              </p>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 text-slate-300 hover:text-blue-400 transition-colors group"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Popular Articles */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">
            Artigos Populares
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {popularArticles.map((article) => (
              <Link
                key={article.title}
                href="#"
                className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-blue-500/50 hover:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Book className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  <span className="text-slate-300 group-hover:text-white transition-colors">
                    {article.title}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">{article.views} views</span>
                  <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="grid md:grid-cols-3 gap-6">
          <Link
            href="/docs/changelog"
            className="p-6 bg-gradient-to-br from-blue-600/20 to-cyan-600/10 border border-blue-500/30 rounded-2xl hover:border-blue-500/50 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              📝 Changelog
            </h3>
            <p className="text-slate-400 text-sm">
              Veja as últimas atualizações e novidades da plataforma
            </p>
          </Link>
          
          <Link
            href="/docs/support"
            className="p-6 bg-gradient-to-br from-emerald-600/20 to-teal-600/10 border border-emerald-500/30 rounded-2xl hover:border-emerald-500/50 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              💬 Suporte
            </h3>
            <p className="text-slate-400 text-sm">
              Precisa de ajuda? Entre em contato com nossa equipe
            </p>
          </Link>
          
          <Link
            href="/docs/community"
            className="p-6 bg-gradient-to-br from-amber-600/20 to-orange-600/10 border border-amber-500/30 rounded-2xl hover:border-amber-500/50 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              🌐 Comunidade
            </h3>
            <p className="text-slate-400 text-sm">
              Participe das discussões no Discord e GitHub
            </p>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-500">
            Não encontrou o que procurava?{' '}
            <Link href="/contact" className="text-blue-400 hover:text-blue-300">
              Entre em contato
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
