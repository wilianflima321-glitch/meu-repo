'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { analytics } from '@/lib/analytics'

const QUICK_MISSIONS = [
  'Criar dashboard SaaS com auth, billing e deploy',
  'Planejar e implementar um app fullstack com Prisma',
  'Abrir o studio e seguir com onboarding guiado',
]

const GENERATION_STEPS = [
  { step: 'Analisando requisitos...', progress: 20 },
  { step: 'Criando estrutura do projeto...', progress: 40 },
  { step: 'Configurando dependencias...', progress: 60 },
  { step: 'Gerando arquivos base...', progress: 80 },
  { step: 'Finalizando workspace...', progress: 95 },
]

export default function LandingMissionBox() {
  const router = useRouter()
  const [inputValue, setInputValue] = useState('')
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStep, setGenerationStep] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSuggestionIndex((current) => (current + 1) % QUICK_MISSIONS.length)
    }, 2600)

    return () => window.clearTimeout(timeout)
  }, [suggestionIndex])

  const placeholder = useMemo(() => QUICK_MISSIONS[suggestionIndex], [suggestionIndex])

  const pushMissionFallback = (mission: string, source: string) => {
    const params = new URLSearchParams()
    if (mission) {
      params.set('mission', mission)
    }
    params.set('onboarding', '1')
    params.set('source', source)
    router.push(`/dashboard?${params.toString()}`)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mission = inputValue.trim()

    if (process.env.NEXT_PUBLIC_ENABLE_MARKETING_ANALYTICS === 'true') {
      analytics?.track('project', 'project_open', {
        metadata: { source: 'landing-mission-box', hasMission: mission.length > 0 },
      })
    }

    if (!mission) {
      router.push('/dashboard?onboarding=1&source=landing-v3')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationStep('Inicializando workspace...')

    try {
      for (const { step, progress } of GENERATION_STEPS) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        setGenerationStep(step)
        setGenerationProgress(progress)
      }

      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission,
          source: 'landing-magic-box',
          template: 'saas-starter',
        }),
      })

      if (!response.ok) {
        pushMissionFallback(mission, 'landing-v3')
        return
      }

      const data = await response.json()
      setGenerationProgress(100)
      setGenerationStep('Workspace criado com sucesso!')

      await new Promise((resolve) => setTimeout(resolve, 500))
      router.push(`/dashboard?workspace=${data.workspaceId}&onboarding=1&source=landing-magic-box`)
    } catch {
      pushMissionFallback(mission, 'landing-v3-fallback')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-8 max-w-2xl">
        <div className="flex flex-col gap-3 rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.42)] sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_74%,transparent)] px-4 py-3">
            <Sparkles className="h-4.5 w-4.5 shrink-0 text-[var(--aethel-info-light)]" />
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={placeholder}
              disabled={isGenerating}
              className="w-full bg-transparent text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] outline-none disabled:opacity-50 sm:text-[15px]"
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {isGenerating ? 'Gerando...' : 'Abrir studio'}
          </button>
        </div>
        {isGenerating && (
          <div className="mt-4 rounded-2xl border p-4 bg-[var(--aethel-surface-secondary)]">
            <div className="mb-2 flex justify-between">
              <span className="text-xs">{generationStep}</span>
              <span className="text-xs">{generationProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--aethel-surface-quaternary)]">
              <div
                className="h-full bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)]"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--aethel-text-tertiary)]">
        <span>Sugestao:</span>
        <button
          type="button"
          onClick={() => setInputValue(placeholder)}
          className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_76%,transparent)] hover:text-[var(--aethel-text-primary)]"
        >
          {placeholder}
        </button>
      </div>
    </>
  )
}
