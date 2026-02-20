'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, ExternalLink, Settings2 } from 'lucide-react'

const UnifiedSettingsPage = dynamic(() => import('@/components/settings/SettingsPage'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-slate-950 text-slate-300">
      Loading settings workspace...
    </div>
  ),
})

export default function SettingsRoutePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <div className="rounded border border-slate-700 bg-slate-900 p-1.5 text-sky-300">
                <Settings2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">Settings Workspace</div>
                <div className="text-[11px] text-slate-500">
                  Global IDE preferences, AI behavior, terminal, engine, and account controls.
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/project-settings"
              className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Project Settings
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/ide"
              className="rounded border border-sky-500/40 bg-sky-500/15 px-2.5 py-1 text-xs text-sky-100 hover:bg-sky-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Open IDE
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto h-[calc(100vh-64px)] w-full max-w-[1600px] px-4 py-4">
        <div className="h-full overflow-hidden rounded border border-slate-800 bg-slate-900/50">
          <UnifiedSettingsPage />
        </div>
      </section>
    </main>
  )
}
