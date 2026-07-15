/**
 * Matchmaking API — OMNI-PLAN PILAR 2 (Matchmaking e Justiça).
 *
 * POST   /api/matchmaking — enqueue a ticket (create + immediate match attempt)
 * GET    /api/matchmaking?ticketId=... — poll ticket status (re-attempts matching)
 * DELETE /api/matchmaking?ticketId=... — cancel search
 *
 * ALGORITHM: crosses Skill (MMR) against Ping, per the brief. A ticket's
 * acceptable MMR window starts tight (`INITIAL_SKILL_DELTA`) and widens the
 * longer it waits (`SKILL_DELTA_GROWTH_PER_SECOND`) — the standard
 * time-widening matchmaking curve — while ping compatibility
 * (`MAX_PING_DELTA_MS`) stays fixed, because a fair MMR match on a
 * high-latency link is still a bad match. Candidates are ranked by a
 * combined fairness score (normalized skill distance + normalized ping
 * distance) so the *closest* compatible opponent is picked, not just the
 * first one found.
 *
 * HONEST SCOPE: this is a serverless Next.js route, not a persistent
 * matchmaking daemon (OpenMatch-style). There is no background process
 * continuously scanning the queue — matching passes run opportunistically
 * on ticket creation (POST) and on every client poll (GET), which is
 * correct as long as clients poll at a reasonable interval (documented
 * contract: every 1-2s) while `status === 'searching'`. A ticket that stops
 * being polled (crashed client) will not be matched until it expires
 * (`TICKET_TTL_SECONDS`) and is swept from the queue by Redis TTL.
 *
 * STORAGE: real `@upstash/redis` sorted-set commands (ZADD/ZRANGE
 * byScore/ZREM), per the Director's explicit instruction — `lib/redis-cache.ts`'s
 * wrapper doesn't expose ZRANGE-by-score or ZREM, which this algorithm
 * needs. Falls back to an in-memory queue (module-scope, per-instance) when
 * Upstash isn't configured, matching every other guard in this codebase's
 * "degrade, don't crash" policy for local dev / self-hosted-without-Redis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-server';
import { getUpstashRedisClient } from '@/lib/server/upstash-rate-limit';
import { requestDedicatedServerAllocation } from '@/lib/multiplayer/dedicated-server-authority';
import { multiplayerCostGuard } from '@/lib/redis-cost-guard';
import {
  evaluateMultiplayerHonesty,
  redactSimulatedDedicatedUrl,
} from '@/lib/production/multiplayer-honesty-capability';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/matchmaking/route');
export const dynamic = 'force-dynamic';

// ============================================================================
// CONFIG
// ============================================================================

const TICKET_TTL_SECONDS = 5 * 60;
const INITIAL_SKILL_DELTA = 100;
const SKILL_DELTA_GROWTH_PER_SECOND = 25;
const MAX_SKILL_DELTA = 3000;
const MAX_PING_DELTA_MS = 120;

// ============================================================================
// SCHEMAS / TYPES
// ============================================================================

const CreateTicketSchema = z.object({
  gameId: z.string().min(1),
  region: z.string().min(1).default('auto'),
  skillRating: z.number().min(0).max(10_000).default(1000),
  pingMs: z.number().min(0).max(2000).default(50),
  authorityMode: z.enum(['p2p', 'dedicated']).default('p2p'),
  partySize: z.number().int().min(2).max(64).default(2),
});

interface MatchmakingTicket {
  ticketId: string;
  userId: string;
  gameId: string;
  developerId: string;
  region: string;
  skillRating: number;
  pingMs: number;
  authorityMode: 'p2p' | 'dedicated';
  /** Effective play mode after honesty downgrade (2B.3). */
  effectiveAuthorityMode?: 'p2p' | 'dedicated';
  partySize: number;
  createdAt: number;
  status: 'searching' | 'matched' | 'cancelled' | 'expired';
  matchId?: string;
  roomId?: string;
  serverUrl?: string;
  /** True when dedicated was requested but Agones is HELD — play via P2P room. */
  dedicatedHeld?: boolean;
  matchedWith?: string[];
}

// ============================================================================
// STORAGE BACKEND (real Upstash sorted sets, in-memory fallback)
// ============================================================================

function queueKey(gameId: string, region: string, authorityMode: string): string {
  return `mm:queue:${gameId}:${region}:${authorityMode}`;
}
function ticketKey(ticketId: string): string {
  return `mm:ticket:${ticketId}`;
}

const memoryQueues = new Map<string, Map<string, number>>(); // queueKey -> ticketId -> score
const memoryTickets = new Map<string, MatchmakingTicket>();

async function enqueueTicket(ticket: MatchmakingTicket): Promise<void> {
  const redis = getUpstashRedisClient();
  const key = queueKey(ticket.gameId, ticket.region, ticket.authorityMode);
  if (redis) {
    await redis.zadd(key, { score: ticket.skillRating, member: ticket.ticketId });
    await redis.set(ticketKey(ticket.ticketId), ticket, { ex: TICKET_TTL_SECONDS });
    return;
  }
  if (!memoryQueues.has(key)) memoryQueues.set(key, new Map());
  memoryQueues.get(key)!.set(ticket.ticketId, ticket.skillRating);
  memoryTickets.set(ticket.ticketId, ticket);
}

