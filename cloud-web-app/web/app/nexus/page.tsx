'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import NexusCanvas from '@/components/NexusCanvas'
import NexusChatMultimodal from '@/components/nexus/NexusChatMultimodal'
import AethelResearch from '@/components/nexus/AethelResearch'
import DirectorMode from '@/components/nexus/DirectorMode'
import { isNavLinkActive, STUDIO_PRIMARY_LINKS } from '@/lib/navigation/surfaces'
import {
  Activity,
  Cloud,
  Cpu,
  Database,
  Grid,
  Home,
  Layout,
  Settings,
  Shield,
  User,
} from 'lucide-react'

function studioLinkClass(active: boolean): string {
  return active
    ? 'rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-200'
    : 'rounded-md border border-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200'
}

export default function NexusPage() {
  const pathname = usePathname()
  const [isAIPainting, setIsAIPainting] = useState(false)
  const [canvasMode, setCanvasMode] = useState<'3d' | 'ui' | 'code'>('3d')
  const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'research' | 'director'>('chat')

  return (
    <div className="flex h-screen overflow-hidden bg-black font-sans text-zinc-100 selection:bg-blue-500/30">
      <aside className="z-20 flex w-16 flex-col items-center border-r border-zinc-800 bg-zinc-950/50 py-6 backdrop-blur-2xl">
        <Link
          href="/dashboard"
          className="mb-10 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.4)]"
          aria-label="Voltar ao Studio Home"
        >
          <Activity size={24} className="text-white" />
        </Link>

        <nav className="flex flex-1 flex-col gap-6" aria-label="Nexus sidebar navigation">
          <Link
            href="/dashboard"
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:text-zinc-200"
            aria-label="Studio Home"
          >
            <Home size={22} />
          </Link>
          <Link
            href="/nexus"
            className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2 text-blue-400"
            aria-label="Nexus"
          >
            <Grid size={22} />
          </Link>
          <Link
            href="/ide"
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:text-zinc-200"
            aria-label="IDE"
          >
            <Cpu size={22} />
          </Link>
          <Link
            href="/billing"
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:text-zinc-200"
            aria-label="Billing"
          >
            <Database size={22} />
          </Link>
          <Link
            href="/settings"
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:text-zinc-200"
            aria-label="Settings"
          >
            <Cloud size={22} />
          </Link>
        </nav>

        <div className="mt-auto flex flex-col gap-6">
          <Link
            href="/settings"
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:text-zinc-200"
            aria-label="Configuracoes"
          >
            <Settings size={22} />
          </Link>
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800"
            aria-label="Perfil"
          >
            <User size={18} className="text-zinc-400" />
          </Link>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="h-14 border-b border-zinc-800 bg-zinc-950/50 px-6 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">The Nexus</h1>
              <div className="h-4 w-px bg-zinc-800"></div>
              <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Aethel Core Online</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="mr-4 flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-1">
                <button
                  onClick={() => setRightPanelMode('chat')}
                  className={`rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    rightPanelMode === 'chat' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Nexus Chat
                </button>
                <button
                  onClick={() => setRightPanelMode('research')}
                  className={`rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    rightPanelMode === 'research' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Research
                </button>
                <button
                  onClick={() => setRightPanelMode('director')}
                  className={`rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    rightPanelMode === 'director' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Director
                </button>
              </div>
              <button className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500">
                Deploy
              </button>
            </div>
          </div>
        </header>

        <div className="hidden border-b border-zinc-800 bg-zinc-950/60 px-6 py-2 md:flex md:items-center md:gap-2">
          {STUDIO_PRIMARY_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={studioLinkClass(isNavLinkActive(pathname, link))}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950/30 lg:flex">
            <div className="border-b border-zinc-800 p-4">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Project Context</h2>
              <div className="space-y-1">
                <button className="flex w-full items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-400">
                  <Layout size={14} /> <span>Aethel Engine V2</span>
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-zinc-500 transition-colors hover:bg-zinc-900">
                  <Activity size={14} /> <span>Reality Matrix</span>
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-zinc-500 transition-colors hover:bg-zinc-900">
                  <Shield size={14} /> <span>Quality Gates</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Live Assets</h2>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="group flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-2 transition-all hover:border-blue-500/30"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800 font-mono text-[10px] text-zinc-500 transition-colors group-hover:bg-blue-600/20 group-hover:text-blue-400">
                      3D
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-bold transition-colors group-hover:text-blue-400">Asset_Prototype_0{item}.obj</p>
                      <p className="text-[9px] uppercase text-zinc-600">Optimized</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col bg-[#020202] p-4">
            <NexusCanvas
              mode={canvasMode}
              onSelectElement={(id, pos) => console.log('Selected:', id, pos)}
              isAIPainting={isAIPainting}
              content={null}
            />
          </div>

          <div className="z-10 flex w-96 flex-col border-l border-zinc-800 bg-zinc-950 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
            {rightPanelMode === 'chat' && <NexusChatMultimodal />}
            {rightPanelMode === 'research' && <AethelResearch />}
            {rightPanelMode === 'director' && <DirectorMode />}
          </div>
        </div>
      </main>
    </div>
  )
}
