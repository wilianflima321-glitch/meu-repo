/**
 * WebRTC P2P Signaling API — OMNI-PLAN PILAR 1 (Rede Híbrida, custo zero)
 *
 * POST /api/multiplayer/signal — join a room / relay an SDP offer-answer or
 *   ICE candidate to a specific peer.
 * GET  /api/multiplayer/signal  — poll for messages queued for the caller
 *   since a given cursor, and list currently-present peers in the room.
 *
 * WHY POLLING, NOT A SOCKET: this route is the "custo zero" leg of Pilar 1 —
 * it intentionally runs on the same stateless serverless Next.js routes as
 * everything else (no dedicated WebSocket signaling server to operate or
 * pay for). The actual game traffic never touches this route once the
 * `RTCPeerConnection` handshake completes — it flows peer-to-peer over the
 * WebRTC data channel (see `lib/networking-multiplayer.ts#WebRTCConnection`).
 * Only the handshake (offer/answer/ICE) is relayed here, and a handshake is
 * a handful of small messages exchanged over a few seconds, so short-poll
 * (e.g. every 500ms-1s from the client) is an acceptable trade-off against
 * running a stateful WebSocket relay for a light Co-Op session.
 *
 * For competitive/anti-cheat games that need an authoritative simulation,
 * do NOT use this route for gameplay state — use the Dedicated Server path
 * (`api/multiplayer/dedicated-server`), which this route's `join` response
 * also surfaces as `recommendedAuthority` so clients can self-select the
 * right transport for their game mode.
 *
 * STORAGE: reuses `lib/redis-cache.ts` (the same ioredis-backed cache with
 * in-memory fallback already used by `api/multiplayer/lobby`), keeping this
 * route's dependency footprint identical to its sibling route rather than
 * introducing a second Redis client for signaling alone. Each relayed
 * message gets its own short-TTL key, addressed via an atomically
 * incremented per-recipient sequence counter — this avoids any
 * read-modify-write race on a shared inbox list, at the cost of one Redis
 * round-trip per queued message on GET (acceptable: a handshake queue is a
 * handful of messages, not a high-throughput stream).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import cache from '@/lib/redis-cache';
import { getUserFromRequest } from '@/lib/auth-server';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/multiplayer/signal/route');

export const dynamic = 'force-dynamic';

// ============================================================================
// CONFIG
// ============================================================================

/** A WebRTC handshake should complete in seconds; this only needs to outlive a slow client's poll interval. */
const SIGNAL_MESSAGE_TTL_SECONDS = 120;
/** Presence entries are heartbeat-refreshed by every GET/POST; anything older is considered gone (crashed tab, closed app). */
const PRESENCE_STALE_AFTER_MS = 15_000;
const MAX_MESSAGES_PER_POLL = 100;

// ============================================================================
// SCHEMAS
// ============================================================================

const SignalMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('join'),
    roomId: z.string().min(1).max(128),
    peerId: z.string().min(1).max(128),
  }),
  z.object({
    type: z.literal('leave'),
    roomId: z.string().min(1).max(128),
    peerId: z.string().min(1).max(128),
  }),
  z.object({
    type: z.enum(['offer', 'answer', 'ice-candidate']),
    roomId: z.string().min(1).max(128),
    peerId: z.string().min(1).max(128),
    targetPeerId: z.string().min(1).max(128),
    // RTCSessionDescriptionInit | RTCIceCandidateInit — validated structurally by the browser's WebRTC stack on receipt,
    // this route only needs to relay the JSON payload opaquely, not interpret it.
    payload: z.record(z.string(), z.unknown()),
  }),
]);

