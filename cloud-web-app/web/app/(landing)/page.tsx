import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Force dynamic rendering to avoid prerender issues with cookies()
export const dynamic = 'force-dynamic'

// ============================================================================
// AETHEL ENGINE - LANDING PAGE
// Design System: Studio-Grade (Unreal/Unity/Firebase Level)
// ============================================================================

// Icon Components
const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
)

const PlayIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

// Feature Icons
const CubeIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)

const BrainIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const CloudIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
)

const CodeIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

// Social Icons
const GithubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

const TwitterIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const DiscordIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

const YoutubeIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

// Company Logos Component
const CompanyLogos = () => (
  <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-40">
    {['EPIC GAMES', 'UNITY', 'NVIDIA', 'AMD', 'MICROSOFT', 'STEAM'].map((name) => (
      <div key={name} className="text-sm font-bold tracking-[0.2em] text-white/60">{name}</div>
    ))}
  </div>
)

// Stats Component
const StatsSection = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
    {[
      { value: '50K+', label: 'Desenvolvedores Ativos' },
      { value: '1M+', label: 'Projetos Criados' },
      { value: '99.9%', label: 'Uptime SLA' },
      { value: '<50ms', label: 'Latência Média' },
    ].map((stat) => (
      <div key={stat.label} className="text-center">
        <div className="text-4xl md:text-5xl font-black bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent mb-2">
          {stat.value}
        </div>
        <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
      </div>
    ))}
  </div>
)