async function getTicket(ticketId: string): Promise<MatchmakingTicket | null> {
  const redis = getUpstashRedisClient();
  if (redis) {
    return (await redis.get<MatchmakingTicket>(ticketKey(ticketId))) ?? null;
  }
  return memoryTickets.get(ticketId) ?? null;
}

async function saveTicket(ticket: MatchmakingTicket): Promise<void> {
  const redis = getUpstashRedisClient();
  if (redis) {
    await redis.set(ticketKey(ticket.ticketId), ticket, { ex: TICKET_TTL_SECONDS });
    return;
  }
  memoryTickets.set(ticket.ticketId, ticket);
}

async function removeFromQueue(ticket: MatchmakingTicket): Promise<void> {
  const redis = getUpstashRedisClient();
  const key = queueKey(ticket.gameId, ticket.region, ticket.authorityMode);
  if (redis) {
    await redis.zrem(key, ticket.ticketId);
    return;
  }
  memoryQueues.get(key)?.delete(ticket.ticketId);
}

/** Candidates whose MMR falls within `[skillRating - delta, skillRating + delta]`, excluding the ticket itself. */
async function candidatesInSkillWindow(ticket: MatchmakingTicket, skillDelta: number): Promise<string[]> {
  const redis = getUpstashRedisClient();
  const key = queueKey(ticket.gameId, ticket.region, ticket.authorityMode);
  const min = ticket.skillRating - skillDelta;
  const max = ticket.skillRating + skillDelta;

  if (redis) {
    const members = await redis.zrange<string[]>(key, min, max, { byScore: true });
    return members.filter((id) => id !== ticket.ticketId);
  }

  const queue = memoryQueues.get(key);
  if (!queue) return [];
  return Array.from(queue.entries())
    .filter(([id, score]) => id !== ticket.ticketId && score >= min && score <= max)
    .map(([id]) => id);
}

// ============================================================================
// MATCHING ALGORITHM
// ============================================================================

function currentSkillDelta(ticket: MatchmakingTicket, now: number): number {
  const elapsedSeconds = (now - ticket.createdAt) / 1000;
  return Math.min(MAX_SKILL_DELTA, INITIAL_SKILL_DELTA + elapsedSeconds * SKILL_DELTA_GROWTH_PER_SECOND);
}

/** Lower is better: normalized skill distance + normalized ping distance, crossing MMR fairness against latency fairness as the brief requires. */
function fairnessScore(a: MatchmakingTicket, b: MatchmakingTicket, skillDelta: number): number {
  const skillDistance = Math.abs(a.skillRating - b.skillRating) / Math.max(1, skillDelta);
  const pingDistance = Math.abs(a.pingMs - b.pingMs) / MAX_PING_DELTA_MS;
  return skillDistance + pingDistance;
}

/**
 * Attempts to fill `ticket`'s party from the queue. Returns the full list of
 * matched tickets (including `ticket` itself) if a full party was formed,
 * otherwise `null` (still searching).
 */
async function attemptMatch(ticket: MatchmakingTicket, now: number): Promise<MatchmakingTicket[] | null> {
  const skillDelta = currentSkillDelta(ticket, now);
  const candidateIds = await candidatesInSkillWindow(ticket, skillDelta);
  if (candidateIds.length === 0) return null;

  const candidates: { ticket: MatchmakingTicket; score: number }[] = [];
  for (const candidateId of candidateIds) {
    const candidate = await getTicket(candidateId);
    if (!candidate || candidate.status !== 'searching') continue;
    if (Math.abs(candidate.pingMs - ticket.pingMs) > MAX_PING_DELTA_MS) continue;
    candidates.push({ ticket: candidate, score: fairnessScore(ticket, candidate, skillDelta) });
  }

  if (candidates.length < ticket.partySize - 1) return null;

  candidates.sort((a, b) => a.score - b.score);
  const party = [ticket, ...candidates.slice(0, ticket.partySize - 1).map((c) => c.ticket)];
  return party;
}

