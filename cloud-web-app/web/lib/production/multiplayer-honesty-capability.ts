/**
 * Block 2B.3 — Multiplayer honesty capability surface.
 * Never market simulated Agones / dedicated URLs as live servers.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('multiplayer-honesty-capability')

export type MpPathStatus = 'live' | 'held' | 'fallback'

export type MpCapabilityStatus = 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED'

export interface MultiplayerModeReport {
  mode: 'p2p-lan' | 'dedicated-agones' | 'rollback-competitive'
  status: MpPathStatus
  capabilityStatus: MpCapabilityStatus
  connectable: boolean
  placeboForbidden: true
  notes: string[]
  heldReason?: string
}

export interface MultiplayerHonestyReport {
  generatedAt: string
  p2pLan: MultiplayerModeReport
  dedicated: MultiplayerModeReport
  rollback: MultiplayerModeReport
  /** True only when a live Agones allocator is configured and probed. */
  marketingDedicatedAllowed: boolean
  /** True only after G.2 unlock — cross-play claims. */
  marketingCrossPlayAllowed: boolean
  claim: string
  productCopy: string
}

export interface MultiplayerHonestyInput {
  /** AGONES_ALLOCATOR_URL set and reachable (caller probes; default = env present). */
  agonesAllocatorConfigured?: boolean
  /** Last allocation was simulated (not routable). */
  lastAllocationSimulated?: boolean
  /** Rapier deterministic replay proven for competitive rollback. */
  rollbackDeterministicProven?: boolean
  /** G.2 cross-play marketing unlock flag (file/env). */
  crossPlayMarketingUnlocked?: boolean
  forceDedicatedHeld?: boolean
  forceP2pHeld?: boolean
}

function envAgonesConfigured(): boolean {
  return Boolean(process.env.AGONES_ALLOCATOR_URL?.trim())
}

/**
 * Produce an honest MP capability report for matchmaking / Hub / Critic gates.
 */
export function evaluateMultiplayerHonesty(input: MultiplayerHonestyInput = {}): MultiplayerHonestyReport {
  const agonesConfigured =
    input.agonesAllocatorConfigured ?? envAgonesConfigured()
  const simulated = input.lastAllocationSimulated === true
  const rollbackProven = input.rollbackDeterministicProven === true
  const crossPlayUnlocked = input.crossPlayMarketingUnlocked === true

  let p2pLan: MultiplayerModeReport
  if (input.forceP2pHeld) {
    p2pLan = {
      mode: 'p2p-lan',
      status: 'held',
      capabilityStatus: 'NOT_IMPLEMENTED',
      connectable: false,
      placeboForbidden: true,
      notes: ['P2P/LAN explicitly held'],
      heldReason: 'forceP2pHeld',
    }
  } else {
    p2pLan = {
      mode: 'p2p-lan',
      status: 'live',
      capabilityStatus: 'IMPLEMENTED',
      connectable: true,
      placeboForbidden: true,
      notes: ['WebRTC / signal room P2P-LAN is the shipped co-op path'],
    }
  }

  let dedicated: MultiplayerModeReport
  if (input.forceDedicatedHeld || !agonesConfigured || simulated) {
    dedicated = {
      mode: 'dedicated-agones',
      status: 'held',
      capabilityStatus: agonesConfigured && !simulated ? 'PARTIAL' : 'NOT_IMPLEMENTED',
      connectable: false,
      placeboForbidden: true,
      notes: [
        'Dedicated Agones fleet not live for product — do not show simulated-dedicated.aethel.local as a server IP',
        'Product copy must read P2P / LAN only + [HELD] dedicated',
      ],
      heldReason: input.forceDedicatedHeld
        ? 'forceDedicatedHeld'
        : !agonesConfigured
          ? 'agones_allocator_unconfigured'
          : 'allocation_simulated',
    }
  } else {
    dedicated = {
      mode: 'dedicated-agones',
      status: 'live',
      capabilityStatus: 'IMPLEMENTED',
      connectable: true,
      placeboForbidden: true,
      notes: ['Live Agones allocator configured — dedicated path connectable'],
    }
  }

  const rollback: MultiplayerModeReport = rollbackProven
    ? {
        mode: 'rollback-competitive',
        status: 'live',
        capabilityStatus: 'IMPLEMENTED',
        connectable: true,
        placeboForbidden: true,
        notes: ['Deterministic replay proven — competitive rollback marketing allowed'],
      }
    : {
        mode: 'rollback-competitive',
        status: 'held',
        capabilityStatus: 'PARTIAL',
        connectable: false,
        placeboForbidden: true,
        notes: [
          'Ring-buffer rollback code exists; competitive claim held until Rapier bit-identical replay + G.2',
        ],
        heldReason: 'rollback_not_proven',
      }

  const marketingDedicatedAllowed = dedicated.status === 'live' && dedicated.connectable
  const marketingCrossPlayAllowed = crossPlayUnlocked && marketingDedicatedAllowed

  const claim = marketingDedicatedAllowed
    ? 'Dedicated Agones path live'
    : 'Multiplayer = P2P / LAN — dedicated Agones [HELD]'

  const productCopy = marketingDedicatedAllowed
    ? 'Server-authoritative dedicated matches available in configured regions.'
    : 'Co-op multiplayer: P2P / LAN. Dedicated servers: [HELD] until Agones fleet ships. Cross-play marketing blocked until G.2.'

  log.info('multiplayer_honesty_evaluated', {
    p2p: p2pLan.status,
    dedicated: dedicated.status,
    rollback: rollback.status,
    marketingDedicatedAllowed,
    marketingCrossPlayAllowed,
  })

  return {
    generatedAt: new Date().toISOString(),
    p2pLan,
    dedicated,
    rollback,
    marketingDedicatedAllowed,
    marketingCrossPlayAllowed,
    claim,
    productCopy,
  }
}

/**
 * Strip or redact a simulated allocation URL so clients never treat it as connectable.
 */
export function redactSimulatedDedicatedUrl(serverUrl: string | undefined, simulated: boolean): string | undefined {
  if (!serverUrl) return undefined
  if (!simulated) return serverUrl
  if (serverUrl.includes('simulated-dedicated') || serverUrl.includes('aethel.local')) {
    return undefined
  }
  return undefined
}
