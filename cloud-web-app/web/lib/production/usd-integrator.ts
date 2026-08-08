/**
 * AI-v1-e / J.7 — UsdIntegrator (content honesty)
 * Prompt positions library assets; Meshy/Tripo → USD cook path.
 * Never ships proxy capsule as character. Browser viewer is honest per format:
 *   USDZ preview = PARTIAL (three USDZLoader); USDA / .usd / USDC = HELD.
 * Aligns with Block 4 ASSET-001 hierarchy (GLTF/FBX/OBJ live).
 */

import { createHash, randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import { dispatchCreativeArtifact } from '@/lib/production/creative-artifact-bridge'
import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  recordFusionMutation,
  type FusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'
import type { ViewportAssetImportFormat } from '@/lib/viewport/viewport-asset-import'

const log = createComponentLogger('usd-integrator')

/** Logical USD family formats for the browser support matrix (J.7). */
export type UsdBrowserFormatId = 'usdz' | 'usda' | 'usd' | 'usdc'

export type UsdFormatShipStatus = 'PARTIAL' | 'HELD'

export type UsdBrowserLoaderId = 'three-usdzloader' | 'none'

export interface UsdBrowserFormatSupport {
  format: UsdBrowserFormatId
  shipStatus: UsdFormatShipStatus
  viewerStatus: UsdImportViewerStatus
  browserLoader: UsdBrowserLoaderId
  claim: string
}

/**
 * Explicit per-format matrix — never claim Pixar OpenUSD / Hydra stage in-browser.
 * USDZ preview uses Three.js USDZLoader (USDA-in-ZIP mesh subset only).
 */
export const USD_BROWSER_FORMAT_SUPPORT = {
  usdz: {
    format: 'usdz',
    shipStatus: 'PARTIAL',
    viewerStatus: 'live',
    browserLoader: 'three-usdzloader',
    claim:
      'Browser mesh preview via three/examples/jsm/loaders/USDZLoader (USDA-in-ZIP). Not OpenUSD/Pixar Hydra.',
  },
  usda: {
    format: 'usda',
    shipStatus: 'HELD',
    viewerStatus: 'held',
    browserLoader: 'none',
    claim: 'Standalone USDA ASCII stage has no browser loader — intake recorded; preview HELD.',
  },
  usd: {
    format: 'usd',
    shipStatus: 'HELD',
    viewerStatus: 'held',
    browserLoader: 'none',
    claim: 'Generic .usd (USDA or crate) has no browser loader — intake recorded; preview HELD.',
  },
  usdc: {
    format: 'usdc',
    shipStatus: 'HELD',
    viewerStatus: 'held',
    browserLoader: 'none',
    claim: 'Binary USDC crate is unsupported in-browser (USDZLoader rejects crate files).',
  },
} as const satisfies Record<UsdBrowserFormatId, UsdBrowserFormatSupport>

/**
 * Aggregate browser USD viewer ship status.
 * PARTIAL = USDZ preview path exists; full USD/USDA/USDC stage remains HELD.
 */
export const USD_BROWSER_VIEWER_SHIP_STATUS = 'PARTIAL' as const

/** ZIP local-file header magic — minimum eligibility probe before USDZLoader. */
const USDZ_ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const

export const USD_INTEGRATOR_HONESTY = {
  noProxyCapsule: 'Proxy capsule is not a shipped character.',
  noTripoOnlyAaa: 'Tripo/Meshy amorphous mesh is not a shipped AAA character without USD cook.',
  usdViewerHeld:
    'Full USD/USDA/USDC browser stage is HELD — USDZ mesh preview is PARTIAL via Three.js USDZLoader; OpenUSD/Hydra not claimed.',
  usdzPreviewPartial:
    'USDZ browser preview is PARTIAL (Three.js USDA-in-ZIP) — not a Pixar OpenUSD stage.',
  libraryPlacementOk: 'UsdIntegrator may position library assets from prompt — not invent final hero mesh.',
  noFullUsdStage:
    'Cannot claim shipped full Pixar USD stage from browser preview — USDA/USD/USDC remain HELD; USDZ is preview-only.',
} as const

export type UsdShipKind = 'character' | 'prop' | 'environment' | 'unknown'

export type UsdImportViewerStatus = 'live' | 'placeholder' | 'held'

export interface UsdAssetPlacement {
  assetId: string
  libraryPath: string
  label: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

export type UsdIntegratorBlockReason =
  | 'proxy_capsule_forbidden'
  | 'tripo_only_amorphous_forbidden'
  | 'usd_viewer_held'
  | 'usd_format_unsupported'
  | 'cost_guard'
  | 'transaction_aborted'
  | 'empty_artifact'
  | 'provider_down'
  | 'invalid_input'

export interface UsdCharacterShipGateResult {
  allowed: boolean
  reason?: UsdIntegratorBlockReason
  message: string
  shipKind: UsdShipKind
  viewerStatus: UsdImportViewerStatus
}

export function isUsdBrowserFormatId(format: string): format is UsdBrowserFormatId {
  return format === 'usdz' || format === 'usda' || format === 'usd' || format === 'usdc'
}

export function resolveUsdBrowserFormatSupport(
  format: string,
): UsdBrowserFormatSupport | null {
  if (!isUsdBrowserFormatId(format)) return null
  return USD_BROWSER_FORMAT_SUPPORT[format]
}

/**
 * Fail-closed eligibility for USDZ browser preview bytes (ZIP magic).
 * Does not parse USDA; loader still may reject crate-inside-zip at runtime.
 */
export function evaluateUsdzPreviewEligibility(bytes: ArrayBuffer | Uint8Array): {
  eligible: boolean
  reason?: 'empty_payload' | 'not_zip_container'
  message: string
} {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (view.byteLength === 0) {
    return {
      eligible: false,
      reason: 'empty_payload',
      message: 'USDZ preview denied — empty payload (Law XVI fail-closed).',
    }
  }
  if (view.byteLength < 4 || USDZ_ZIP_MAGIC.some((b, i) => view[i] !== b)) {
    return {
      eligible: false,
      reason: 'not_zip_container',
      message: 'USDZ preview denied — buffer is not a ZIP container (PK\\x03\\x04).',
    }
  }
  return {
    eligible: true,
    message: USD_BROWSER_FORMAT_SUPPORT.usdz.claim,
  }
}

/**
 * Resolve honest viewer status for an import format (ASSET-001 + J.7 matrix).
 */
export function resolveUsdImportViewerStatus(format: ViewportAssetImportFormat): UsdImportViewerStatus {
  const usd = resolveUsdBrowserFormatSupport(format)
  if (usd) return usd.viewerStatus
  if (format === 'glb' || format === 'gltf' || format === 'fbx' || format === 'obj') return 'live'
  return 'placeholder'
}

/**
 * Character ship gate — capsule / Tripo-only amorphous never count as shipped character.
 * Full OpenUSD stage claims stay blocked even when USDZ preview is live.
 */
export function evaluateUsdCharacterShipGate(input: {
  shipKind: UsdShipKind
  geometryProxy?: 'capsule' | 'box' | 'sphere' | 'none'
  source?: 'library-usd' | 'meshy' | 'tripo' | 'gltf-hierarchy' | 'unknown'
  usdCookReceiptId?: string
  format?: ViewportAssetImportFormat | UsdBrowserFormatId
  claimShippedAaa?: boolean
  claimFullUsdStage?: boolean
}): UsdCharacterShipGateResult {
  const format = input.format
  const support = format ? resolveUsdBrowserFormatSupport(format) : null
  const viewerStatus = format
    ? support?.viewerStatus ?? resolveUsdImportViewerStatus(format as ViewportAssetImportFormat)
    : 'placeholder'

  if (input.shipKind === 'character' && input.geometryProxy === 'capsule') {
    return {
      allowed: false,
      reason: 'proxy_capsule_forbidden',
      message: USD_INTEGRATOR_HONESTY.noProxyCapsule,
      shipKind: input.shipKind,
      viewerStatus: 'placeholder',
    }
  }

  if (
    input.shipKind === 'character' &&
    (input.source === 'tripo' || input.source === 'meshy') &&
    !input.usdCookReceiptId
  ) {
    return {
      allowed: false,
      reason: 'tripo_only_amorphous_forbidden',
      message: USD_INTEGRATOR_HONESTY.noTripoOnlyAaa,
      shipKind: input.shipKind,
      viewerStatus: 'held',
    }
  }

  if (input.claimFullUsdStage || (input.claimShippedAaa && support)) {
    return {
      allowed: false,
      reason: 'usd_viewer_held',
      message: USD_INTEGRATOR_HONESTY.noFullUsdStage,
      shipKind: input.shipKind,
      viewerStatus,
    }
  }

  if (viewerStatus !== 'live' && input.claimShippedAaa) {
    return {
      allowed: false,
      reason: 'usd_viewer_held',
      message: USD_INTEGRATOR_HONESTY.usdViewerHeld,
      shipKind: input.shipKind,
      viewerStatus,
    }
  }

  if (support) {
    if (support.shipStatus === 'HELD') {
      return {
        allowed: true,
        message: `USD intake recorded — ${support.format} viewer HELD (${USD_BROWSER_VIEWER_SHIP_STATUS} aggregate; USDZ preview only)`,
        shipKind: input.shipKind,
        viewerStatus: 'held',
      }
    }
    return {
      allowed: true,
      message: `USDZ intake recorded — browser preview ${support.shipStatus}; ${USD_INTEGRATOR_HONESTY.usdzPreviewPartial}`,
      shipKind: input.shipKind,
      viewerStatus: 'live',
    }
  }

  if (input.source === 'gltf-hierarchy' || input.source === 'library-usd') {
    return {
      allowed: true,
      message: USD_INTEGRATOR_HONESTY.libraryPlacementOk,
      shipKind: input.shipKind,
      viewerStatus: input.source === 'gltf-hierarchy' ? 'live' : viewerStatus,
    }
  }

  return {
    allowed: true,
    message: 'Placement-only path — no AAA character claim.',
    shipKind: input.shipKind,
    viewerStatus,
  }
}

export interface UsdIntegratorSuccess {
  success: true
  placements: UsdAssetPlacement[]
  fusionTransactionId: string
  snapshotHashBefore: string
  snapshotHashAfter: string
  evidenceReceiptId: string
  honesty: typeof USD_INTEGRATOR_HONESTY
  viewerStatus: UsdImportViewerStatus
  usdCookStatus: 'HELD' | 'library-placed'
  browserViewerShipStatus: typeof USD_BROWSER_VIEWER_SHIP_STATUS
  formatSupport: ReadonlyArray<UsdBrowserFormatSupport>
  ledger: TaskEvidenceLedger
}

export interface UsdIntegratorDenied {
  success: false
  blockedReason: UsdIntegratorBlockReason
  message: string
  honesty: typeof USD_INTEGRATOR_HONESTY
  ledger: TaskEvidenceLedger
}

export type UsdIntegratorResult = UsdIntegratorSuccess | UsdIntegratorDenied

/**
 * Prompt → library asset placements inside FusionTx (manifest scope).
 * Does not generate Meshy/Tripo meshes as shipped characters.
 */
export async function runUsdIntegrator(input: {
  projectId: string
  userId: string
  prompt: string
  libraryAssets: Array<{ assetId: string; libraryPath: string; label: string }>
  shipKind?: UsdShipKind
  planId?: string
  byokProfileId?: string
  usageBucketId?: string
  estimatedTokenWeight?: number
  adapter: CostGuardLedgerAdapter
  store: FusionScopeStore
  /** If true, reject — Tripo-only character without cook */
  claimTripoCharacterShipped?: boolean
  claimCapsuleCharacterShipped?: boolean
  claimFullUsdStage?: boolean
}): Promise<UsdIntegratorResult> {
  let ledger = createTaskEvidenceLedger({
    taskId: `usd-int-${randomUUID().slice(0, 8)}`,
    projectId: input.projectId,
    mission: `J.7 UsdIntegrator: ${input.prompt.slice(0, 80)}`,
    ownerAgent: 'UsdIntegrator',
  })

  const shipKind = input.shipKind ?? 'prop'

  if (input.claimCapsuleCharacterShipped) {
    const gate = evaluateUsdCharacterShipGate({
      shipKind: 'character',
      geometryProxy: 'capsule',
    })
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'USD character gate REJECT',
      summary: gate.message,
      refs: ['gate:proxy-capsule'],
      actor: 'UsdIntegrator',
    })
    return {
      success: false,
      blockedReason: 'proxy_capsule_forbidden',
      message: gate.message,
      honesty: USD_INTEGRATOR_HONESTY,
      ledger,
    }
  }

  if (input.claimTripoCharacterShipped) {
    const gate = evaluateUsdCharacterShipGate({
      shipKind: 'character',
      source: 'tripo',
    })
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'USD character gate REJECT',
      summary: gate.message,
      refs: ['gate:tripo-only'],
      actor: 'UsdIntegrator',
    })
    return {
      success: false,
      blockedReason: 'tripo_only_amorphous_forbidden',
      message: gate.message,
      honesty: USD_INTEGRATOR_HONESTY,
      ledger,
    }
  }

  if (input.claimFullUsdStage) {
    const gate = evaluateUsdCharacterShipGate({
      shipKind,
      claimFullUsdStage: true,
    })
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'USD stage claim REJECT',
      summary: gate.message,
      refs: ['gate:full-usd-stage'],
      actor: 'UsdIntegrator',
    })
    return {
      success: false,
      blockedReason: 'usd_viewer_held',
      message: gate.message,
      honesty: USD_INTEGRATOR_HONESTY,
      ledger,
    }
  }

  if (!input.libraryAssets.length) {
    return {
      success: false,
      blockedReason: 'invalid_input',
      message: 'UsdIntegrator requires at least one library asset path — will not invent a capsule stand-in.',
      honesty: USD_INTEGRATOR_HONESTY,
      ledger,
    }
  }

  const placements: UsdAssetPlacement[] = input.libraryAssets.map((a, i) => ({
    assetId: a.assetId,
    libraryPath: a.libraryPath,
    label: a.label,
    position: [((i % 3) - 1) * 1.5, 0, -1.2 - Math.floor(i / 3) * 1.2],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  }))

  let tx
  try {
    tx = await beginCreativeFusionTransaction({
      projectId: input.projectId,
      yDocScope: 'manifest',
      store: input.store,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'transaction_aborted'
    return {
      success: false,
      blockedReason: 'transaction_aborted',
      message,
      honesty: USD_INTEGRATOR_HONESTY,
      ledger,
    }
  }

  const weight = input.estimatedTokenWeight ?? 800
  const placementId = `usd_place_${createHash('sha256')
    .update(`${input.projectId}:${placements.map((p) => p.assetId).join('|')}`)
    .digest('hex')
    .slice(0, 12)}`

  const formatMatrix = Object.values(USD_BROWSER_FORMAT_SUPPORT)

  const { result: bridge, ledger: bridgeLedger } = await dispatchCreativeArtifact({
    request: {
      domain: 'mesh',
      prompt: input.prompt,
      projectId: input.projectId,
      userId: input.userId,
      evidenceKind: 'usd-integrator-placement',
      costGuard: {
        estimatedTokenWeight: weight,
        byokProfileId: input.byokProfileId,
        usageBucketId: input.usageBucketId,
        planId: input.planId ?? 'pro',
      },
      fusionTransactionId: tx.id,
      requiresFusionWrite: true,
      fusionScope: 'manifest',
    },
    adapter: input.adapter,
    ledger,
    provider: async () => {
      const payload = JSON.stringify({
        projectId: input.projectId,
        scope: 'manifest',
        placementId,
        placements,
        shipKind,
        geometryProxy: 'none',
        usdCookStatus: 'library-placed',
        browserUsdViewer: USD_BROWSER_VIEWER_SHIP_STATUS,
        formatSupport: formatMatrix,
        honesty: USD_INTEGRATOR_HONESTY,
        updatedAt: new Date().toISOString(),
      })
      recordFusionMutation(tx.id, input.store, payload)
      return {
        artifactId: placementId,
        provider: 'usd-integrator-library',
        costUsd: 0,
        actualTokenWeight: weight,
        empty: placements.length === 0,
      }
    },
  })

  ledger = bridgeLedger

  if (!bridge.success) {
    return {
      success: false,
      blockedReason:
        bridge.blockedReason === 'transaction_aborted'
          ? 'transaction_aborted'
          : bridge.blockedReason === 'empty_artifact'
            ? 'empty_artifact'
            : bridge.blockedReason === 'provider_down'
              ? 'provider_down'
              : 'cost_guard',
      message: `CreativeBridge blocked UsdIntegrator: ${bridge.blockedReason ?? 'unknown'}`,
      honesty: USD_INTEGRATOR_HONESTY,
      ledger,
    }
  }

  const committed = await commitCreativeFusionTransaction(tx.id, input.store)

  ledger = appendTaskEvidence(ledger, {
    kind: 'artifact',
    title: 'UsdIntegrator library placement',
    summary: `${placements.length} assets placed — no capsule proxy; browser USD viewer ${USD_BROWSER_VIEWER_SHIP_STATUS} (USDZ preview only)`,
    refs: [
      `placement:${placementId}`,
      `tx:${tx.id}`,
      `snap:${tx.snapshotHashBefore}→${committed.snapshotHashAfter}`,
      'j7:no-proxy-capsule',
      'j7:usdz-preview-partial',
    ],
    actor: 'UsdIntegrator',
  })

  log.info('usd_integrator_ok', {
    placementId,
    count: placements.length,
    shipKind,
    txId: tx.id,
    browserViewer: USD_BROWSER_VIEWER_SHIP_STATUS,
  })

  const primaryExt = input.libraryAssets[0]?.libraryPath.split('.').pop()?.toLowerCase()
  const primaryFormat = (
    ['glb', 'gltf', 'fbx', 'obj', 'usd', 'usda', 'usdz'] as const
  ).includes(primaryExt as ViewportAssetImportFormat)
    ? (primaryExt as ViewportAssetImportFormat)
    : undefined

  return {
    success: true,
    placements,
    fusionTransactionId: tx.id,
    snapshotHashBefore: tx.snapshotHashBefore,
    snapshotHashAfter: committed.snapshotHashAfter,
    evidenceReceiptId: ledger.events[ledger.events.length - 1]?.id ?? '',
    honesty: USD_INTEGRATOR_HONESTY,
    viewerStatus: primaryFormat
      ? resolveUsdImportViewerStatus(primaryFormat)
      : 'placeholder',
    usdCookStatus: 'library-placed',
    browserViewerShipStatus: USD_BROWSER_VIEWER_SHIP_STATUS,
    formatSupport: formatMatrix,
    ledger,
  }
}
