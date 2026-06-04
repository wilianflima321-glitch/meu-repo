'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Paperclip, Sparkles } from 'lucide-react'
import { analytics } from '@/lib/analytics'

const QUICK_MISSIONS = [
  'Configure my domain and publish my site',
  'Fix the failing deployment on Vercel',
  'Research competitors and prepare a launch brief',
  'Set up Stripe billing and customer portal',
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

    try {
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
      <form
        onSubmit={handleSubmit}
        className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] p-3 shadow-[0_24px_80px_rgba(2,6,23,0.3)] sm:p-4"
      >
        <div className="flex flex-col gap-3 rounded-[24px] border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_76%,transparent)] p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] px-2 py-2">
            <Sparkles className="h-4.5 w-4.5 shrink-0 text-[var(--aethel-info-light)]" />
            <label htmlFor="landing-mission-input" className="sr-only">
              Describe what you want Aethel to build
            </label>
            <input
              id="landing-mission-input"
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
              className="inline-flex min-w-[168px] items-center justify-center gap-2 rounded-2xl bg-[var(--aethel-text-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-surface-primary)] shadow-lg transition hover:bg-[var(--aethel-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {isGenerating ? 'Starting...' : 'Start building'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
