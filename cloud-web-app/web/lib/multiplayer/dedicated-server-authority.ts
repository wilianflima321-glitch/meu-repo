/**
 * Dedicated Server Authority — OMNI-PLAN PILAR 1 (Rede Híbrida) / PILAR 3
 * (A Frota) / PILAR 5 (A Trava Financeira) meeting point.
 *
 * `lib/networking-multiplayer.ts#WebRTCConnection` + `api/multiplayer/signal`
 * cover the "custo zero" P2P leg of Pilar 1 for light Co-Op games. This
 * module is the other leg: the *authority contract* a competitive/anti-cheat
 * game uses to request an authoritative, server-simulated match instead of
 * trusting any single client's physics.
 *
 * Every call into this module passes through `multiplayerCostGuard` FIRST —
 * this is the literal "Interceptar chamadas ao Agones verificando se a
 * Conta do desenvolvedor é Free ou Pro" requirement from Pilar 5. No caller
 * anywhere in this codebase should talk to Agones directly; they should go
 * through `requestDedicatedServerAllocation` so the financial guard can
 * never be bypassed.
 *
 * HONEST SCOPE: there is no live Agones cluster reachable from this
 * environment. When `AGONES_ALLOCATOR_URL` (+ mTLS client cert/key, per
 * Agones' allocator service contract) is configured, this calls the real
 * Allocation API over HTTPS. When it isn't configured (this environment,
 * local dev, any deployment that hasn't stood up Pilar 3's fleet yet), it
 * returns a `simulated: true` allocation so every caller (matchmaking route,
 * dashboards, tests) can be built and exercised against a stable contract
 * today, and will start receiving real GameServer allocations the moment
 * Pilar 3's infra is deployed and this env var is set — with zero code
 * changes required at the call sites.
 */

import { createComponentLogger } from '@/lib/observability/logger';
import { multiplayerCostGuard, type DedicatedServerConnectionVerdict } from '@/lib/redis-cost-guard';

const log = createComponentLogger('dedicated-server-authority');

export type NetworkAuthorityMode = 'client-authoritative-p2p' | 'server-authoritative-dedicated';

export interface DedicatedServerAllocationRequest {
  gameId: string;
  developerId: string;
  region: string;
  matchId: string;
  /** Agones multi-fleet setups route by GameServer `Fleet` name; defaults to a per-game fleet naming convention (see `packages/infra/k8s/agones/fleet.yaml`). */
  fleetName?: string;
}

export interface DedicatedServerAllocation {
  allowed: boolean;
  reason?: string;
  /** True when this allocation was synthesized locally because no live Agones allocator is configured — never present this to end users as a "server IP", it is not routable. */
  simulated: boolean;
  /**
   * Block 2B.3 — only true for live Agones allocations.
   * Simulated allocations must never be treated as connectable endpoints.
   */
  connectable: boolean;
  /** Opaque debug label for simulated fleet — never a wss:// connect string. */
  simulatedLabel?: string;
  serverUrl?: string;
  /** Anycast-fronted address players actually connect to — see Pilar 3's Cloudflare Spectrum config; only present for real (non-simulated) allocations. */
  publicAddress?: string;
  gameServerName?: string;
  costGuard: DedicatedServerConnectionVerdict;
  /** Machine-hour burst posture at allocation time (2B.4). */
  withinBurstAllowance?: boolean;
}

/**
 * Single choke point for handing out an authoritative game server. Always
 * checks `multiplayerCostGuard` first; only calls (or simulates) Agones if
 * the guard allows it.
 */
