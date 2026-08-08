'use client'

/**
 * Letter cd — Studio panel: Generate world (World Forge).
 * Invokes lib/world-forge IDE bridge + conveyor (cc).
 * Honesty: math PCG ready vs LoRA HELD. Zero-UI when LoRA/ONNX HELD.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  generateWorldForge,
  type GenerateWorldForgeResult,
} from '@/lib/world-forge/world-forge-ide-bridge'
import { selectWorldForgeRoute } from '@/lib/world-forge/world-forge-ide-route'
import { LORA_CLAY_READY } from '@/lib/world-forge/lora-clay-registry'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'
import { WorldForgePathHonestyBadge } from '@/components/world/WorldForgePathHonestyBadge'
import { ensureProjectFusionYjsStore } from '@/lib/production/fusion-scope-registry'

export default function GenerateWorldForgePanel() {
  const [prompt, setPrompt] = useState('rugged highland meadows with pine ridges')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(
    'Text → SDF heightfield + biome + PCG scatter + NavMesh → FusionTx',
  )
  const [last, setLast] = useState<GenerateWorldForgeResult | null>(null)

  const route = useMemo(
    () =>
      selectWorldForgeRoute({
        loraClayReady: LORA_CLAY_READY,
        nativeOnnxReady: NATIVE_ONNX_READY,
      }),
    [],
  )

  const onGenerate = useCallback(async () => {
    setBusy(true)
    setStatus(
      route.path === 'lora-enriched'
        ? 'LoRA-enriched world path…'
        : 'Math PCG world (LoRA HELD — Zero-UI)…',
    )
    try {
      const fusionStore = ensureProjectFusionYjsStore('studio-local')
      const result = await generateWorldForge({
        projectId: 'studio-local',
        userId: 'studio-author',
        prompt: prompt.trim() || 'highland meadows',
        fusionStore,
        capabilityScore: 80,
        preferWebBudget: true,
      })
      setLast(result)
      if (result.success) {
        const hf = result.conveyor?.heightfield?.meta.resolution
        const walkable = result.conveyor?.navmesh?.walkableCount
        setStatus(
          `OK · path=${result.path} · badge=${result.honestyBadge} · res=${hf ?? '?'} · walkable=${walkable ?? '?'} · FusionTx stamped`,
        )
      } else {
        setStatus(
          result.blockedReason
            ? `Blocked (${result.blockedReason}) — Zero-UI, no spam`
            : 'Empty-honest — no invented world',
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
      data-aethel-cd="generate-world-forge"
    >
      <header>
        <h2 style={{ margin: 0, fontSize: 18 }}>Generate world</h2>
        <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: 13 }}>
          Prompt → SDF heightfield + biome mask + PCG foliage scatter + CPU NavMesh →
          FusionTx. Math works when LoRA/ONNX HELD.
        </p>
      </header>

      <WorldForgePathHonestyBadge activeBadge={last?.honestyBadge ?? route.honestyBadge} />

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
        {busy ? 'Generating…' : 'Generate world'}
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
          <div>loraClayReady: {String(last.loraClayReady)}</div>
          <div>nativeOnnxReady: {String(last.nativeOnnxReady)}</div>
          <div>mathWorldReady: {String(last.mathWorldReady)}</div>
          <div>localCostUsd: {last.localMathCostUsd}</div>
          <div>success: {String(last.success)}</div>
          <div>fusionTxId: {last.conveyor?.fusionTxId ?? '—'}</div>
          <div>heightfieldRes: {last.conveyor?.heightfield?.meta.resolution ?? '—'}</div>
          <div>walkable: {last.conveyor?.navmesh?.walkableCount ?? '—'}</div>
        </div>
      )}

      <p style={{ margin: 0, fontSize: 11, opacity: 0.55 }}>
        Maturity: IDE wire CLOSED (cd). LoRA/ONNX / city-from-prompt / Substance / GPU Recast /
        World Partition / Nanite cinema / Coins / Agones [HELD].
      </p>
    </div>
  )
}
