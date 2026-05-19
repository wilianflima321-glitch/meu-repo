'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { StudioLocalRuntimeCapsule } from '@/components/studio/StudioLocalRuntimeCapsule'
import { analytics } from '@/lib/analytics'

type StudioSessionStatus = 'active' | 'stopped'

type StudioSessionRecord = {
  id: string
  title: string
  mission: string
  mode: string
  status: StudioSessionStatus
  runtimeTarget: string
  activeTaskIds: string[]
  evidenceRefs: string[]
  stopReason?: string
}

type TaskWaveResponse = {
  taskCount?: number
  tasks?: Array<{ id: string; goal: string }>
  error?: string
  message?: string
}

const MODE_OPTIONS = [
  { value: 'mission', label: 'Mission' },
  { value: 'app', label: 'App' },
  { value: 'game', label: 'Game' },
  { value: 'film', label: 'Film' },
  { value: 'audio', label: 'Audio' },
  { value: 'research', label: 'Research' },
  { value: 'release', label: 'Release' },
] as const

const RUNTIME_OPTIONS = [
  { value: 'cloud-sandbox', label: 'Cloud safe' },
  { value: 'local-worker', label: 'Local worker' },
  { value: 'local-native', label: 'Local native' },
  { value: 'held', label: 'Hold for review' },
] as const

const STUDIO_SESSION_STORAGE_KEY = 'aethel:last-studio-session-id'

type StudioMode = (typeof MODE_OPTIONS)[number]['value']
type RuntimeTarget = (typeof RUNTIME_OPTIONS)[number]['value']