export async function requestDedicatedServerAllocation(
  request: DedicatedServerAllocationRequest
): Promise<DedicatedServerAllocation> {
  // 2B.4 — concurrent cap + machine-hour burst must both pass (no free-ride scale).
  const scale = await multiplayerCostGuard.checkDedicatedScaleAllowed(request.developerId, request.gameId);
  const costGuard = scale.connection;

  if (!costGuard.allowed) {
    log.warn('dedicated_server.allocation.blocked_by_cost_guard', {
      gameId: request.gameId,
      developerId: request.developerId,
      reason: costGuard.reason,
    });
    return {
      allowed: false,
      reason: costGuard.reason,
      simulated: true,
      connectable: false,
      costGuard,
      withinBurstAllowance: scale.machineHours.withinBurstAllowance,
    };
  }

  if (!scale.machineHours.withinBurstAllowance) {
    log.warn('dedicated_server.allocation.blocked_by_burst', {
      gameId: request.gameId,
      developerId: request.developerId,
      hoursUsed: scale.machineHours.hoursUsedThisMonth,
      quota: scale.machineHours.hourlyQuota,
    });
    return {
      allowed: false,
      reason:
        'Dedicated machine-hour quota exceeded and no revenue credit remains for burst. Upgrade plan or wait for next billing cycle.',
      simulated: true,
      connectable: false,
      costGuard,
      withinBurstAllowance: false,
    };
  }

  const allocatorUrl = process.env.AGONES_ALLOCATOR_URL;
  if (!allocatorUrl) {
    // Block 2B.3 — honest simulated contract: NO connectable wss:// URL.
    // Callers must fall back to P2P/LAN and show [HELD] dedicated badge.
    return {
      allowed: true,
      simulated: true,
      connectable: false,
      simulatedLabel: `held-dedicated/${request.region}/${request.matchId}`,
      gameServerName: `simulated-${request.matchId}`,
      costGuard,
      withinBurstAllowance: true,
    };
  }

  try {
    const fleetName = request.fleetName || `aethel-headless-${sanitizeFleetLabel(request.gameId)}`;
    const response = await fetch(`${allocatorUrl}/gameserverallocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namespace: process.env.AGONES_NAMESPACE || 'aethel-fleet',
        gameServerSelectors: [{ matchLabels: { 'agones.dev/fleet': fleetName } }],
        metadata: { annotations: { 'aethel.io/matchId': request.matchId, 'aethel.io/gameId': request.gameId } },
      }),
      // Agones' allocator service is normally reached over mTLS inside the
      // cluster (or via an authenticated gateway) — the client-cert wiring
      // is deployment-specific infra, intentionally not hardcoded here.
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Agones allocator responded ${response.status}`);
    }

    const allocation = (await response.json()) as {
      status?: { address?: string; ports?: { port: number }[]; gameServerName?: string };
    };
    const address = allocation.status?.address;
    const port = allocation.status?.ports?.[0]?.port;

    if (!address || !port) {
      throw new Error('Agones allocator response missing address/port');
    }

    return {
      allowed: true,
      simulated: false,
      connectable: true,
      serverUrl: `wss://${address}:${port}`,
      // Cloudflare Spectrum Anycast fronts the raw GameServer address so the
      // real pod IP is never exposed to players — see Pilar 3's DDoS config.
      publicAddress: process.env.CLOUDFLARE_SPECTRUM_ANYCAST_HOST || address,
      gameServerName: allocation.status?.gameServerName,
      costGuard,
      withinBurstAllowance: true,
    };
  } catch (error) {
    log.error('dedicated_server.allocation.agones_call_failed', error, { gameId: request.gameId });
    // Never fabricate a real-looking address on failure — surface as
    // disallowed so the matchmaker retries or falls back to P2P instead of
    // handing a player a dead connection string.
    return {
      allowed: false,
      reason: 'Dedicated server fleet is temporarily unavailable.',
      simulated: true,
      connectable: false,
      costGuard,
      withinBurstAllowance: scale.machineHours.withinBurstAllowance,
    };
  }
}

/** Reports actual consumed machine-seconds for a match once it ends, so the monthly quota (Pilar 5) reflects real usage. */
export async function reportDedicatedServerUsage(gameId: string, machineSeconds: number): Promise<void> {
  await multiplayerCostGuard.recordMachineHourUsage(gameId, machineSeconds);
}

function sanitizeFleetLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 48);
}
