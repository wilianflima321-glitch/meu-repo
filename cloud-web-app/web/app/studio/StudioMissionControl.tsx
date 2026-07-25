'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { analytics } from '@/lib/analytics'
import {
  buildRuntimeModeViewModels,
  runtimeModeForTarget,
} from '@aethel/runtime/runtime-mode-view-model'
import { buildGameScopePlan } from '@/lib/production/game-scope-orchestrator'
import {
  clearStudioSessionId,
  getStudioSessionId,
  setStudioSessionId,
} from '@/lib/storage/ui-persistence-spine'
import { parseResponse } from './StudioMissionControl.options'
import type {
  PlayableGameGenre,
  PlayableGameScope,
  RuntimeTarget,
  StudioMode,
  StudioSessionRecord,
  TaskWaveResponse,
} from './StudioMissionControl.types'
import { StudioMissionControlView } from './StudioMissionControlView'

export default function StudioMissionControl() {
  const [mission, setMission] = useState('Coordinate a playable scene, review trail, and release checklist.')
  const [mode, setMode] = useState<StudioMode>('game')
  const [gameScope, setGameScope] = useState<PlayableGameScope>('demo')
  const [gameGenre, setGameGenre] = useState<PlayableGameGenre>('custom')
  const [runtimeTarget, setRuntimeTarget] = useState<RuntimeTarget>('local-main-safe')
  const [session, setSession] = useState<StudioSessionRecord | null>(null)
  const [wave, setWave] = useState<TaskWaveResponse | null>(null)
  const [busy, setBusy] = useState<'resume' | 'start' | 'wave' | 'stop' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const canRunWave = session?.status === 'active'
  const pixelStreamUrl = process.env.NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL
  const runtimeModes = useMemo(() => buildRuntimeModeViewModels({ pixelStreamUrl }), [pixelStreamUrl])
  const selectedRuntimeMode = useMemo(() => runtimeModeForTarget(runtimeModes, runtimeTarget), [runtimeModes, runtimeTarget])
  const compactSessionId = useMemo(() => (session ? session.id.replace(/^studio_/, '').slice(0, 12) : 'none'), [session])
  const gameScopePlan = useMemo(() => {
    if (mode !== 'game') return null
    return buildGameScopePlan({
      scope: gameScope,
      genre: gameGenre,
      userIntent: mission,
      budgetUsd: gameScope === 'prototype' ? 8 : gameScope === 'demo' ? 35 : gameScope === 'vertical-slice' ? 65 : 120,
      runtimeCapabilities: {
        'license-provenance-scanner': true,
        'studio-local': runtimeTarget === 'local-native',
        'pixel-stream-url': Boolean(pixelStreamUrl),
      },
    })
  }, [gameGenre, gameScope, mission, mode, pixelStreamUrl, runtimeTarget])

  const applySessionRecord = useCallback((record: StudioSessionRecord) => {
    setSession(record)
    setMission(record.mission)
    setMode(record.mode as StudioMode)
    setRuntimeTarget(runtimeModeForTarget(runtimeModes, record.runtimeTarget).runtimeTarget)
    setStudioSessionId(record.id)
  }, [runtimeModes])

  useEffect(() => {
    const sessionId = getStudioSessionId()
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
        clearStudioSessionId()
        if (isMounted) setNotice('Previous Studio session could not be resumed.')
      })
      .finally(() => {
        if (isMounted) setBusy(null)
      })

    return () => {
      isMounted = false
    }
  }, [applySessionRecord])

  const startSession = useCallback(async () => {
    setBusy('start')
    setNotice(null)
    try {
      analytics?.track('project', 'mission_submit', {
        label: 'studio_session_start',
        metadata: { mode, runtimeTarget, gameScope: mode === 'game' ? gameScope : undefined, gameGenre: mode === 'game' ? gameGenre : undefined },
      })
      const payload = await parseResponse<{ session: StudioSessionRecord }>(
        await fetch('/api/studio/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mission, mode, runtimeTarget, gameScope: mode === 'game' ? gameScope : undefined, gameGenre: mode === 'game' ? gameGenre : undefined }),
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
  }, [applySessionRecord, gameGenre, gameScope, mission, mode, runtimeTarget])

  const runWave = useCallback(async () => {
    if (!session) return
    setBusy('wave')
    setNotice(null)
    try {
      analytics?.track('ai', 'ai_chat', {
        label: 'studio_parallel_wave',
        metadata: { sessionId: session.id, mode, runtimeTarget, gameScope: mode === 'game' ? gameScope : undefined, gameGenre: mode === 'game' ? gameGenre : undefined },
      })
      const payload = await parseResponse<TaskWaveResponse>(
        await fetch('/api/studio/tasks/run-wave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            goal: mission,
            agents: buildStudioWaveAgents(gameScopePlan),
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
  }, [applySessionRecord, gameGenre, gameScope, gameScopePlan, mission, mode, runtimeTarget, session])

  const stopSession = useCallback(async () => {
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
  }, [applySessionRecord, session])

  const studioStats = [
    { label: 'Session', value: compactSessionId },
    { label: 'Tasks', value: String(session?.activeTaskIds.length ?? 0) },
    { label: 'Receipts', value: String(session?.evidenceRefs.length ?? 0) },
    { label: 'Plan', value: gameScopePlan?.productionBible.pillars.slice(0, 2).join(', ') ?? 'held' },
    { label: 'Playtests', value: String(gameScopePlan?.playtestSpine.scenarios.length ?? 0) },
    { label: 'Cinematics', value: gameScopePlan?.cinematicEvidence.state ?? 'held' },
  ]

  return (
    <StudioMissionControlView
      mission={mission}
      setMission={setMission}
      mode={mode}
      setMode={setMode}
      gameScope={gameScope}
      setGameScope={setGameScope}
      gameGenre={gameGenre}
      setGameGenre={setGameGenre}
      runtimeTarget={runtimeTarget}
      setRuntimeTarget={setRuntimeTarget}
      runtimeModes={runtimeModes}
      selectedRuntimeMode={selectedRuntimeMode}
      gameScopePlan={gameScopePlan}
      session={session}
      wave={wave}
      busy={busy}
      notice={notice}
      canRunWave={canRunWave}
      runtimeReady={selectedRuntimeMode.status === 'available' || selectedRuntimeMode.status === 'beta'}
      studioStats={studioStats}
      startSession={startSession}
      runWave={runWave}
      stopSession={stopSession}
    />
  )
}

function buildStudioWaveAgents(gameScopePlan: ReturnType<typeof buildGameScopePlan> | null) {
  return [
    { role: 'Producer', goal: gameScopePlan?.nextAction ?? 'Coordinate mission scope, receipts, and next action.', surface: 'mission-ledger' },
    ...(gameScopePlan
      ? [
          { role: 'Narrative', goal: 'Prepare story, world, and character plan before heavy generation.', surface: 'production-bible' },
          { role: 'Gameplay', goal: 'Convert scope into core loop, input, camera, and playtest contracts.', surface: 'gameplay-graph' },
          { role: 'Cinematic', goal: 'Plan storyboard, animatic, AI video reference, engine capture, and review receipts.', surface: 'cinematic-evidence' },
        ]
      : []),
    { role: 'QA', goal: 'Validate receipts, blockers, and rollback path.', surface: 'validation-graph' },
    { role: 'Release', goal: 'Prepare deploy/release checklist and risk notes.', surface: 'release-graph' },
  ]
}
