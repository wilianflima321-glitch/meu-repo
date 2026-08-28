/**
 * GAS / gameplay ability evidence (fail-closed UE GAS AAA + 60Hz IPC).
 *
 * Seals in-process GasWorld effect apply + ECS tick attribute mutation.
 * Never claims desktop 60Hz binary IPC or Unreal GAS parity.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import { createGasWorld } from '@/lib/gas/gas-world'
import { evaluateGasIpcHonesty, GAS_IPC_SHIP_STATUS } from '@/lib/gas/gas-ipc-honesty'
import type { GameplayEffectDefinition } from '@/lib/gas/types'

const log = createComponentLogger('gas-ability-evidence')

export const UNREAL_GAS_AAA_READY = false as const
export const GAS_AAA_MARKETING_ALLOWED = false as const
export const GAS_60HZ_BINARY_IPC_READY = false as const

export type GasEvidenceRejectCode =
  | 'effect_rejected'
  | 'no_attribute_delta'
  | 'empty_evidence'
  | 'aaa_claim_held'
  | 'ipc_claim_held'

export type GasEvidenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: GasEvidenceRejectCode; message: string }

export type GasAbilityEvidence = {
  version: 1
  effectId: string
  healthBefore: number
  healthAfter: number
  healthDelta: number
  tickCount: number
  fingerprint: string
  unrealGasAaaReady: false
  gas60HzBinaryIpcReady: false
  marketingAllowed: false
  ipcShipStatus: typeof GAS_IPC_SHIP_STATUS
}

function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

/**
 * GasWorld → ecs-dots JobSystem spins Workers. Vitest/node has no Worker —
 * install a no-op stub for evidence soaks only (never claims desktop IPC).
 */
function ensureEvidenceWorkerStub(): void {
  if (typeof (globalThis as { Worker?: unknown }).Worker !== 'undefined') return
  ;(globalThis as {
    Worker: new (url: string | URL) => {
      terminate: () => void
      postMessage: (message?: unknown, transfer?: Transferable[]) => void
      onmessage: null
    }
  }).Worker =
    class {
      onmessage: null = null
      postMessage(_message?: unknown, _transfer?: Transferable[]): void {}
      terminate(): void {}
      constructor(_url: string | URL) {}
    }
}

const EVIDENCE_HEAL: GameplayEffectDefinition = {
  id: 'gas-evidence-heal',
  name: 'GAS evidence heal',
  durationPolicy: 'instant',
  modifiers: [{ attribute: 'Health', operation: 'add', magnitude: 25 }],
  applicationCueTag: 'Cue.Evidence.Heal',
}

/**
 * Apply instant GameplayEffect on GasWorld and seal attribute delta evidence.
 */
export function runGasAbilityEvidenceSoak(input?: {
  initialHealth?: number
  healMagnitude?: number
}): GasEvidenceResult<GasAbilityEvidence> {
  ensureEvidenceWorkerStub()
  const initialHealth = input?.initialHealth ?? 50
  const healMagnitude = input?.healMagnitude ?? 25
  const world = createGasWorld()
  const entity = world.createEntity({ Health: initialHealth, Mana: 10, Stamina: 10, MovementSpeed: 1 })

  const before = world.getAttribute(entity, 'Health')
  const effect: GameplayEffectDefinition = {
    ...EVIDENCE_HEAL,
    modifiers: [{ attribute: 'Health', operation: 'add', magnitude: healMagnitude }],
  }

  const applied = world.applyGameplayEffect(entity, effect)
  if (!applied) {
    return {
      ok: false,
      code: 'effect_rejected',
      message: 'GAS evidence soak — GameplayEffect rejected',
    }
  }

  // Drive ECS scheduler (GameplayEffectTick) — instant already mutated; tick proves wire.
  world.tick(1 / 60)
  world.tick(1 / 60)

  const after = world.getAttribute(entity, 'Health')
  const delta = after - before
  if (!(delta > 0)) {
    return {
      ok: false,
      code: 'no_attribute_delta',
      message: 'GAS evidence soak — Health did not increase after heal effect',
    }
  }

  const fp = fingerprint([
    'gas-ecs',
    effect.id,
    String(before),
    String(after),
    delta.toFixed(4),
    'ticks:2',
    GAS_IPC_SHIP_STATUS,
  ])

  const evidence: GasAbilityEvidence = {
    version: 1,
    effectId: effect.id,
    healthBefore: before,
    healthAfter: after,
    healthDelta: delta,
    tickCount: 2,
    fingerprint: fp,
    unrealGasAaaReady: false,
    gas60HzBinaryIpcReady: false,
    marketingAllowed: false,
    ipcShipStatus: GAS_IPC_SHIP_STATUS,
  }

  log.info('gas_ability_evidence_sealed', {
    fingerprint: fp,
    healthDelta: delta,
    ipc: GAS_IPC_SHIP_STATUS,
    aaa: false,
  })

  return { ok: true, value: evidence }
}

export function claimUnrealGasAaa(): GasEvidenceResult<never> {
  return {
    ok: false,
    code: 'aaa_claim_held',
    message: 'UNREAL_GAS_AAA_READY=false — GasWorld ECS-local ≠ Unreal GAS AAA',
  }
}

export function claimGas60HzBinaryIpc(): GasEvidenceResult<never> {
  return {
    ok: false,
    code: 'ipc_claim_held',
    message: 'GAS_60HZ_BINARY_IPC_READY=false — web GasWorld is not 60Hz desktop binary IPC',
  }
}

export function probeGasAbilityEvidenceReadiness(): {
  id: 'gas-ability-evidence'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  unrealGasAaaReady: false
  gas60HzBinaryIpcReady: false
  marketingAllowed: false
  path: string
  note: string
} {
  const soak = runGasAbilityEvidenceSoak()
  const zeroHeal = runGasAbilityEvidenceSoak({ healMagnitude: 0 })
  const aaa = claimUnrealGasAaa()
  const ipc = claimGas60HzBinaryIpc()
  const ipcHonesty = evaluateGasIpcHonesty()

  const ready =
    soak.ok &&
    soak.value.fingerprint.length >= 8 &&
    soak.value.healthDelta > 0 &&
    soak.value.unrealGasAaaReady === false &&
    soak.value.gas60HzBinaryIpcReady === false &&
    !zeroHeal.ok &&
    !aaa.ok &&
    !ipc.ok &&
    ipcHonesty.canClaim60HzBinaryIpc === false &&
    ipcHonesty.shipStatus === 'HELD' &&
    UNREAL_GAS_AAA_READY === false &&
    GAS_AAA_MARKETING_ALLOWED === false &&
    GAS_60HZ_BINARY_IPC_READY === false

  return {
    id: 'gas-ability-evidence',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    unrealGasAaaReady: false,
    gas60HzBinaryIpcReady: false,
    marketingAllowed: false,
    path: 'lib/gas/gas-ability-evidence.ts',
    note: ready
      ? 'GasWorld effect+tick evidence PARTIAL; Unreal GAS AAA / 60Hz binary IPC marketing HELD.'
      : 'GAS ability evidence probe failed.',
  }
}
