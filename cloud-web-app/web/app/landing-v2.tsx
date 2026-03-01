'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Codicon from '@/components/ide/Codicon'
import { analytics } from '@/lib/analytics'

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
      router.push('/dashboard')
      return
    }

    router.push(`/dashboard?mission=${encodeURIComponent(mission)}`)
  }

  useEffect(() => {
    analytics?.trackPageLoad?.('landing')
  }, [])

  return (
    <div className="min-h-screen w-full bg-grid-zinc-700/[0.15] relative flex flex-col items-center justify-center overflow-hidden bg-zinc-950">
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-zinc-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-400 py-2">
          Aethel Engine
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-400 md:text-lg">
          A plataforma de desenvolvimento unificada. Crie, colabore e publique jogos, aplicativos e automacoes com o poder da IA.
        </p>

        <form onSubmit={handleMagicSubmit} className="w-full max-w-xl mt-10">
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
                className="w-full h-14 bg-transparent text-zinc-100 placeholder-zinc-500 text-lg focus:outline-none focus:ring-0 border-none"
              />
              <button type="submit" className="mx-2 px-4 py-2 bg-zinc-800/50 text-zinc-300 rounded-lg hover:bg-zinc-700/80 transition-colors">
                Criar
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 text-zinc-400">
          <button
            type="button"
            className="cursor-pointer hover:text-white transition-colors"
            onClick={() => router.push('/dashboard')}
          >
            Abrir Studio Home
          </button>
          <span>•</span>
          <button
            type="button"
            className="cursor-pointer hover:text-white transition-colors"
            onClick={() => router.push('/login')}
          >
            Fazer Login
          </button>
          <span>•</span>
          <button
            type="button"
            className="cursor-pointer hover:text-white transition-colors"
            onClick={() => router.push('/docs')}
          >
            Documentacao
          </button>
        </div>
      </div>
    </div>
  )
}
