import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/[0.06] blur-[180px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto flex h-16 w-full max-w-7xl items-center px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/branding/aethel-icon-source.png" alt="" width={28} height={28} className="rounded-lg" />
          <span className="text-lg font-bold">Aethel</span>
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* 404 visual */}
        <div className="relative mb-8">
          <span className="select-none text-[160px] font-bold leading-none text-white/[0.04] sm:text-[200px]">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-2xl shadow-blue-500/20">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold sm:text-4xl">Pagina nao encontrada</h1>
        <p className="mx-auto mt-4 max-w-md text-base text-zinc-400">
          A pagina que voce esta procurando nao existe, foi movida ou esta temporariamente indisponivel.
        </p>

        {/* Quick actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-cyan-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Voltar ao inicio
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Ir ao dashboard
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Documentacao
          </Link>
        </div>

        {/* Suggested pages */}
        <div className="mx-auto mt-12 grid w-full max-w-xl gap-3 sm:grid-cols-3">
          {[
            { label: 'Status', href: '/status', icon: 'pulse' },
            { label: 'Pricing', href: '/pricing', icon: 'credit-card' },
            { label: 'Contato', href: '/contact-sales', icon: 'mail' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400 transition-all hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-white"
            >
              <span className="text-zinc-600">&rarr;</span>
              {item.label}
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-xs text-zinc-700">
        &copy; {new Date().getFullYear()} Aethel Engine
      </footer>
    </div>
  )
}
