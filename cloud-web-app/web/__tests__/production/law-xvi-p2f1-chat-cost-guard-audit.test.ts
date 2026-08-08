/**
 * P2f #1 — Law XVI Trava I audit: chat/complete billing vs CreativeCostGuard.
 *
 * Verdict (see AETHEL_FOCUS1_EXECUTION_PROGRESS.md P2f #1 for full writeup):
 *
 * MIXED. Two distinct findings:
 *
 * (a) chat/route.ts + chat-advanced (beginChatSpendSession -> spend-resolver
 *     reserveSpend/settleSpend) already implement a genuine two-phase
 *     reserve-before-provider-dispatch, fail-closed once subscription pool +
 *     wallet + PAYG are all exhausted. This is Trava I's guarantee under a
 *     different name/API, NOT a security hole — see "scenario (a)" below.
 *     The free tier is intentionally NOT zero-platform-pay for chat (unlike
 *     generative media): AI_QUOTA_PRESETS.free grants a bounded subsidized
 *     quota (200k fast tokens/mo) — a deliberate pricing decision
 *     (lib/plans.ts 'free' plan), distinct from Law XVI's "free tier +
 *     no BYOK => zero platform pay" policy for image/video/music/voice/3d
 *     (lib/production/creative-cost-guard.ts), which stays fully enforced
 *     for those domains (see "scenario (a) - creative domains" below).
 *
 * (b) complete/inline-edit/inline-completion/action/query routes used
 *     checkAIQuota() ALONE: a check-then-record read of TokenLedger, with
 *     nothing written to the ledger until AFTER the provider call resolves
 *     (recordTokenUsage is fire-and-forget post-hoc). Two concurrent requests
 *     for the same user both read the same "pending" snapshot and can BOTH
 *     pass, letting a free-tier user exceed their quota via fan-out — a real,
 *     narrower TOCTOU gap than "zero gate", but still a genuine hole in the
 *     fail-closed-before-provider-dispatch guarantee. Closed in this round by
 *     reserveAIQuota()/settleAIQuotaReservation()/cancelAIQuotaReservation()
 *     (lib/plan-limits.ts), which places a synchronous TokenLedger hold
 *     (lib/server/financial-ledger.ts holdEstimate/releaseHold) before
 *     checkAIQuota() runs, so a second concurrent call observes the first
 *     call's estimate as already-pending spend.
 *
 * Scope note: this round closes the TOCTOU race and documents the two-system
 * split. It does NOT unify chat/complete billing onto CreativeCostGuard's
 * pool primitives (byok/usage_bucket/wallet funding classes) or onto
 * spend-resolver's dual Fast/Premium pool math — that would be a larger
 * architectural unification, out of scope for a single P2f item (see
 * AETHEL_FOCUS1_EXECUTION_PROGRESS.md P2f #1 "future round" note).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
	prisma: {
		user: { findUnique: vi.fn() },
		usageBucket: { findMany: vi.fn(), findFirst: vi.fn() },
	},
}))

vi.mock('@/lib/db', () => prismaMocks)

import {
	__resetSpendResolverForTests,
	decideSpendLane,
} from '@/lib/ai/spend-resolver'
import { AI_QUOTA_PRESETS, buildAiQuotaPools } from '@/lib/plan-ai-quotas'
import {
	cancelAIQuotaReservation,
	checkAIQuota,
	reserveAIQuota,
	settleAIQuotaReservation,
} from '@/lib/plan-limits'
import { TokenLedger } from '@/lib/server/financial-ledger'

const FREE_PLAN_ID = 'free_test_p2f1'

function mockFreeUserFullyExhausted(overrides?: { tokensFastUsed?: number }) {
	const free = buildAiQuotaPools(AI_QUOTA_PRESETS.free)
	prismaMocks.prisma.user.findUnique.mockResolvedValue({ plan: FREE_PLAN_ID })
	prismaMocks.prisma.usageBucket.findMany.mockResolvedValue([
		{ window: 'month_fast', tokens: overrides?.tokensFastUsed ?? free.tokensFastPerMonth },
		{ window: 'month', tokens: overrides?.tokensFastUsed ?? free.tokensFastPerMonth },
		{ window: 'month_premium_raw', tokens: 0 },
	])
	prismaMocks.prisma.usageBucket.findFirst.mockResolvedValue({ requests: 0 })
	return free
}

describe('P2f #1 — scenario (a): chat spend-resolver already fail-closed (different name, same Trava I guarantee)', () => {
	beforeEach(() => {
		__resetSpendResolverForTests()
	})

	it('free tier, no BYOK, quota+wallet+PAYG all exhausted => blocked before provider dispatch', () => {
		const free = buildAiQuotaPools(AI_QUOTA_PRESETS.free)
		const decision = decideSpendLane({
			userId: 'p2f1-free-user',
			planId: 'free',
			planLimits: free,
			modelId: 'openai/gpt-4o-mini',
			estimatedRawTokens: 1_000,
			byok: false,
			allowWalletFallback: true,
			usage: {
				tokensFastUsed: free.tokensFastPerMonth,
				tokensPremiumRawUsed: 0,
				tokensWeightedUsed: free.tokensFastPerMonth,
				walletBalance: 0,
			},
			// no `payg` context => PAYG lane unavailable, matches an unconfigured account
		})

		expect(decision.ok).toBe(false)
		if (decision.ok) return
		expect(decision.code).toBe('QUOTA_EXCEEDED')
		expect(decision.lane).toBe('blocked')
	})

	it('BYOK always resolves to the byok lane regardless of plan quota (user pays their own provider — correct, not a bypass)', () => {
		const free = buildAiQuotaPools(AI_QUOTA_PRESETS.free)
		const decision = decideSpendLane({
			userId: 'p2f1-byok-user',
			planId: 'free',
			planLimits: free,
			modelId: 'openai/gpt-4o-mini',
			estimatedRawTokens: 1_000,
			byok: true,
			usage: {
				tokensFastUsed: free.tokensFastPerMonth,
				tokensPremiumRawUsed: 0,
				tokensWeightedUsed: free.tokensFastPerMonth,
				walletBalance: 0,
			},
		})
		expect(decision.ok).toBe(true)
		if (!decision.ok) return
		expect(decision.lane).toBe('byok')
	})
})

describe('P2f #1 — scenario (b): checkAIQuota TOCTOU race (real gap, now closed by reserveAIQuota)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('BEFORE fix (documents the bug): raw checkAIQuota alone lets two concurrent calls both pass even though combined estimate exceeds remaining quota', async () => {
		// Free plan, 1000 tokens remaining before hitting the fast quota.
		const free = mockFreeUserFullyExhausted({ tokensFastUsed: AI_QUOTA_PRESETS.free.tokensFastPerMonth - 1_000 })
		void free

		// Two "concurrent" requests each estimate 800 tokens (combined 1600 > 1000 remaining).
		const checkA = await checkAIQuota('p2f1-race-user', 800)
		const checkB = await checkAIQuota('p2f1-race-user', 800)

		// checkAIQuota has no memory of checkA's in-flight spend, so checkB also
		// reads "allowed" — this is the TOCTOU gap. Neither call, on its own,
		// commits usage (that only happens post-hoc via recordTokenUsage), so a
		// naive race across parallel HTTP requests would let both proceed and
		// jointly overspend by 2x the intended remaining budget.
		expect(checkA.allowed).toBe(true)
		expect(checkB.allowed).toBe(true)
	})

	it('AFTER fix: reserveAIQuota holds the first estimate synchronously, so a concurrent second reservation for the same user is denied', async () => {
		mockFreeUserFullyExhausted({ tokensFastUsed: AI_QUOTA_PRESETS.free.tokensFastPerMonth - 1_000 })

		const reservationA = await reserveAIQuota('p2f1-race-user-fixed', 800)
		expect(reservationA.allowed).toBe(true)
		if (!reservationA.allowed) return

		// Second concurrent reservation for the same user, before A settles —
		// must now be denied because A's hold is visible via TokenLedger.
		const reservationB = await reserveAIQuota('p2f1-race-user-fixed', 800)
		expect(reservationB.allowed).toBe(false)
		if (reservationB.allowed) return
		expect(reservationB.code).toBe('QUOTA_EXCEEDED')

		// Settling A releases its hold and commits real usage; the ledger no
		// longer double-counts the estimate afterward.
		await settleAIQuotaReservation(reservationA.reservation, 800)
		expect(TokenLedger.getPendingTokens('p2f1-race-user-fixed')).toBe(800)
	})

	it('AFTER fix: cancelling a reservation (provider failure) releases the hold with zero charge', async () => {
		mockFreeUserFullyExhausted({ tokensFastUsed: 0 })

		const reservation = await reserveAIQuota('p2f1-cancel-user', 500)
		expect(reservation.allowed).toBe(true)
		if (!reservation.allowed) return

		expect(TokenLedger.getPendingTokens('p2f1-cancel-user')).toBeGreaterThanOrEqual(500)
		cancelAIQuotaReservation(reservation.reservation)
		expect(TokenLedger.getPendingTokens('p2f1-cancel-user')).toBe(0)
	})
})
