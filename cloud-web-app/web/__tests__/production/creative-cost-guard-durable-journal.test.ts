/**
 * Trava I hardening — durable reservation journal.
 *
 * A reservation holds real money between reserve and settle. Without a
 * durable journal, a process restart loses the hold forever. These tests
 * prove: reserve → journal flush → in-memory reset (simulated restart) →
 * recovery replays the hold; terminal events (settle/settle_zero/cancel)
 * replay as terminal; malformed lines are counted and never trusted; and
 * the memory-only path reports honestly instead of claiming durability.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, readFile, appendFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import {
  CREATIVE_COST_GUARD_JOURNAL_ENV,
  __resetCreativeCostGuardForTests,
  cancelCreativeCost,
  createMemoryCostGuardLedger,
  flushCostGuardJournal,
  getCostGuardDurabilityStatus,
  getCreativeCostReservation,
  recoverCostGuardReservationsFromJournal,
  reserveCreativeCost,
  settleCreativeCost,
  settleCreativeCostZero,
} from '@/lib/production/creative-cost-guard';

let journalDir: string;
let journalPath: string;
let adapter: ReturnType<typeof createMemoryCostGuardLedger>;

beforeEach(async () => {
  __resetCreativeCostGuardForTests();
  adapter = createMemoryCostGuardLedger();
  journalDir = await mkdtemp(path.join(tmpdir(), 'aethel-cost-guard-'));
  journalPath = path.join(journalDir, 'journal.jsonl');
  delete globalThis.process.env[CREATIVE_COST_GUARD_JOURNAL_ENV];
});

afterEach(async () => {
  delete globalThis.process.env[CREATIVE_COST_GUARD_JOURNAL_ENV];
  __resetCreativeCostGuardForTests();
  await rm(journalDir, { recursive: true, force: true });
});

describe('creative-cost-guard durable journal', () => {
  it('reserves survive a simulated restart and replay as active holds', async () => {
    globalThis.process.env[CREATIVE_COST_GUARD_JOURNAL_ENV] = journalPath;
    const r = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'mesh',
        estimatedTokenWeight: 12.5,
        byokProfileId: 'byok-1',
      },
      adapter,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await flushCostGuardJournal();

    // Simulated restart: memory wiped, journal intact.
    __resetCreativeCostGuardForTests();
    const recovered = await recoverCostGuardReservationsFromJournal();
    expect(recovered.replayed).toBe(1);
    expect(recovered.recoveredReservations).toBe(1);
    expect(recovered.malformedLines).toBe(0);
    const res = getCreativeCostReservation(r.reservation.reservationId);
    expect(res?.status).toBe('reserved');
    expect(res?.estimatedTokenWeight).toBe(12.5);
    expect(res?.funding).toBe('byok');
  });

  it('settle replays as terminal — no double settle after recovery', async () => {
    globalThis.process.env[CREATIVE_COST_GUARD_JOURNAL_ENV] = journalPath;
    const r = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'world-layout',
        estimatedTokenWeight: 30,
        byokProfileId: 'byok-1',
      },
      adapter,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await settleCreativeCost(r.reservation.reservationId, 25, adapter);
    await flushCostGuardJournal();

    __resetCreativeCostGuardForTests();
    await recoverCostGuardReservationsFromJournal();
    const res = getCreativeCostReservation(r.reservation.reservationId);
    expect(res?.status).toBe('settled');
    // Settling an already-terminal reservation is a no-op skip.
    const again = await settleCreativeCost(r.reservation.reservationId, 999, adapter);
    expect(again).toEqual({ capped: false, rawActual: 0, cappedActual: 0 });
  });

  it('settle_zero and cancel replay as terminal events', async () => {
    globalThis.process.env[CREATIVE_COST_GUARD_JOURNAL_ENV] = journalPath;
    const a = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'mesh', estimatedTokenWeight: 5, byokProfileId: 'byok-1' },
      adapter,
    );
    const b = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'mesh', estimatedTokenWeight: 5, byokProfileId: 'byok-1' },
      adapter,
    );
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    await settleCreativeCostZero(a.reservation.reservationId, adapter);
    await cancelCreativeCost(b.reservation.reservationId, adapter);
    await flushCostGuardJournal();

    __resetCreativeCostGuardForTests();
    const recovered = await recoverCostGuardReservationsFromJournal();
    expect(recovered.recoveredReservations).toBe(0);
    expect(getCreativeCostReservation(a.reservation.reservationId)?.status).toBe('settle_zero');
    expect(getCreativeCostReservation(b.reservation.reservationId)?.status).toBe('cancelled');
  });

  it('malformed lines are counted and never trusted; valid rows still recover', async () => {
    globalThis.process.env[CREATIVE_COST_GUARD_JOURNAL_ENV] = journalPath;
    await appendFile(journalPath, 'NOT-JSON-GARBAGE\n', 'utf8');
    await appendFile(journalPath, '{"event":"reserved"}\n', 'utf8');
    const r = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'mesh', estimatedTokenWeight: 7, byokProfileId: 'byok-1' },
      adapter,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await flushCostGuardJournal();

    __resetCreativeCostGuardForTests();
    const recovered = await recoverCostGuardReservationsFromJournal();
    expect(recovered.malformedLines).toBe(2);
    expect(recovered.incomplete).toBe(true);
    expect(recovered.recoveredReservations).toBe(1);
    expect(getCreativeCostReservation(r.reservation.reservationId)?.status).toBe('reserved');
  });

  it('recovered pool-funded holds fail closed to cancelled without adapter hold confirmation', async () => {
    process.env[CREATIVE_COST_GUARD_JOURNAL_ENV] = journalPath;
    adapter.grant('u1', 50);
    const r = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'mesh', estimatedTokenWeight: 8, planId: 'pro' },
      adapter,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reservation.funding).toBe('usage_bucket');
    await flushCostGuardJournal();

    __resetCreativeCostGuardForTests();
    // Memory adapter cannot confirm the debit survived the restart → the hold
    // must fail closed to cancelled, never refund an unbacked balance.
    const recovered = await recoverCostGuardReservationsFromJournal(adapter);
    expect(recovered.recoveredReservations).toBe(0);
    expect(recovered.unconfirmedPoolHoldsCancelled).toBe(1);
    expect(getCreativeCostReservation(r.reservation.reservationId)?.status).toBe('cancelled');
  });

  it('recovered pool-funded holds survive when the adapter confirms the hold persisted', async () => {
    process.env[CREATIVE_COST_GUARD_JOURNAL_ENV] = journalPath;
    const confirmed = new Set<string>();
    const durableAdapter = {
      hasByok: async () => false,
      reservePool: async () => ({ ok: true as const, funding: 'usage_bucket' as const, reservationId: undefined }),
      settlePool: async () => {},
      cancelPool: async () => {},
      hasHold: async (reservationId: string) => confirmed.has(reservationId),
    };
    const r = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'mesh', estimatedTokenWeight: 8, planId: 'pro' },
      durableAdapter,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    confirmed.add(r.reservation.reservationId);
    await flushCostGuardJournal();

    __resetCreativeCostGuardForTests();
    const recovered = await recoverCostGuardReservationsFromJournal(durableAdapter);
    expect(recovered.recoveredReservations).toBe(1);
    expect(recovered.unconfirmedPoolHoldsCancelled).toBe(0);
    expect(getCreativeCostReservation(r.reservation.reservationId)?.status).toBe('reserved');
  });

  it('durability status reports write health and redacts the journal path', async () => {
    process.env[CREATIVE_COST_GUARD_JOURNAL_ENV] = journalPath;
    const status = getCostGuardDurabilityStatus();
    expect(status.durable).toBe(true);
    expect(status.journalPath).toBe('journal.jsonl');
    expect(status.reason).toBe('journal-configured');
  });

  it('without a journal path, durability is honestly memory-only', async () => {
    const status = getCostGuardDurabilityStatus();
    expect(status.durable).toBe(false);
    expect(status.reason).toBe('memory-only');
    expect(status.journalPath).toBeNull();
    const recovered = await recoverCostGuardReservationsFromJournal();
    expect(recovered.replayed).toBe(0);
  });

  it('concurrent reserves all survive recovery (serialized journal writes)', async () => {
    globalThis.process.env[CREATIVE_COST_GUARD_JOURNAL_ENV] = journalPath;
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        reserveCreativeCost(
          {
            userId: `u${i}`,
            projectId: 'p1',
            domain: 'mesh',
            estimatedTokenWeight: 1 + i,
            byokProfileId: 'byok-1',
          },
          adapter,
        ),
      ),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    await flushCostGuardJournal();

    __resetCreativeCostGuardForTests();
    const recovered = await recoverCostGuardReservationsFromJournal();
    expect(recovered.replayed).toBe(8);
    expect(recovered.recoveredReservations).toBe(8);
    const raw = await readFile(journalPath, 'utf8');
    expect(raw.trim().split('\n').length).toBe(8);
  });
});
