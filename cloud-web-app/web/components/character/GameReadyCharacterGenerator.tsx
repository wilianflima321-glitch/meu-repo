'use client'

/**
 * Letter cb — Studio tool: Generate game-ready character.
 * Text → native (ca) when ready else BYOK clay (bx) → conveyor → FusionTx.
 * Zero-UI silent status when native ONNX HELD and BYOK missing.
 */

import { useCallback, useMemo, useState } from 'react'
import { MeshNativeGenHonestyBadge } from '@/components/character/MeshNativeGenHonestyBadge'
import {
  selectGameReadyCharacterRoute,
  runGameReadyCharacterGeneration,
  type GameReadyCharacterRoute,
  GAME_READY_CHARACTER_LETTER,
} from '@/lib/studio/game-ready-character-orchestrator'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'
import { createMemoryCostGuardLedger } from '@/lib/production/creative-cost-guard'
import { ensureProjectFusionYjsStore } from '@/lib/production/fusion-scope-registry'

export default function GameReadyCharacterGenerator() {
  const [prompt, setPrompt] = useState('stylized fantasy knight character')
  const [projectId, setProjectId] = useState('studio-local')
  const [status, setStatus] = useState('Ready — native ONNX HELD; BYOK clay poll when keys present')
  const [busy, setBusy] = useState(false)
  const [route, setRoute] = useState<GameReadyCharacterRoute | undefined>()
  const [stageSummary, setStageSummary] = useState('')

  const previewRoute = useMemo(() => {
    return selectGameReadyCharacterRoute({
      capabilityScore: 80,
      nativeOnnxReady: NATIVE_ONNX_READY,
      hasByok: false,
      hasClayKeys: false,
    }).route
  }, [])

  const onGenerate = useCallback(async () => {
    setBusy(true)
    setStageSummary('')
    try {
      const decision = selectGameReadyCharacterRoute({
        capabilityScore: 80,
        nativeOnnxReady: NATIVE_ONNX_READY,
        hasByok: false,
        hasClayKeys: false,
      })
      setRoute(decision.route)

      if (decision.route === 'zero-ui-held') {
        setStatus('Path held — configure BYOK clay keys (native ONNX soak HELD). Silent MoA fallback.')
        setBusy(false)
        return
      }

      const adapter = createMemoryCostGuardLedger()
      const fusionStore = ensureProjectFusionYjsStore(projectId)
      const result = await runGameReadyCharacterGeneration({
        projectId,
        userId: 'studio-user',
        prompt,
        capabilityScore: 80,
        costGuardAdapter: adapter,
        fusionStore,
        writePackEntry: true,
        hasByok: decision.route === 'byok-bx',
        hasClayKeys: decision.route === 'byok-bx',
      })
      setRoute(result.route)
      setStageSummary(
        result.stages
          .map((s) => `${s.stage}:${s.status}`)
          .slice(0, 8)
          .join(' · '),
      )
      if (result.zeroUi) {
        setStatus(`Zero-UI held — ${result.blockedReason ?? 'silent fallback'}`)
      } else if (result.success) {
        setStatus(
          `OK · route ${result.route}${result.fusionViewportStamped ? ' · FusionTx stamped' : ''}`,
        )
      } else {
        setStatus(result.blockedReason ?? 'Generation blocked')
      }
    } catch {
      setStatus('Held — generation unavailable (silent)')
    } finally {
      setBusy(false)
    }
  }, [prompt, projectId])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        maxWidth: 520,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        height: '100%',
        overflow: 'auto',
      }}
    >
      <header>
        <h2 style={{ margin: 0, fontSize: 18 }}>Generate game-ready character</h2>
        <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: 13 }}>
          Letter {GAME_READY_CHARACTER_LETTER} — text → native pager (ca) when ready, else BYOK clay
          (bx) → retopo/LOD/rig/PBR/V-HACD/heat → FusionTx. Preview route: {previewRoute}.
        </p>
      </header>

      <MeshNativeGenHonestyBadge route={route ?? previewRoute} />

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Project id
        <input value={projectId} onChange={(e) => setProjectId(e.target.value)} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Prompt
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the character…"
        />
      </label>

      <button
        type="button"
        disabled={busy || !prompt.trim()}
        onClick={() => void onGenerate()}
        style={{
          padding: '10px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy || !prompt.trim() ? 0.6 : 1,
        }}
      >
        {busy ? 'Generating…' : 'Generate game-ready character'}
      </button>

      <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>
        {status}
      </p>
      {stageSummary ? (
        <p style={{ margin: 0, fontSize: 11, fontFamily: 'ui-monospace, monospace', opacity: 0.7 }}>
          {stageSummary}
        </p>
      ) : null}
    </div>
  )
}
