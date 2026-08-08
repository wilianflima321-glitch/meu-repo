'use client'

/**
 * Letter cb — Studio panel: Generate game-ready character.
 * Invokes lib/native-gen IDE bridge + mesh-quality conveyor.
 * Honesty: native vs BYOK. Zero-UI when native ONNX unavailable.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  generateGameReadyCharacter,
  type GenerateGameReadyCharacterResult,
} from '@/lib/native-gen/native-gen-ide-bridge'
import { selectGameReadyCharacterRoute } from '@/lib/native-gen/native-gen-ide-route'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'
import { NativeGenPathHonestyBadge } from '@/components/character/NativeGenPathHonestyBadge'
import { createMemoryCostGuardLedger } from '@/lib/production/creative-cost-guard'
import { ensureProjectFusionYjsStore } from '@/lib/production/fusion-scope-registry'
import { buildMinimalObjFixture } from '@/lib/mesh-quality/clay-provider-adapters'

export default function GenerateGameReadyCharacterPanel() {
  const [prompt, setPrompt] = useState('game-ready fantasy knight character')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Text → route → conveyor → FusionTx viewport')
  const [last, setLast] = useState<GenerateGameReadyCharacterResult | null>(null)

  const route = useMemo(
    () => selectGameReadyCharacterRoute({ nativeOnnxReady: NATIVE_ONNX_READY }),
    [],
  )

  const onGenerate = useCallback(async () => {
    setBusy(true)
    setStatus(
      route.path === 'native-pager'
        ? 'Native pager path…'
        : 'BYOK clay via CreativeBridge (native ONNX HELD — Zero-UI)…',
    )
    try {
      const costGuardAdapter = createMemoryCostGuardLedger()
      costGuardAdapter.enableByok('studio-author')
      const fusionStore = ensureProjectFusionYjsStore('studio-local')
      const result = await generateGameReadyCharacter({
        projectId: 'studio-local',
        userId: 'studio-author',
        prompt: prompt.trim() || 'game-ready character',
        costGuardAdapter,
        fusionStore,
        // Offline fixture when no live clay job — exercises CreativeBridge ingest.
        offlineObjText: route.path === 'byok-clay' ? buildMinimalObjFixture() : undefined,
        planId: 'pro',
        byokProfileId: 'studio-byok',
        skipOnnx: true,
      })
      setLast(result)
      if (result.success) {
        setStatus(
          `OK · path=${result.path} · badge=${result.honestyBadge} · FusionTx stamped`,
        )
      } else {
        setStatus(
          result.blockedReason
            ? `Blocked (${result.blockedReason}) — Zero-UI, no spam`
            : 'Empty-honest — no invented mesh',
        )
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Generate failed')
    } finally {
      setBusy(false)
    }
  }, [prompt, route.path])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        maxWidth: 560,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        height: '100%',
        overflow: 'auto',
      }}
      data-aethel-cb="generate-game-ready-character"
    >
      <header>
        <h2 style={{ margin: 0, fontSize: 18 }}>Generate game-ready character</h2>
        <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: 13 }}>
          Prefer native pager when ready; else BYOK clay → retopo/LOD/V-HACD/heat/delight →
          FusionTx.
        </p>
      </header>

      <NativeGenPathHonestyBadge activeBadge={last?.honestyBadge ?? route.honestyBadge} />

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Prompt
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={busy}
        />
      </label>

      <button
        type="button"
        onClick={onGenerate}
        disabled={busy || !prompt.trim()}
        style={{
          padding: '10px 14px',
          fontWeight: 600,
          fontSize: 13,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy || !prompt.trim() ? 0.6 : 1,
        }}
      >
        {busy ? 'Generating…' : 'Generate game-ready character'}
      </button>

      <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }} role="status">
        {status}
      </p>

      {last && (
        <div
          style={{
            fontSize: 11,
            fontFamily: 'ui-monospace, monospace',
            opacity: 0.8,
            borderTop: '1px solid rgba(128,128,128,0.25)',
            paddingTop: 8,
          }}
        >
          <div>letter: {last.letter}</div>
          <div>path: {last.path}</div>
          <div>creativeBridge: {String(last.creativeBridgeUsed)}</div>
          <div>nativeOnnxReady: {String(last.nativeOnnxReady)}</div>
          <div>localCostUsd: {last.localNativeCostUsd}</div>
          <div>success: {String(last.success)}</div>
        </div>
      )}

      <p style={{ margin: 0, fontSize: 11, opacity: 0.55 }}>
        Maturity: IDE wire CLOSED (cb). ORT weights / Instant Meshes / Tripo local / commercial
        V-HACD / Coins / Agones [HELD].
      </p>
    </div>
  )
}
