'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Paperclip, Sparkles } from 'lucide-react'
import { analytics } from '@/lib/analytics'

const QUICK_MISSIONS = [
  'Configure my domain and publish my site',
  'Fix the failing deployment on Vercel',
  'Research competitors and prepare a launch brief',
  'Set up Stripe billing and customer portal',
]

const QUICK_CHIPS = [
  'Launch a marketing site',
  'Connect cloud accounts',
  'Review current deployment',
  'Build in Studio',
]

const GENERATION_STEPS = [
  { step: 'Analyzing the mission...', progress: 18 },
  { step: 'Preparing the workspace...', progress: 42 },
  { step: 'Connecting the initial workflow...', progress: 68 },
  { step: 'Preparing Mission Control...', progress: 88 },
  { step: 'Finalizing handoff...', progress: 96 },
]

type WorkspaceCreateResponse = {
  workspaceId?: string
  handoffUrl?: string
  requiresAuth?: boolean
}

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
    }, 2800)

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

    analytics?.track('project', 'mission_submit', {
      label: mission ? 'mission_prompt' : 'empty_mission_start',
      metadata: { source: 'landing-mission-box', hasMission: mission.length > 0 },
    })

    if (!mission) {
      analytics?.track('project', 'onboarding_start', {
        label: 'landing_empty_mission',
        metadata: { source: 'landing-v3' },
      })
      router.push('/dashboard?onboarding=1&source=landing-v3')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationStep('Initializing mission...')

    try {
      for (const { step, progress } of GENERATION_STEPS) {
        await new Promise((resolve) => setTimeout(resolve, 320))
        setGenerationStep(step)
        setGenerationProgress(progress)
      }

      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission,
          source: 'landing-mission-box',
          template: 'saas-starter',
        }),
      })

      if (!response.ok) {
        pushMissionFallback(mission, 'landing-v3')
        return
      }

      const data = (await response.json()) as WorkspaceCreateResponse
      setGenerationProgress(100)
      setGenerationStep(data.requiresAuth ? 'Opening Studio Home...' : 'Mission ready!')

      await new Promise((resolve) => setTimeout(resolve, 360))
      if (data.handoffUrl) {
        analytics?.track('project', 'mission_handoff', {
          label: 'auth_required',
          metadata: { source: 'landing-mission-box', target: 'dashboard-auth-handoff' },
        })
        router.push(data.handoffUrl)
        return
      }

      if (data.workspaceId) {
        analytics?.track('project', 'workspace_create', {
          label: 'mission_workspace_created',
          projectId: data.workspaceId,
          metadata: { source: 'landing-mission-box' },
        })
        router.push(`/dashboard?workspace=${data.workspaceId}&onboarding=1&source=landing-mission-box`)
        return
      }

      pushMissionFallback(mission, 'landing-v3-handoff')
    } catch {
      pushMissionFallback(mission, 'landing-v3-fallback')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="mt-8 max-w-4xl">
      <form onSubmit={handleSubmit} className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(8,10,16,0.92))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.34)] sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
          <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-2.5 py-1 text-[var(--aethel-info-light)]">
            Mission intake
          </span>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] px-2.5 py-1">
            Web Light
          </span>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] px-2.5 py-1">
            Studio handoff
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_72%,transparent)] p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] px-2 py-2">
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
          <div className="flex items-center gap-2 sm:pl-2">
            <button
              type="button"
              aria-label="Attach context"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex min-w-[168px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {isGenerating ? 'Starting...' : 'Start a mission'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setInputValue(chip)}
              className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:text-[var(--aethel-text-primary)]"
            >
              {chip}
            </button>
          ))}
          <Link
            href="/ide"
            className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--aethel-info-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_36%,transparent)]"
          >
            Open Studio
          </Link>
        </div>

        {isGenerating && (
          <div className="mt-4 rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--aethel-text-secondary)]">{generationStep}</span>
              <span className="text-xs text-[var(--aethel-text-tertiary)]">{generationProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--aethel-surface-quaternary)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)]"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
