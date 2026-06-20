'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Rocket, Upload } from 'lucide-react'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'

type ProjectRow = { id: string; name: string }

type PublishState = {
  state: 'idle' | 'pending' | 'done' | 'error'
  message?: string
  slug?: string
  playable?: boolean
}

type AuthState = 'loading' | 'authed' | 'anon'

export function ArcadeCreatorPanel({ onPublished }: { onPublished?: () => void }) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [status, setStatus] = useState<Record<string, PublishState>>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch('/api/projects', { headers: { Accept: 'application/json' } })
        if (response.status === 401) {
          if (!cancelled) setAuthState('anon')
          return
        }
        if (!response.ok) {
          if (!cancelled) setAuthState('anon')
          return
        }
        const data = (await response.json()) as Array<{ id?: unknown; name?: unknown }>
        if (cancelled) return
        const rows: ProjectRow[] = Array.isArray(data)
          ? data
              .filter((row) => typeof row.id === 'string' && typeof row.name === 'string')
              .map((row) => ({ id: row.id as string, name: row.name as string }))
          : []
        setProjects(rows)
        setAuthState('authed')
      } catch {
        if (!cancelled) setAuthState('anon')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const publish = async (projectId: string) => {
    setStatus((prev) => ({ ...prev, [projectId]: { state: 'pending' } }))
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = (await response.json().catch(() => null)) as
        | { game?: { slug?: string; playable?: boolean }; hint?: string; error?: string }
        | null
      if (!response.ok) {
        setStatus((prev) => ({
          ...prev,
          [projectId]: { state: 'error', message: data?.error || 'Publish failed. Please try again.' },
        }))
        return
      }
      setStatus((prev) => ({
        ...prev,
        [projectId]: {
          state: 'done',
          slug: data?.game?.slug,
          playable: data?.game?.playable,
          message: data?.hint,
        },
      }))
      onPublished?.()
    } catch {
      setStatus((prev) => ({ ...prev, [projectId]: { state: 'error', message: 'Network error. Try again.' } }))
    }
  }

  if (authState === 'loading') return null

  return (
    <details className="group rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] p-4 shadow-[var(--aethel-shadow-md)] sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--aethel-text-primary)]">
          <Rocket className="h-4 w-4 text-[var(--aethel-info-light)]" /> Publish your project to the Arcade
        </span>
        <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
          {authState === 'authed' ? `${projects.length} projects` : 'Sign in'}
        </span>
      </summary>

      <div className="mt-4 border-t border-[var(--aethel-border-subtle)] pt-4">
        {authState === 'anon' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--aethel-text-secondary)]">Sign in to publish a project you own.</p>
            <Link
              href="/login?next=%2Farcade"
              className={`inline-flex items-center gap-2 rounded-lg bg-[var(--aethel-primary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-inverse)] transition hover:brightness-110 ${CANONICAL_FOCUS}`}
            >
              Sign in
            </Link>
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-[var(--aethel-text-secondary)]">
            You don&apos;t have any projects yet. Create one in the dashboard, then publish it here.
          </p>
        ) : (
          <ul className="grid gap-2">
            {projects.map((project) => {
              const state = status[project.id]?.state ?? 'idle'
              const info = status[project.id]
              return (
                <li
                  key={project.id}
                  className="flex flex-col gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--aethel-text-primary)]">{project.name}</p>
                    {info?.state === 'done' ? (
                      <p className="mt-0.5 text-xs text-[var(--aethel-text-tertiary)]">
                        {info.playable ? 'Live and playable' : info.message || 'Published — run a Web export to make it playable.'}
                        {info.slug ? (
                          <>
                            {' '}
                            <Link href={`/arcade/${info.slug}`} className="text-[var(--aethel-info-light)] underline">
                              View listing
                            </Link>
                          </>
                        ) : null}
                      </p>
                    ) : null}
                    {info?.state === 'error' ? (
                      <p className="mt-0.5 text-xs text-[var(--aethel-error-light)]">{info.message}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={state === 'pending'}
                    onClick={() => publish(project.id)}
                    className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)] disabled:cursor-not-allowed disabled:opacity-60 ${CANONICAL_FOCUS}`}
                  >
                    {state === 'pending' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {info?.state === 'done' ? 'Republish' : 'Publish'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </details>
  )
}