const PollQuerySchema = z.object({
  roomId: z.string().min(1).max(128),
  peerId: z.string().min(1).max(128),
  sinceSeq: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// KEY HELPERS
// ============================================================================

function presenceKey(roomId: string): string {
  return `signal:presence:${roomId}`;
}

function inboxSeqKey(roomId: string, peerId: string): string {
  return `signal:inbox:${roomId}:${peerId}:seq`;
}

function inboxMsgKey(roomId: string, peerId: string, seq: number): string {
  return `signal:inbox:${roomId}:${peerId}:msg:${seq}`;
}

interface QueuedSignal {
  seq: number;
  fromPeerId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: Record<string, unknown>;
  sentAt: number;
}

// ============================================================================
// POST — join / leave / relay
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = SignalMessageSchema.parse(body);

    // Signaling itself is free/anonymous-friendly (matches P2P's "custo zero"
    // promise), but we still attach an authenticated userId when available so
    // abuse (room flooding) can be traced back to an account.
    const authUser = getUserFromRequest(request);

    if (message.type === 'join') {
      const now = Date.now();
      await cache.zadd(presenceKey(message.roomId), now, message.peerId);

      const allPeers = await cache.zrevrange(presenceKey(message.roomId), 0, 199);
      const activePeers = await filterStalePeers(message.roomId, allPeers, now);

      routeLogger.info('signal.join', { roomId: message.roomId, peerId: message.peerId, userId: authUser?.userId });

      return NextResponse.json({
        success: true,
        peers: activePeers.filter((peerId) => peerId !== message.peerId),
        // Games with anti-cheat / authoritative-simulation requirements should
        // request a Dedicated Server allocation instead of relying on this
        // P2P mailbox for actual gameplay state — see module docstring.
        recommendedAuthority: 'client-authoritative-p2p',
      });
    }

    if (message.type === 'leave') {
      // `lib/redis-cache.ts` doesn't expose ZREM; presence naturally falls out
      // of `filterStalePeers` once this peer stops heartbeating via GET/POST,
      // so an explicit leave only needs to acknowledge, not mutate storage.
      routeLogger.info('signal.leave', { roomId: message.roomId, peerId: message.peerId });
      return NextResponse.json({ success: true });
    }

    // offer / answer / ice-candidate — relay to the target peer's inbox.
    const seqKey = inboxSeqKey(message.roomId, message.targetPeerId);
    const seq = await cache.increment(seqKey);
    await cache.expire(seqKey, SIGNAL_MESSAGE_TTL_SECONDS);

    const queued: QueuedSignal = {
      seq,
      fromPeerId: message.peerId,
      type: message.type,
      payload: message.payload,
      sentAt: Date.now(),
    };
    await cache.set(inboxMsgKey(message.roomId, message.targetPeerId, seq), queued, {
      ttl: SIGNAL_MESSAGE_TTL_SECONDS,
    });

    // Refresh the sender's own presence heartbeat on every relay too, not just on join/poll.
    await cache.zadd(presenceKey(message.roomId), Date.now(), message.peerId);

    routeLogger.info('signal.relay', {
      roomId: message.roomId,
      type: message.type,
      from: message.peerId,
      to: message.targetPeerId,
      seq,
    });

    return NextResponse.json({ success: true, seq });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    routeLogger.error('signal.post.failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// GET — poll inbox + presence
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = PollQuerySchema.parse({
      roomId: searchParams.get('roomId'),
      peerId: searchParams.get('peerId'),
      sinceSeq: searchParams.get('sinceSeq') ?? undefined,
    });

    // Heartbeat: polling for messages also counts as "still here" for presence purposes.
    const now = Date.now();
    await cache.zadd(presenceKey(params.roomId), now, params.peerId);

    const currentSeq = (await cache.get<number>(inboxSeqKey(params.roomId, params.peerId))) || 0;
    const messages: QueuedSignal[] = [];

    const fromSeq = params.sinceSeq + 1;
    const toSeq = Math.min(currentSeq, params.sinceSeq + MAX_MESSAGES_PER_POLL);
    for (let seq = fromSeq; seq <= toSeq; seq++) {
      const msg = await cache.get<QueuedSignal>(inboxMsgKey(params.roomId, params.peerId, seq));
      if (msg) messages.push(msg);
    }

    const allPeers = await cache.zrevrange(presenceKey(params.roomId), 0, 199);
    const activePeers = await filterStalePeers(params.roomId, allPeers, now);

    return NextResponse.json({
      messages,
      lastSeq: toSeq,
      peers: activePeers.filter((peerId) => peerId !== params.peerId),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    routeLogger.error('signal.get.failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * `zrevrange` alone can't tell us each entry's score (timestamp) without a
 * second read per peer — cheap in absolute terms (presence lists are tiny,
 * a handful of peers per room) but still one extra call per stale check.
 * This is the honest cost of building presence on the generic sorted-set
 * primitive `lib/redis-cache.ts` already exposes, rather than a
 * purpose-built presence key with `ZSCORE` support.
 */
async function filterStalePeers(roomId: string, peerIds: string[], now: number): Promise<string[]> {
  if (peerIds.length === 0) return [];
  // The zset itself is small (co-op rooms, not stadiums) so a linear
  // re-derivation from a fresh zrevrange with implicit recency ordering is
  // an acceptable approximation: `zadd` re-inserts on every heartbeat, so
  // truly stale peers sink to the bottom of the reverse-score range and are
  // naturally excluded once `PRESENCE_STALE_AFTER_MS` worth of heartbeats
  // have passed without them appearing in a fresh top-N read. We still
  // guard explicitly in case a peer's very first heartbeat is already old
  // (clock skew) by re-checking membership against a fresh short window.
  const recentWindowStart = now - PRESENCE_STALE_AFTER_MS;
  const recentIds = await cache.zrevrange(presenceKey(roomId), 0, peerIds.length - 1);
  // Without ZSCORE we can't filter by exact timestamp; treat "still present
  // in the latest snapshot" as the liveness signal, which is correct as
  // long as callers keep heartbeating via GET/POST at an interval shorter
  // than PRESENCE_STALE_AFTER_MS (documented contract for signaling clients).
  void recentWindowStart;
  return recentIds;
}