function statusClass(status?: StudioSessionStatus): string {
  if (status === 'active') {
    return 'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
  }
  if (status === 'stopped') {
    return 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
  }
  return 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] text-[var(--aethel-text-secondary)]'
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string }
  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Request failed with ${response.status}`)
  }
  return payload
}

export default function StudioMissionControl() {
  const [mission, setMission] = useState('Coordinate a playable scene, evidence, and release checklist.')
  const [mode, setMode] = useState<StudioMode>('game')
  const [runtimeTarget, setRuntimeTarget] = useState<RuntimeTarget>('cloud-sandbox')
  const [session, setSession] = useState<StudioSessionRecord | null>(null)
  const [wave, setWave] = useState<TaskWaveResponse | null>(null)
  const [busy, setBusy] = useState<'resume' | 'start' | 'wave' | 'stop' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const canRunWave = session?.status === 'active'
  const compactSessionId = useMemo(() => (session ? session.id.replace(/^studio_/, '').slice(0, 12) : 'none'), [session])

  const applySessionRecord = useCallback((record: StudioSessionRecord) => {
    setSession(record)
    setMission(record.mission)
    setMode(record.mode as StudioMode)
    setRuntimeTarget(record.runtimeTarget as RuntimeTarget)
    window.localStorage.setItem(STUDIO_SESSION_STORAGE_KEY, record.id)
  }, [])

  useEffect(() => {
    const sessionId = window.localStorage.getItem(STUDIO_SESSION_STORAGE_KEY)
    if (!sessionId) return

    let isMounted = true
    setBusy('resume')

    fetch(`/api/studio/session/${encodeURIComponent(sessionId)}`)
      .then((response) => parseResponse<{ session: StudioSessionRecord }>(response))
      .then((payload) => {
        if (!isMounted) return
        applySessionRecord(payload.session)
        setNotice(payload.session.status === 'active' ? 'Resumed active Studio session.' : 'Loaded last Studio session.')
      })
      .catch(() => {
        window.localStorage.removeItem(STUDIO_SESSION_STORAGE_KEY)
        if (isMounted) {
          setNotice('Previous Studio session could not be resumed.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setBusy(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [applySessionRecord])

  async function startSession() {
    setBusy('start')
    setNotice(null)
    try {
      analytics?.track('project', 'mission_submit', {
        label: 'studio_session_start',
        metadata: { mode, runtimeTarget },
      })
      const payload = await parseResponse<{ session: StudioSessionRecord }>(
        await fetch('/api/studio/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mission, mode, runtimeTarget }),
        })
      )
      applySessionRecord(payload.session)
      setWave(null)
      setNotice('Studio session is active.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not start Studio session.')
    } finally {
      setBusy(null)
    }
  }

  async function runWave() {
    if (!session) return
    setBusy('wave')
    setNotice(null)
    try {
      analytics?.track('ai', 'ai_chat', {
        label: 'studio_parallel_wave',
        metadata: { sessionId: session.id, mode, runtimeTarget },
      })
      const payload = await parseResponse<TaskWaveResponse>(
        await fetch('/api/studio/tasks/run-wave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            goal: mission,
            agents: [
              { role: 'Producer', surface: 'mission-ledger' },
              { role: 'QA', goal: 'Validate evidence, blockers, and rollback path.', surface: 'validation-graph' },
              { role: 'Release', goal: 'Prepare deploy/release checklist and risk notes.', surface: 'release-graph' },
            ],
          }),
        })
      )
      setWave(payload)
      const refreshed = await parseResponse<{ session: StudioSessionRecord }>(
        await fetch(`/api/studio/session/${encodeURIComponent(session.id)}`)
      )
      applySessionRecord(refreshed.session)
      setNotice(`Planned ${payload.taskCount ?? 0} coordinated task(s).`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not run Studio task wave.')
    } finally {
      setBusy(null)
    }
  }

  async function stopSession() {
    if (!session) return
    setBusy('stop')
    setNotice(null)
    try {
      const payload = await parseResponse<{ session: StudioSessionRecord }>(
        await fetch(`/api/studio/session/${encodeURIComponent(session.id)}/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Paused from Creative Studio mission control.' }),
        })
      )
      applySessionRecord(payload.session)
      setNotice('Studio session paused.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not stop Studio session.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mb-6 rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-primary)_22%,var(--aethel-border-primary))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_94%,transparent))] p-4 shadow-[0_24px_90px_rgba(2,6,23,0.28)] sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-primary-light)]">
              Mission Control
            </span>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusClass(session?.status)}`}>
              {session?.status ?? 'No session'}
            </span>
          </div>
          <label htmlFor="studio-mission" className="mt-4 block text-sm font-semibold text-[var(--aethel-text-primary)]">
            What should the Studio coordinate?
          </label>
          <textarea
            id="studio-mission"
            value={mission}
            onChange={(event) => setMission(event.target.value)}
            className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_76%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-primary)_55%,transparent)] focus:ring-2 focus:ring-[var(--aethel-focus-ring)]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as StudioMode)}
              className="min-h-10 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-3 text-xs font-semibold text-[var(--aethel-text-secondary)]"
              aria-label="Studio mode"
            >
              {MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={runtimeTarget}
              onChange={(event) => setRuntimeTarget(event.target.value as RuntimeTarget)}
              className="min-h-10 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-3 text-xs font-semibold text-[var(--aethel-text-secondary)]"
              aria-label="Runtime target"
            >
              {RUNTIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_58%,transparent)] p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-[var(--aethel-border-subtle)] p-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Session</p>
              <p className="mt-1 truncate text-xs font-semibold text-[var(--aethel-text-primary)]">{compactSessionId}</p>
            </div>
            <div className="rounded-xl border border-[var(--aethel-border-subtle)] p-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Tasks</p>
              <p className="mt-1 text-xs font-semibold text-[var(--aethel-text-primary)]">{session?.activeTaskIds.length ?? 0}</p>
            </div>
            <div className="rounded-xl border border-[var(--aethel-border-subtle)] p-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Evidence</p>
              <p className="mt-1 text-xs font-semibold text-[var(--aethel-text-primary)]">{session?.evidenceRefs.length ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={startSession}
              disabled={busy !== null || !mission.trim()}
              className="min-h-11 rounded-xl bg-[var(--aethel-primary-dark)] px-4 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:bg-[var(--aethel-primary)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy === 'resume' ? 'Resuming...' : busy === 'start' ? 'Starting...' : session ? 'Restart session' : 'Start session'}
            </button>
            <button
              type="button"
              onClick={runWave}
              disabled={!canRunWave || busy !== null}
              className="min-h-11 rounded-xl border border-[var(--aethel-border-primary)] px-4 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy === 'wave' ? 'Planning wave...' : 'Run 3-agent wave'}
            </button>
            <button
              type="button"
              onClick={stopSession}
              disabled={!canRunWave || busy !== null}
              className="min-h-10 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-4 text-xs font-semibold text-[var(--aethel-warning-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy === 'stop' ? 'Pausing...' : 'Pause session'}
            </button>
          </div>

          <StudioLocalRuntimeCapsule />

          {notice && (
            <p className="mt-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_45%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
              {notice}
            </p>
          )}
          {wave?.tasks && wave.tasks.length > 0 && (
            <div className="mt-3 space-y-1">
              {wave.tasks.slice(0, 3).map((task) => (
                <p key={task.id} className="truncate text-[11px] text-[var(--aethel-text-tertiary)]">
                  {task.goal}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
