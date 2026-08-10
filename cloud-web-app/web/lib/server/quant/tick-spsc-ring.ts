/**
 * N6 — Market-tick SPSC ring (web mirror of kernel letter fe lockfree_ring_buffer).
 * Fixed-capacity single-producer / single-consumer; fail-closed when full/empty.
 * No overwrite, no dynamic alloc in push/pop hot path (pre-sized TypedArray slots).
 * Not crossbeam/MPSC AAA — investmentGrade stays false.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import type { NormalizedMarketTick } from '@/lib/server/quant/market-data-ingest'

const log = createComponentLogger('tick-spsc-ring')

export type TickRingRejectCode = 'ring_full' | 'ring_empty' | 'invalid_capacity' | 'invalid_tick'

export type TickRingResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: TickRingRejectCode; message: string }

export interface TickRingSlot {
  symbol: string
  price: number
  volume: number
  eventTimeMs: number
  source: NormalizedMarketTick['source']
  fixtureLabel: string
}

export interface MarketTickSpscRing {
  readonly capacity: number
  readonly usableCapacity: number
  tryPush(tick: NormalizedMarketTick): TickRingResult<{ len: number }>
  tryPop(): TickRingResult<TickRingSlot>
  len(): number
  isEmpty(): boolean
  isFull(): boolean
  drain(max: number): TickRingSlot[]
  fingerprint(): string
}

function nextPow2(n: number): number {
  let v = Math.max(2, Math.floor(n))
  v--
  v |= v >> 1
  v |= v >> 2
  v |= v >> 4
  v |= v >> 8
  v |= v >> 16
  return v + 1
}

function isFinitePositive(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

function packSlot(tick: NormalizedMarketTick): TickRingSlot | null {
  if (!tick.symbol?.trim()) return null
  if (!isFinitePositive(tick.price) || !isFinitePositive(tick.volume)) return null
  if (typeof tick.eventTimeMs !== 'number' || !Number.isFinite(tick.eventTimeMs)) return null
  if (tick.source === 'synthetic_fixture' && !tick.fixtureLabel?.trim()) return null
  return {
    symbol: tick.symbol.trim(),
    price: tick.price,
    volume: tick.volume,
    eventTimeMs: tick.eventTimeMs,
    source: tick.source,
    fixtureLabel: tick.fixtureLabel?.trim() ?? '',
  }
}

/**
 * Create a fixed-capacity SPSC tick ring.
 * One slot left unused so full = (tail - head) === usableCapacity.
 */
export function createMarketTickSpscRing(capacityHint = 64): TickRingResult<MarketTickSpscRing> {
  if (!Number.isFinite(capacityHint) || capacityHint < 2) {
    return {
      ok: false,
      code: 'invalid_capacity',
      message: 'tick SPSC capacity must be >= 2',
    }
  }

  const capacity = nextPow2(capacityHint)
  const usableCapacity = capacity - 1
  const slots: Array<TickRingSlot | null> = new Array(capacity).fill(null)
  let head = 0
  let tail = 0

  const len = (): number => (tail - head + capacity) % capacity
  const isEmpty = (): boolean => head === tail
  const isFull = (): boolean => len() === usableCapacity

  const ring: MarketTickSpscRing = {
    capacity,
    usableCapacity,
    tryPush(tick) {
      const slot = packSlot(tick)
      if (!slot) {
        return { ok: false, code: 'invalid_tick', message: 'tick failed validation' }
      }
      if (isFull()) {
        return { ok: false, code: 'ring_full', message: 'tick SPSC ring full — fail-closed, no overwrite' }
      }
      slots[tail] = slot
      tail = (tail + 1) % capacity
      return { ok: true, value: { len: len() } }
    },
    tryPop() {
      if (isEmpty()) {
        return { ok: false, code: 'ring_empty', message: 'tick SPSC ring empty' }
      }
      const slot = slots[head]
      slots[head] = null
      head = (head + 1) % capacity
      if (!slot) {
        return { ok: false, code: 'ring_empty', message: 'tick SPSC slot corrupted' }
      }
      return { ok: true, value: slot }
    },
    len,
    isEmpty,
    isFull,
    drain(max) {
      const out: TickRingSlot[] = []
      const limit = Math.max(0, Math.floor(max))
      while (out.length < limit) {
        const pop = ring.tryPop()
        if (!pop.ok) break
        out.push(pop.value)
      }
      return out
    },
    fingerprint() {
      return `n6-spsc:cap=${capacity}:use=${usableCapacity}:len=${len()}`
    },
  }

  log.info('tick_spsc_ring_created', { capacity, usableCapacity })
  return { ok: true, value: ring }
}

export function probeTickSpscRingReadiness(): {
  id: 'N6'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  path: string
  note: string
  investmentGrade: false
} {
  const created = createMarketTickSpscRing(8)
  if (!created.ok) {
    return {
      id: 'N6',
      status: 'NOT_IMPLEMENTED',
      ready: false,
      path: 'lib/server/quant/tick-spsc-ring.ts',
      note: 'Tick SPSC ring create failed.',
      investmentGrade: false,
    }
  }
  const ring = created.value
  const pushA = ring.tryPush({
    symbol: 'PROBE',
    price: 10,
    volume: 1,
    eventTimeMs: 1,
    source: 'synthetic_fixture',
    fixtureLabel: 'N6-probe',
  })
  const pushB = ring.tryPush({
    symbol: 'PROBE',
    price: 11,
    volume: 2,
    eventTimeMs: 2,
    source: 'synthetic_fixture',
    fixtureLabel: 'N6-probe',
  })
  const popA = ring.tryPop()
  const popB = ring.tryPop()
  const empty = ring.tryPop()
  const fifoOk =
    pushA.ok &&
    pushB.ok &&
    popA.ok &&
    popB.ok &&
    popA.value.price === 10 &&
    popB.value.price === 11 &&
    !empty.ok &&
    empty.code === 'ring_empty'

  // Fill to fail-closed full
  const fill = createMarketTickSpscRing(4)
  let fullReject = false
  if (fill.ok) {
    for (let i = 0; i < fill.value.usableCapacity; i++) {
      fill.value.tryPush({
        symbol: 'F',
        price: 1 + i,
        volume: 1,
        eventTimeMs: i,
        source: 'synthetic_fixture',
        fixtureLabel: 'N6-full',
      })
    }
    const over = fill.value.tryPush({
      symbol: 'F',
      price: 99,
      volume: 1,
      eventTimeMs: 99,
      source: 'synthetic_fixture',
      fixtureLabel: 'N6-full',
    })
    fullReject = !over.ok && over.code === 'ring_full'
  }

  const ready = fifoOk && fullReject
  return {
    id: 'N6',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    path: 'lib/server/quant/tick-spsc-ring.ts',
    note: ready
      ? 'SPSC tick ring FIFO + full/empty fail-closed (fe pattern mirror); not wired to licensed L2 SAB multiplex.'
      : 'Tick SPSC ring soak failed.',
    investmentGrade: false,
  }
}