export default function LandingPage() {
  const token = cookies().get('token')?.value
  if (token) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* ========== NAVBAR ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
                <span className="text-lg font-black">A</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-lg blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
            </div>
            <span className="text-xl font-bold tracking-tight">Aethel<span className="text-violet-400">Engine</span></span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Recursos</Link>
            <Link href="#showcase" className="text-sm text-slate-400 hover:text-white transition-colors">Showcase</Link>
            <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Preços</Link>
            <Link href="/docs" className="text-sm text-slate-400 hover:text-white transition-colors">Documentação</Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm text-slate-300 hover:text-white transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium px-5 py-2.5 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Background */}
        <div className="absolute inset-0">
          {/* Gradient Orbs */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/15 rounded-full blur-[150px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[200px]" />
          
          {/* Grid */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '100px 100px'
            }}
          />
          
          {/* Radial fade */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,black_70%)]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-32 text-center">
          {/* Announcement Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-slate-300">Novo: Visual Scripting com IA</span>
            <ArrowRightIcon />
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] mb-8">
            <span className="block">Crie jogos</span>
            <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              sem limites
            </span>
          </h1>

          {/* Subheadline */}
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 mb-12 leading-relaxed">
            A game engine de próxima geração. Editor visual, IA copilot, 
            colaboração real-time e deploy para todas as plataformas.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="group relative inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-2xl hover:shadow-white/20"
            >
              Começar Grátis
              <ArrowRightIcon />
            </Link>
            <Link
              href="#demo"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all"
            >
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <PlayIcon />
              </div>
              Assistir Demo
            </Link>
          </div>

          {/* Trusted By */}
          <div className="pt-16 border-t border-white/5">
            <p className="text-sm text-slate-500 mb-8 uppercase tracking-widest font-medium">Trusted by industry leaders</p>
            <CompanyLogos />
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-slate-500 to-transparent" />
        </div>
      </section>

      {/* ========== DEMO SECTION ========== */}
      <section id="demo" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Editor de <span className="text-violet-400">Classe Mundial</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Uma IDE completa no navegador com todas as ferramentas que você precisa
            </p>
          </div>

          {/* Demo Window */}
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 rounded-3xl blur-2xl opacity-50" />
            
            {/* Window */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950 shadow-2xl">
              {/* Title Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-sm text-slate-500 ml-3">Aethel Engine — my-awesome-game</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>main</span>
                  <span>•</span>
                  <span>TypeScript</span>
                </div>
              </div>

              {/* IDE Layout */}
              <div className="flex h-[500px] md:h-[600px]">
                {/* Sidebar */}
                <div className="hidden md:block w-14 bg-slate-900/50 border-r border-white/5 py-4">
                  <div className="flex flex-col items-center gap-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-8 h-8 rounded-lg ${i === 0 ? 'bg-violet-500/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'} flex items-center justify-center transition-colors cursor-pointer`}>
                        <div className="w-4 h-4 bg-current rounded-sm opacity-60" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* File Explorer */}
                <div className="hidden lg:block w-56 bg-slate-900/30 border-r border-white/5 p-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">Explorer</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5 text-white">
                      <span className="text-amber-400">▼</span> src
                    </div>
                    <div className="pl-4 space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 text-slate-400 cursor-pointer">
                        <span className="text-blue-400">◆</span> main.ts
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1 rounded bg-violet-500/10 text-violet-300">
                        <span className="text-purple-400">◆</span> player.ts
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 text-slate-400 cursor-pointer">
                        <span className="text-green-400">◆</span> world.ts
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code Editor */}
                <div className="flex-1 bg-[#0d1117] p-6 font-mono text-sm overflow-hidden">
                  <div className="space-y-1">
                    <div><span className="text-slate-600">1</span>  <span className="text-purple-400">import</span> <span className="text-slate-300">{'{'} Engine, Scene {'}'}</span> <span className="text-purple-400">from</span> <span className="text-emerald-400">'@aethel/core'</span></div>
                    <div><span className="text-slate-600">2</span></div>
                    <div><span className="text-slate-600">3</span>  <span className="text-purple-400">export class</span> <span className="text-yellow-400">Player</span> <span className="text-purple-400">extends</span> <span className="text-cyan-400">Entity</span> <span className="text-slate-300">{'{'}</span></div>
                    <div><span className="text-slate-600">4</span>    <span className="text-cyan-400">@property</span><span className="text-slate-300">(</span><span className="text-orange-400">Number</span><span className="text-slate-300">)</span></div>
                    <div><span className="text-slate-600">5</span>    <span className="text-slate-300">speed</span><span className="text-purple-400">:</span> <span className="text-cyan-400">number</span> <span className="text-purple-400">=</span> <span className="text-orange-400">5</span></div>
                    <div><span className="text-slate-600">6</span></div>
                    <div><span className="text-slate-600">7</span>    <span className="text-slate-500">{'// ✨ AI: gerar movimento do jogador'}</span></div>
                    <div className="relative">
                      <span className="text-slate-600">8</span>
                      <span className="ml-4 text-violet-400/70">▌</span>
                      <span className="text-violet-300/50 ml-2 animate-pulse">Gerando código...</span>
                    </div>
                  </div>
                  
                  {/* AI Suggestion Box */}
                  <div className="mt-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <SparklesIcon />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-violet-300 mb-1">Aethel AI</div>
                        <div className="text-sm text-slate-400">Detectei que você quer movimento do jogador. Posso gerar código para WASD + pulo + dash?</div>
                        <div className="flex gap-2 mt-3">
                          <button className="px-3 py-1.5 bg-violet-500 hover:bg-violet-400 text-white text-xs font-medium rounded-lg transition-colors">
                            Aceitar
                          </button>
                          <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg transition-colors">
                            Personalizar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel */}
                <div className="hidden xl:block w-72 bg-slate-900/30 border-l border-white/5 p-4">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-4 font-medium">Properties</div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-2">Transform</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['X', 'Y', 'Z'].map((axis) => (
                          <div key={axis} className="bg-slate-800/50 rounded-lg px-3 py-2">
                            <div className="text-xs text-slate-500">{axis}</div>
                            <div className="text-sm text-white">0.00</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-2">Components</label>
                      <div className="space-y-2">
                        {['Mesh Renderer', 'Rigidbody', 'Collider'].map((comp) => (
                          <div key={comp} className="flex items-center gap-2 px-3 py-2 bg-slate-800/30 rounded-lg text-sm">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                            <span className="text-slate-300">{comp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-violet-600 text-white text-xs">
                <div className="flex items-center gap-4">
                  <span>● Connected</span>
                  <span>TypeScript</span>
                  <span>UTF-8</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Ln 8, Col 4</span>
                  <span>Spaces: 2</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-6">
              <SparklesIcon />
              Recursos Poderosos
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Tudo para criar jogos{' '}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">AAA</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Ferramentas profissionais, performance excepcional e uma experiência de desenvolvimento incomparável.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <CubeIcon />,
                title: 'Visual Scripting',
                description: 'Crie lógica de jogo com um sistema de nós visual intuitivo. Perfeito para designers e programadores.',
                color: 'violet',
              },
              {
                icon: <BrainIcon />,
                title: 'IA Copilot',
                description: 'Assistente de código inteligente que entende seu projeto e sugere soluções em tempo real.',
                color: 'purple',
              },
              {
                icon: <UsersIcon />,
                title: 'Colaboração Real-time',
                description: 'Trabalhe com sua equipe simultaneamente no mesmo projeto com sync instantâneo.',
                color: 'fuchsia',
              },
              {
                icon: <CloudIcon />,
                title: 'Cloud Build',
                description: 'Compile para Windows, Mac, Linux, Web, iOS e Android diretamente na nuvem.',
                color: 'cyan',
              },
              {
                icon: <CodeIcon />,
                title: 'Monaco Editor',
                description: 'O mesmo editor do VS Code, com IntelliSense, debugging e extensões.',
                color: 'emerald',
              },
              {
                icon: <ShieldIcon />,
                title: 'Enterprise Security',
                description: 'SOC 2, GDPR, criptografia E2E. Seus projetos estão seguros.',
                color: 'amber',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-500/10 flex items-center justify-center mb-6 text-${feature.color}-400 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== STATS SECTION ========== */}
      <section className="py-24 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <StatsSection />
        </div>
      </section>

      {/* ========== PRICING SECTION ========== */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Planos para <span className="text-violet-400">todos os tamanhos</span>
            </h2>
            <p className="text-lg text-slate-400">
              Comece grátis, escale quando precisar.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="relative p-8 rounded-2xl bg-white/[0.02] border border-white/10">
              <h3 className="text-xl font-bold mb-2">Hobby</h3>
              <p className="text-slate-400 text-sm mb-6">Perfeito para começar</p>
              <div className="mb-8">
                <span className="text-5xl font-black">$0</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['1 projeto', 'Build para Web', 'Comunidade Discord', '1GB storage'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full py-3 text-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors">
                Começar Grátis
              </Link>
            </div>

            {/* Pro */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-b from-violet-500/10 to-purple-500/5 border-2 border-violet-500/30">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold rounded-full shadow-lg shadow-violet-500/25">
                Mais Popular
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-slate-400 text-sm mb-6">Para desenvolvedores sérios</p>
              <div className="mb-8">
                <span className="text-5xl font-black">$29</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['Projetos ilimitados', 'Build multiplataforma', 'IA Copilot avançado', '100GB storage', 'Suporte prioritário'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register?plan=pro" className="block w-full py-3 text-center bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-semibold transition-colors shadow-lg shadow-violet-500/25">
                Começar Pro
              </Link>
            </div>

            {/* Enterprise */}
            <div className="relative p-8 rounded-2xl bg-white/[0.02] border border-white/10">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <p className="text-slate-400 text-sm mb-6">Para times e estúdios</p>
              <div className="mb-8">
                <span className="text-5xl font-black">Custom</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['Tudo do Pro', 'SSO/SAML', 'Deploy on-premise', 'SLA dedicado', 'Account manager'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="block w-full py-3 text-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors">
                Falar com Vendas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 via-purple-600/5 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/20 rounded-full blur-[150px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
            Pronto para criar seu
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">próximo grande jogo?</span>
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Junte-se a milhares de desenvolvedores que já estão criando experiências incríveis com Aethel Engine.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-2xl hover:shadow-white/20"
            >
              Criar Conta Grátis
              <ArrowRightIcon />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-8 py-4 text-white font-semibold hover:text-violet-300 transition-colors"
            >
              Ver Documentação →
            </Link>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-white/5 bg-black/50">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
            {/* Brand */}
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
                  <span className="text-xl font-black">A</span>
                </div>
                <span className="text-xl font-bold">Aethel Engine</span>
              </Link>
              <p className="text-slate-400 text-sm mb-6 max-w-xs">
                A game engine de próxima geração para desenvolvedores modernos.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <GithubIcon />
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <TwitterIcon />
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <DiscordIcon />
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <YoutubeIcon />
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Produto</h4>
              <ul className="space-y-3">
                {['Features', 'Pricing', 'Showcase', 'Roadmap'].map((link) => (
                  <li key={link}><Link href={`/${link.toLowerCase()}`} className="text-slate-400 hover:text-white text-sm transition-colors">{link}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Recursos</h4>
              <ul className="space-y-3">
                {['Documentação', 'Tutoriais', 'Blog', 'API Reference'].map((link) => (
                  <li key={link}><Link href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{link}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Empresa</h4>
              <ul className="space-y-3">
                {['Sobre', 'Carreiras', 'Contato', 'Press Kit'].map((link) => (
                  <li key={link}><Link href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{link}</Link></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5">
            <p className="text-slate-500 text-sm mb-4 md:mb-0">
              © 2026 Aethel Technologies. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/terms" className="text-slate-500 hover:text-white transition-colors">Termos</Link>
              <Link href="/privacy" className="text-slate-500 hover:text-white transition-colors">Privacidade</Link>
              <Link href="/security" className="text-slate-500 hover:text-white transition-colors">Segurança</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
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