async function finalizeMatch(party: MatchmakingTicket[]): Promise<MatchmakingTicket[]> {
  const matchId = nanoid();
  const primary = party[0];

  let serverUrl: string | undefined;
  let roomId: string | undefined;
  let dedicatedHeld = false;
  let effectiveAuthorityMode: 'p2p' | 'dedicated' = primary.authorityMode;

  if (primary.authorityMode === 'dedicated') {
    const allocation = await requestDedicatedServerAllocation({
      gameId: primary.gameId,
      developerId: primary.developerId,
      region: primary.region,
      matchId,
    });
    if (!allocation.allowed) {
      // Cost guard / burst / fleet refused — do not consume the tickets from
      // the queue; leave them searching so the next poll can retry.
      routeLogger.warn('matchmaking.dedicated_allocation_refused', {
        gameId: primary.gameId,
        reason: allocation.reason,
        withinBurstAllowance: allocation.withinBurstAllowance,
      });
      return [];
    }

    if (allocation.simulated || !allocation.connectable) {
      // Block 2B.3 — never hand out simulated-dedicated URLs. Downgrade to P2P room.
      dedicatedHeld = true;
      effectiveAuthorityMode = 'p2p';
      roomId = matchId;
      serverUrl = undefined;
      routeLogger.info('matchmaking.dedicated_held_fallback_p2p', {
        matchId,
        gameId: primary.gameId,
        simulatedLabel: allocation.simulatedLabel,
      });
    } else {
      serverUrl = redactSimulatedDedicatedUrl(
        allocation.publicAddress ? `wss://${allocation.publicAddress}` : allocation.serverUrl,
        allocation.simulated
      );
      if (!serverUrl) {
        dedicatedHeld = true;
        effectiveAuthorityMode = 'p2p';
        roomId = matchId;
      }
    }
  } else {
    roomId = matchId; // Co-op P2P: the matchId doubles as the `api/multiplayer/signal` room to join.
  }

  const honesty = evaluateMultiplayerHonesty({
    lastAllocationSimulated: dedicatedHeld,
    agonesAllocatorConfigured: Boolean(process.env.AGONES_ALLOCATOR_URL?.trim()),
  });

  const updated: MatchmakingTicket[] = [];
  for (const member of party) {
    const finalized: MatchmakingTicket = {
      ...member,
      status: 'matched',
      matchId,
      roomId,
      serverUrl,
      dedicatedHeld,
      effectiveAuthorityMode,
      matchedWith: party.filter((p) => p.ticketId !== member.ticketId).map((p) => p.ticketId),
    };
    await Promise.all([removeFromQueue(member), saveTicket(finalized)]);
    updated.push(finalized);
  }

  routeLogger.info('matchmaking.match_found', {
    matchId,
    gameId: primary.gameId,
    authorityMode: primary.authorityMode,
    effectiveAuthorityMode,
    dedicatedHeld,
    marketingDedicatedAllowed: honesty.marketingDedicatedAllowed,
    partySize: party.length,
  });

  return updated;
}

// ============================================================================
// POST — create ticket + immediate match attempt
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = CreateTicketSchema.parse(body);

    const game = await prisma.project.findUnique({ where: { id: data.gameId }, select: { id: true, userId: true } });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // For dedicated-authority tickets, check concurrent + burst *before* queueing.
    if (data.authorityMode === 'dedicated') {
      const scale = await multiplayerCostGuard.checkDedicatedScaleAllowed(game.userId, data.gameId);
      if (!scale.allowed) {
        return NextResponse.json(
          {
            error: 'DEDICATED_SERVER_LIMIT_REACHED',
            message: scale.reason || scale.connection.reason,
            costGuard: scale.connection,
            machineHours: scale.machineHours,
          },
          { status: 402 }
        );
      }
    }

    const now = Date.now();
    const ticket: MatchmakingTicket = {
      ticketId: nanoid(),
      userId: authUser.userId,
      gameId: data.gameId,
      developerId: game.userId,
      region: data.region === 'auto' ? 'us-east' : data.region,
      skillRating: data.skillRating,
      pingMs: data.pingMs,
      authorityMode: data.authorityMode,
      partySize: data.partySize,
      createdAt: now,
      status: 'searching',
    };

    await enqueueTicket(ticket);

    const party = await attemptMatch(ticket, now);
    if (party && party.length === ticket.partySize) {
      const finalized = await finalizeMatch(party);
      const self = finalized.find((t) => t.ticketId === ticket.ticketId);
      if (self) {
        return NextResponse.json({ ticket: self });
      }
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    routeLogger.error('matchmaking.post.failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// GET — poll (and re-attempt matching)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 });
    }

    const ticket = await getTicket(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found or expired' }, { status: 404 });
    }

    if (ticket.status !== 'searching') {
      return NextResponse.json({ ticket });
    }

    const now = Date.now();
    if (now - ticket.createdAt > TICKET_TTL_SECONDS * 1000) {
      ticket.status = 'expired';
      await Promise.all([removeFromQueue(ticket), saveTicket(ticket)]);
      return NextResponse.json({ ticket });
    }

    const party = await attemptMatch(ticket, now);
    if (party && party.length === ticket.partySize) {
      const finalized = await finalizeMatch(party);
      const self = finalized.find((t) => t.ticketId === ticket.ticketId);
      if (self) {
        return NextResponse.json({ ticket: self });
      }
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    routeLogger.error('matchmaking.get.failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// DELETE — cancel search
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 });
    }

    const ticket = await getTicket(ticketId);
    if (!ticket) {
      return NextResponse.json({ success: true });
    }

    ticket.status = 'cancelled';
    await Promise.all([removeFromQueue(ticket), saveTicket(ticket)]);

    return NextResponse.json({ success: true });
  } catch (error) {
    routeLogger.error('matchmaking.delete.failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
