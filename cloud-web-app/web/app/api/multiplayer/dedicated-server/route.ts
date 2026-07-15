/**
 * Dedicated Server Connection API — OMNI-PLAN PILAR 1 (Servidor Dedicado
 * Autorizado) / PILAR 5 (A Trava Financeira).
 *
 * POST   /api/multiplayer/dedicated-server — request an authoritative
 *   allocation for `gameId` (used directly by lobbies promoting to
 *   server-authoritative play, and internally by `api/matchmaking` when a
 *   ticket's `authorityMode` is `dedicated`).
 * DELETE /api/multiplayer/dedicated-server — release a previously recorded
 *   connection slot (call when a player disconnects from the dedicated
 *   server, so the concurrent-connection counter the free-tier cap reads
 *   from — `lib/redis-cost-guard.ts` — doesn't leak upward forever).
 *
 * Every POST here passes through `multiplayerCostGuard` via
 * `requestDedicatedServerAllocation` before anything resembling an Agones
 * call happens — see that module's docstring for the honest scope of what
 * "calling Agones" currently means in an environment without a live fleet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-server';
import { requestDedicatedServerAllocation } from '@/lib/multiplayer/dedicated-server-authority';
import { multiplayerCostGuard } from '@/lib/redis-cost-guard';
import { evaluateMultiplayerHonesty } from '@/lib/production/multiplayer-honesty-capability';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/multiplayer/dedicated-server/route');
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  gameId: z.string().min(1),
  region: z.string().min(1).default('us-east'),
  matchId: z.string().optional(),
});

const ReleaseSchema = z.object({
  gameId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = RequestSchema.parse(body);

    const game = await prisma.project.findUnique({ where: { id: data.gameId }, select: { id: true, userId: true } });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const allocation = await requestDedicatedServerAllocation({
      gameId: data.gameId,
      developerId: game.userId,
      region: data.region,
      matchId: data.matchId || nanoid(),
    });

    if (!allocation.allowed) {
      routeLogger.info('dedicated_server.request.refused', { gameId: data.gameId, reason: allocation.reason });
      return NextResponse.json(
        { error: 'DEDICATED_SERVER_UNAVAILABLE', message: allocation.reason, costGuard: allocation.costGuard },
        { status: 402 }
      );
    }

    // Block 2B.3 — simulated allocations are not connectable; do not record a live slot
    // or return a fake wss:// URL that clients might dial.
    if (allocation.simulated || !allocation.connectable) {
      const honesty = evaluateMultiplayerHonesty({
        lastAllocationSimulated: true,
        agonesAllocatorConfigured: Boolean(process.env.AGONES_ALLOCATOR_URL?.trim()),
      });
      routeLogger.info('dedicated_server.request.held', {
        gameId: data.gameId,
        simulatedLabel: allocation.simulatedLabel,
      });
      return NextResponse.json({
        allowed: false,
        held: true,
        simulated: true,
        connectable: false,
        error: 'DEDICATED_SERVER_HELD',
        message: honesty.productCopy,
        simulatedLabel: allocation.simulatedLabel,
        gameServerName: allocation.gameServerName,
        costGuard: allocation.costGuard,
        withinBurstAllowance: allocation.withinBurstAllowance,
        honesty,
        fallback: { authorityMode: 'p2p', hint: 'Use /api/matchmaking with authorityMode=p2p or signal room' },
      }, { status: 503 });
    }

    // Record the slot immediately — this is what the *next* caller's
    // `checkDedicatedServerConnection` will see, closing the "11th player"
    // race the free-tier cap exists to prevent.
    await multiplayerCostGuard.recordConnect(data.gameId);

    return NextResponse.json({
      allowed: true,
      simulated: false,
      connectable: true,
      held: false,
      serverUrl: allocation.serverUrl,
      publicAddress: allocation.publicAddress,
      gameServerName: allocation.gameServerName,
      costGuard: allocation.costGuard,
      withinBurstAllowance: allocation.withinBurstAllowance,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    routeLogger.error('dedicated_server.post.failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const data = ReleaseSchema.parse({ gameId: body.gameId || searchParams.get('gameId') });

    const remaining = await multiplayerCostGuard.recordDisconnect(data.gameId);
    return NextResponse.json({ success: true, concurrentUsers: Math.max(0, remaining) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    routeLogger.error('dedicated_server.delete.failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
