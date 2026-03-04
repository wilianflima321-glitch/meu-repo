'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Codicon from '@/components/ide/Codicon'
import { analytics } from '@/lib/analytics'

const QUICK_MISSIONS = [
  'Criar dashboard SaaS com auth e billing',
  'Gerar MVP de jogo 2D com fisica e leaderboard',
  'Montar app fullstack com API e deploy',
]

export default function LandingPageV2() {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const router = useRouter()

  const handleMagicSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const mission = inputValue.trim()

    analytics?.track('project', 'project_open', {
      metadata: {
        source: 'landing-magic-box',
        hasMission: mission.length > 0,
      },
    })

    if (!mission) {
      router.push('/dashboard?onboarding=1&source=landing-magic-box')
      return
    }

    const params = new URLSearchParams()
    params.set('mission', mission)
    params.set('onboarding', '1')
    params.set('source', 'landing-magic-box')
    router.push(`/dashboard?${params.toString()}`)
  }

  useEffect(() => {
    analytics?.trackPageLoad?.('landing')
  }, [])

  const handleNavigate = (target: '/dashboard' | '/login' | '/docs') => {
    analytics?.track?.('user', 'settings_change', {
      metadata: {
        source: 'landing-shortcuts',
        target,
      },
    })
    if (target === '/dashboard') {
      router.push('/dashboard?onboarding=1&source=landing-shortcuts')
      return
    }
    router.push(target)
  }

  const handleQuickMission = (mission: string) => {
    setInputValue(mission)
    analytics?.track?.('user', 'settings_change', {
      metadata: {
        source: 'landing-quick-mission',
        action: 'set-mission',
      },
    })
  }

  return (
    <div className="min-h-screen w-full bg-grid-zinc-700/[0.15] relative flex flex-col items-center justify-center overflow-hidden bg-zinc-950">
      <a
        href="#landing-mission"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-zinc-100 focus:ring-2 focus:ring-blue-500"
      >
        Pular para o campo de missao
      </a>
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-zinc-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      <main id="landing-mission" className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center px-4 sm:px-6">
        <div className="mb-4 rounded-2xl border border-zinc-700/70 bg-zinc-900/80 p-1.5 shadow-[0_20px_50px_-28px_rgba(34,211,238,0.4)]">
          <Image
            src="/branding/aethel-icon-source.png"
            alt="Aethel"
            width={56}
            height={56}
            className="rounded-xl"
            priority
          />
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-400 py-2">
          Aethel Engine
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-zinc-400 sm:text-base md:text-lg">
          A plataforma de desenvolvimento unificada. Crie, colabore e publique jogos, aplicativos e automacoes com o poder da IA.
        </p>

        <form onSubmit={handleMagicSubmit} className="w-full max-w-xl mt-8 sm:mt-10" aria-label="Missao inicial do Studio Home">
          <div
            className={`relative transition-all duration-300 ease-in-out group ${
              isFocused ? 'shadow-[0_0_60px_5px_rgba(45,155,240,0.2)]' : ''
            }`}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-80 transition duration-500" />
            <div className="relative flex items-center bg-zinc-900/95 backdrop-blur-sm ring-1 ring-zinc-700/80 rounded-xl leading-none">
              <span className="pl-4 pr-2 text-zinc-400">
                <Codicon name="sparkle" />
              </span>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="O que vamos construir hoje?"
                aria-label="Descreva a missao inicial"
                className="w-full h-14 bg-transparent text-zinc-100 placeholder-zinc-500 text-base sm:text-lg focus:outline-none focus:ring-0 border-none"
              />
              <button type="submit" className="mx-2 px-4 py-2 bg-zinc-800/50 text-zinc-300 rounded-lg hover:bg-zinc-700/80 transition-colors">
                Criar
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 w-full max-w-xl">
          <p className="mb-2 text-xs uppercase tracking-[0.08em] text-zinc-500">Atalhos de missao</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {QUICK_MISSIONS.map((mission) => (
              <button
                key={mission}
                type="button"
                className="rounded-full border border-zinc-700/90 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
                onClick={() => handleQuickMission(mission)}
              >
                {mission}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 text-zinc-400 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-4">
          <button
            type="button"
            className="cursor-pointer hover:text-white transition-colors"
            onClick={() => handleNavigate('/dashboard')}
          >
            Abrir Studio Home
          </button>
          <span className="hidden sm:inline">•</span>
          <button
            type="button"
            className="cursor-pointer hover:text-white transition-colors"
            onClick={() => handleNavigate('/login')}
          >
            Fazer Login
          </button>
          <span className="hidden sm:inline">•</span>
          <button
            type="button"
            className="cursor-pointer hover:text-white transition-colors"
            onClick={() => handleNavigate('/docs')}
          >
            Documentacao
          </button>
        </div>
      </main>
    </div>
  )
}
