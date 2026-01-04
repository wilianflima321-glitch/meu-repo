import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  Sparkles,
  Code,
  Brain,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Play,
  Star,
  Check,
  Github,
  Twitter,
  Linkedin,
  ChevronRight,
  Monitor,
  Cloud,
  Cpu,
} from 'lucide-react'

// Force dynamic rendering to avoid prerender issues with cookies()
export const dynamic = 'force-dynamic'

export default function LandingPage() {
  const token = cookies().get('token')?.value
  if (token) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>IA de próxima geração para desenvolvimento</span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="block text-white">A IDE que</span>
            <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              escreve código com você
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-xl text-slate-400 mb-10">
            Aethel combina o poder de múltiplos agentes de IA com uma IDE profissional.
            Gere, refatore e debugue código 10x mais rápido.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="group flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              Começar Grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#demo"
              className="flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-300 border border-slate-700"
            >
              <Play className="w-5 h-5" />
              Ver Demo
            </Link>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-slate-400">
              <span className="text-white font-semibold">4.9/5</span> de mais de{' '}
              <span className="text-white font-semibold">10.000+</span> desenvolvedores
            </p>
          </div>

          {/* Hero Image/Demo */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
            <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl shadow-black/50">
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-2 border-b border-slate-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <span className="text-sm text-slate-500 ml-2">Aethel IDE</span>
              </div>
              <div className="aspect-video bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                  <Code className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-600">Demo interativa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo que você precisa para{' '}
              <span className="text-indigo-400">desenvolver melhor</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Uma plataforma completa que combina IDE profissional, IA avançada e ferramentas de colaboração.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                <Brain className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Agent AI</h3>
              <p className="text-slate-400">
                Múltiplos agentes especializados trabalhando juntos: análise, geração, refatoração e testes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <Code className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">IDE Profissional</h3>
              <p className="text-slate-400">
                Editor Monaco, LSP completo, debugging, Git integrado e suporte a 50+ linguagens.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4 group-hover:bg-pink-500/20 transition-colors">
                <Zap className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">10x Mais Rápido</h3>
              <p className="text-slate-400">
                Autocomplete inteligente, geração de código contextual e refatoração automática.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Segurança First</h3>
              <p className="text-slate-400">
                Código nunca armazenado, criptografia end-to-end, compliance SOC 2 e GDPR.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                <Globe className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Web & Desktop</h3>
              <p className="text-slate-400">
                Use no navegador ou baixe o app nativo para Windows, Mac e Linux.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                <Cpu className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Unreal Engine</h3>
              <p className="text-slate-400">
                Integração nativa com Unreal Engine 5 para desenvolvimento de games e metaverso.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Planos para{' '}
              <span className="text-indigo-400">qualquer tamanho</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Comece grátis, escale conforme necessário.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <p className="text-slate-400 mb-6">Para começar a explorar</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">R$0</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['100 requests/mês', 'IDE Web básica', 'Comunidade'].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full py-3 text-center text-white bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors font-medium"
              >
                Começar Grátis
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-indigo-500/10 to-purple-500/10 border-2 border-indigo-500/50 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-sm font-medium rounded-full">
                Mais Popular
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-slate-400 mb-6">Para desenvolvedores sérios</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">R$49</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Requests ilimitados',
                  'IDE Desktop + Web',
                  'Multi-Agent AI',
                  'Prioridade no suporte',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/register?plan=pro"
                className="block w-full py-3 text-center text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors font-medium"
              >
                Começar Pro
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <p className="text-slate-400 mb-6">Para times e empresas</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Tudo do Pro',
                  'SSO/SAML',
                  'Deploy on-premise',
                  'SLA dedicado',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="block w-full py-3 text-center text-white bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors font-medium"
              >
                Falar com Vendas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Pronto para revolucionar seu{' '}
            <span className="text-indigo-400">desenvolvimento</span>?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Junte-se a milhares de desenvolvedores que já estão codando com IA.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
          >
            Criar Conta Grátis
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-semibold text-white mb-4">Produto</h4>
              <ul className="space-y-2">
                <li><Link href="/features" className="text-slate-400 hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="text-slate-400 hover:text-white transition-colors">Preços</Link></li>
                <li><Link href="/download" className="text-slate-400 hover:text-white transition-colors">Download</Link></li>
                <li><Link href="/changelog" className="text-slate-400 hover:text-white transition-colors">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Recursos</h4>
              <ul className="space-y-2">
                <li><Link href="/docs" className="text-slate-400 hover:text-white transition-colors">Documentação</Link></li>
                <li><Link href="/blog" className="text-slate-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/tutorials" className="text-slate-400 hover:text-white transition-colors">Tutoriais</Link></li>
                <li><Link href="/api" className="text-slate-400 hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Empresa</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-slate-400 hover:text-white transition-colors">Sobre</Link></li>
                <li><Link href="/careers" className="text-slate-400 hover:text-white transition-colors">Carreiras</Link></li>
                <li><Link href="/contact" className="text-slate-400 hover:text-white transition-colors">Contato</Link></li>
                <li><Link href="/press" className="text-slate-400 hover:text-white transition-colors">Press</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-slate-400 hover:text-white transition-colors">Termos</Link></li>
                <li><Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacidade</Link></li>
                <li><Link href="/security" className="text-slate-400 hover:text-white transition-colors">Segurança</Link></li>
                <li><Link href="/cookies" className="text-slate-400 hover:text-white transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">Aethel</span>
            </div>
            
            <p className="text-slate-400 text-sm mb-4 md:mb-0">
              © 2026 Aethel Technologies. Todos os direitos reservados.
            </p>

            <div className="flex items-center gap-4">
              <a href="https://github.com/aethel" className="text-slate-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/aethel" className="text-slate-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com/company/aethel" className="text-slate-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
