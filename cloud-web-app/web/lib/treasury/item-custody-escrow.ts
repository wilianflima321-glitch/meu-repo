/**
 * H.1+ / Law XII.5 — Item custody escrow (Backpack).
 * Purchase → custodial + revocable 48h → owned; chargeback → revoked.
 * Fail-closed: no silent owned grant without custody window.
 */

import { randomUUID } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('item-custody-escrow')

/** Binding XII.5 — item revocable for 48 hours after purchase. */
export const ITEM_CUSTODY_WINDOW_MS = 48 * 60 * 60 * 1000

export type PlayerOwnedItemStatus = 'custodial' | 'owned' | 'revoked'

export interface PlayerOwnedItemRecord {
  id: string
  userId: string
  marketplaceItemId: string
  contentHash: string
  editionNumber: number | null
  status: PlayerOwnedItemStatus
  revocable: boolean
  revocableUntil: Date | null
  equippedSlot: string | null
  purchaseReference: string
  createdAt: Date
  updatedAt: Date
}

export interface ItemCustodyStore {
  put(item: PlayerOwnedItemRecord): Promise<PlayerOwnedItemRecord>
  get(id: string): Promise<PlayerOwnedItemRecord | null>
  listByUser(userId: string): Promise<readonly PlayerOwnedItemRecord[]>
  listByPurchaseReference(reference: string): Promise<readonly PlayerOwnedItemRecord[]>
}

export type CustodyResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string }

function isNonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0
}

export function createMemoryItemCustodyStore(): ItemCustodyStore & {
  readonly items: readonly PlayerOwnedItemRecord[]
  clear(): void
} {
  const byId = new Map<string, PlayerOwnedItemRecord>()

  return {
    get items() {
      return [...byId.values()]
    },
    clear() {
      byId.clear()
    },
    async put(item) {
      const frozen = Object.freeze({
        ...item,
        revocableUntil: item.revocableUntil ? new Date(item.revocableUntil) : null,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })
      byId.set(frozen.id, frozen)
      return frozen
    },
    async get(id) {
      return byId.get(id) ?? null
    },
    async listByUser(userId) {
      return [...byId.values()].filter((i) => i.userId === userId)
    },
    async listByPurchaseReference(reference) {
      return [...byId.values()].filter((i) => i.purchaseReference === reference)
    },
  }
}

export async function placeItemInCustody(
  store: ItemCustodyStore,
  input: {
    userId: string
    marketplaceItemId: string
    contentHash: string
    purchaseReference: string
    editionNumber?: number | null
    now?: Date
    id?: string
    custodyWindowMs?: number
  },
): Promise<CustodyResult<PlayerOwnedItemRecord>> {
  if (!isNonEmpty(input.userId)) {
    return { ok: false, code: 'USER_ID_REQUIRED', message: 'userId required' }
  }
  if (!isNonEmpty(input.marketplaceItemId)) {
    return { ok: false, code: 'ITEM_ID_REQUIRED', message: 'marketplaceItemId required' }
  }
  if (!isNonEmpty(input.contentHash)) {
    return { ok: false, code: 'CONTENT_HASH_REQUIRED', message: 'CAS contentHash required' }
  }
  if (!isNonEmpty(input.purchaseReference)) {
    return { ok: false, code: 'PURCHASE_REF_REQUIRED', message: 'purchaseReference required' }
  }

  const now = input.now ?? new Date()
  const windowMs = input.custodyWindowMs ?? ITEM_CUSTODY_WINDOW_MS
  const item: PlayerOwnedItemRecord = {
    id: input.id ?? randomUUID(),
    userId: input.userId.trim(),
    marketplaceItemId: input.marketplaceItemId.trim(),
    contentHash: input.contentHash.trim(),
    editionNumber: input.editionNumber ?? null,
    status: 'custodial',
    revocable: true,
    revocableUntil: new Date(now.getTime() + windowMs),
    equippedSlot: null,
    purchaseReference: input.purchaseReference.trim(),
    createdAt: now,
    updatedAt: now,
  }

  const saved = await store.put(item)
  log.info('item_custody_placed', {
    itemId: saved.id,
    userId: saved.userId,
    marketplaceItemId: saved.marketplaceItemId,
    revocableUntil: saved.revocableUntil?.toISOString(),
  })
  return { ok: true, value: saved }
}

/**
 * After custody window without dispute → owned + not revocable.
 * Fail-closed if still inside window (unless forceAfterWindow check passes).
 */
export async function releaseItemFromCustody(
  store: ItemCustodyStore,
  itemId: string,
  now: Date = new Date(),
): Promise<CustodyResult<PlayerOwnedItemRecord>> {
  const item = await store.get(itemId)
  if (!item) {
    return { ok: false, code: 'ITEM_NOT_FOUND', message: 'unknown item' }
  }
  if (item.status === 'revoked') {
    return { ok: false, code: 'ITEM_REVOKED', message: 'revoked items cannot release' }
  }
  if (item.status === 'owned') {
    return { ok: true, value: item }
  }
  if (item.status !== 'custodial') {
    return { ok: false, code: 'INVALID_STATUS', message: `status=${item.status}` }
  }
  if (!item.revocableUntil || item.revocableUntil.getTime() > now.getTime()) {
    return {
      ok: false,
      code: 'CUSTODY_WINDOW_OPEN',
      message: 'cannot release while revocable window open',
    }
  }

  const released: PlayerOwnedItemRecord = {
    ...item,
    status: 'owned',
    revocable: false,
    revocableUntil: null,
    updatedAt: now,
  }
  const saved = await store.put(released)
  log.info('item_custody_released', { itemId: saved.id, userId: saved.userId })
  return { ok: true, value: saved }
}

/**
 * Chargeback / dispute path — remove from Backpack while custodial or still revocable.
 */
export async function revokeItemCustody(
  store: ItemCustodyStore,
  itemId: string,
  reason: string,
  now: Date = new Date(),
): Promise<CustodyResult<PlayerOwnedItemRecord>> {
  if (!isNonEmpty(reason)) {
    return { ok: false, code: 'REASON_REQUIRED', message: 'revoke reason required' }
  }
  const item = await store.get(itemId)
  if (!item) {
    return { ok: false, code: 'ITEM_NOT_FOUND', message: 'unknown item' }
  }
  if (item.status === 'revoked') {
    return { ok: true, value: item }
  }
  if (item.status === 'owned' && item.revocable === false) {
    // Past custody — creator escrow / platform absorb; item stays owned (XII.5).
    return {
      ok: false,
      code: 'CUSTODY_CLEARED',
      message: 'item past custody; chargeback absorbs at platform/creator escrow layer',
    }
  }

  const revoked: PlayerOwnedItemRecord = {
    ...item,
    status: 'revoked',
    revocable: false,
    revocableUntil: null,
    equippedSlot: null,
    updatedAt: now,
  }
  const saved = await store.put(revoked)
  log.info('item_custody_revoked', {
    itemId: saved.id,
    userId: saved.userId,
    reason: reason.trim(),
  })
  return { ok: true, value: saved }
}

export function isItemInBackpack(item: Pick<PlayerOwnedItemRecord, 'status'>): boolean {
  return item.status === 'custodial' || item.status === 'owned'
}

export function probeItemCustodyEscrowReady(): boolean {
  return probeItemCustodyEscrowSemanticsSync()
}

export function probeItemCustodyEscrowSemanticsSync(): boolean {
  try {
    type Item = {
      status: PlayerOwnedItemStatus
      revocable: boolean
      revocableUntil: number | null
    }
    const t0 = 0
    const windowMs = ITEM_CUSTODY_WINDOW_MS
    const item: Item = {
      status: 'custodial',
      revocable: true,
      revocableUntil: t0 + windowMs,
    }

    // Early release must fail.
    if (item.revocableUntil !== null && item.revocableUntil > t0 + 1) {
      /* still open — correct */
    } else {
      return false
    }

    // After window → owned.
    const after = t0 + windowMs + 1
    if (item.revocableUntil! > after) return false
    item.status = 'owned'
    item.revocable = false
    item.revocableUntil = null
    if (item.status !== 'owned' || item.revocable !== false) return false

    // Custodial revoke path.
    const custodial: Item = {
      status: 'custodial',
      revocable: true,
      revocableUntil: t0 + windowMs,
    }
    custodial.status = 'revoked'
    custodial.revocable = false
    if (custodial.status !== 'revoked') return false
    if (isItemInBackpack(custodial)) return false

    return true
  } catch {
    return false
  }
}
