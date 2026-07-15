/**
 * Hub I.7 — Cross-save policy durable authority (disk-backed).
 * Spec: default-on, user opt-out (`optional`). Creator may set required | optional | disabled.
 * Layout:
 *   `.aethel/hub/cross-save-policy/<gameId>.json` — title policy
 *   `.aethel/hub/cross-save-opt-out/<userId>/<gameId>.json` — player opt-out
 * Durable local GameSave ≠ Desktop↔Web cloud sync marketing.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('cross-save-policy-authority')

/** Spec export-manifest / PublishedGame field. */
export type CrossSavePolicy = 'required' | 'optional' | 'disabled'

/** Default-on: titles opt into cross-save unless creator disables or player opts out. */
export const DEFAULT_CROSS_SAVE_POLICY: CrossSavePolicy = 'optional'

export interface CrossSavePolicyRecord {
  gameId: string
  policy: CrossSavePolicy
  updatedBy: string
  updatedAt: string
  createdAt: string
}

export interface CrossSaveUserOptOutRecord {
  userId: string
  gameId: string
  /** true = player opted out of cross-save for this title */
  optedOut: boolean
  updatedAt: string
  createdAt: string
}

const POLICY_DIR = ['.aethel', 'hub', 'cross-save-policy'] as const
const OPT_OUT_DIR = ['.aethel', 'hub', 'cross-save-opt-out'] as const

function getPolicyRoot(): string {
  return process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT
    ? path.resolve(process.env.AETHEL_HUB_CROSS_SAVE_POLICY_ROOT)
    : path.resolve(process.cwd(), ...POLICY_DIR)
}

function getOptOutRoot(): string {
  return process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT
    ? path.resolve(process.env.AETHEL_HUB_CROSS_SAVE_OPT_OUT_ROOT)
    : path.resolve(process.cwd(), ...OPT_OUT_DIR)
}

function sanitize(segment: string): string {
  return (
    String(segment || '')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80) || 'unknown'
  )
}

export function isValidCrossSavePolicy(value: unknown): value is CrossSavePolicy {
  return value === 'required' || value === 'optional' || value === 'disabled'
}

function policyPath(gameId: string): string {
  return path.join(getPolicyRoot(), `${sanitize(gameId)}.json`)
}

function optOutPath(userId: string, gameId: string): string {
  return path.join(getOptOutRoot(), sanitize(userId), `${sanitize(gameId)}.json`)
}

async function readJsonFile<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw) as T
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return null
    throw err
  }
}

async function writeJsonFile(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

/** Empty-honest: missing file ⇒ default-on `optional`. */
export async function getCrossSavePolicy(gameId: string): Promise<CrossSavePolicyRecord> {
  const id = String(gameId || '').trim()
  if (!id) {
    throw Object.assign(new Error('CROSS_SAVE_GAME_ID_REQUIRED'), {
      code: 'CROSS_SAVE_GAME_ID_REQUIRED',
    })
  }
  const existing = await readJsonFile<CrossSavePolicyRecord>(policyPath(id))
  if (existing && isValidCrossSavePolicy(existing.policy)) {
    return {
      ...existing,
      gameId: id,
      policy: existing.policy,
    }
  }
  const now = new Date().toISOString()
  return {
    gameId: id,
    policy: DEFAULT_CROSS_SAVE_POLICY,
    updatedBy: 'system',
    updatedAt: now,
    createdAt: now,
  }
}

export type SetCrossSavePolicyInput = {
  gameId: string
  userId: string
  policy: CrossSavePolicy
  /**
   * When provided (from PublishedGame.authorId), must match userId.
   * When omitted (tests / no catalog row), auth userId is accepted as creator.
   */
  authorId?: string | null
}

export async function setCrossSavePolicy(
  input: SetCrossSavePolicyInput,
): Promise<CrossSavePolicyRecord> {
  const gameId = String(input.gameId || '').trim()
  const userId = String(input.userId || '').trim()
  if (!gameId || !userId) {
    throw Object.assign(new Error('CROSS_SAVE_IDENTITY_REQUIRED'), {
      code: 'CROSS_SAVE_IDENTITY_REQUIRED',
    })
  }
  if (!isValidCrossSavePolicy(input.policy)) {
    throw Object.assign(new Error('CROSS_SAVE_POLICY_INVALID'), {
      code: 'CROSS_SAVE_POLICY_INVALID',
    })
  }

  const authorId =
    input.authorId === undefined || input.authorId === null
      ? null
      : String(input.authorId).trim() || null
  if (authorId && authorId !== userId) {
    throw Object.assign(new Error('CROSS_SAVE_NOT_CREATOR'), {
      code: 'CROSS_SAVE_NOT_CREATOR',
    })
  }

  const file = policyPath(gameId)
  const existing = await readJsonFile<CrossSavePolicyRecord>(file)
  const now = new Date().toISOString()
  const next: CrossSavePolicyRecord = {
    gameId,
    policy: input.policy,
    updatedBy: userId,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
  }
  await writeJsonFile(file, next)
  log.info('cross_save_policy_set', { gameId, userId, policy: next.policy })
  return next
}

/** Empty-honest: missing file ⇒ not opted out (default-on). */
export async function getCrossSaveUserOptOut(
  userId: string,
  gameId: string,
): Promise<CrossSaveUserOptOutRecord | null> {
  const uid = String(userId || '').trim()
  const gid = String(gameId || '').trim()
  if (!uid || !gid) return null
  const existing = await readJsonFile<CrossSaveUserOptOutRecord>(optOutPath(uid, gid))
  if (!existing) return null
  return {
    ...existing,
    userId: uid,
    gameId: gid,
    optedOut: existing.optedOut === true,
  }
}

export async function isCrossSaveUserOptedOut(userId: string, gameId: string): Promise<boolean> {
  const row = await getCrossSaveUserOptOut(userId, gameId)
  return row?.optedOut === true
}

export type SetCrossSaveUserOptOutInput = {
  userId: string
  gameId: string
  optedOut: boolean
}

export async function setCrossSaveUserOptOut(
  input: SetCrossSaveUserOptOutInput,
): Promise<CrossSaveUserOptOutRecord> {
  const userId = String(input.userId || '').trim()
  const gameId = String(input.gameId || '').trim()
  if (!userId || !gameId) {
    throw Object.assign(new Error('CROSS_SAVE_IDENTITY_REQUIRED'), {
      code: 'CROSS_SAVE_IDENTITY_REQUIRED',
    })
  }

  const policy = await getCrossSavePolicy(gameId)
  if (policy.policy === 'required' && input.optedOut === true) {
    throw Object.assign(new Error('CROSS_SAVE_OPT_OUT_FORBIDDEN'), {
      code: 'CROSS_SAVE_OPT_OUT_FORBIDDEN',
    })
  }
  if (policy.policy === 'disabled') {
    throw Object.assign(new Error('CROSS_SAVE_DISABLED_BY_TITLE'), {
      code: 'CROSS_SAVE_DISABLED_BY_TITLE',
    })
  }

  const file = optOutPath(userId, gameId)
  const existing = await readJsonFile<CrossSaveUserOptOutRecord>(file)
  const now = new Date().toISOString()
  const next: CrossSaveUserOptOutRecord = {
    userId,
    gameId,
    optedOut: input.optedOut === true,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
  }
  await writeJsonFile(file, next)
  log.info('cross_save_user_opt_out_set', {
    userId,
    gameId,
    optedOut: next.optedOut,
  })
  return next
}

/**
 * Resolve whether Desktop↔Web cloud sync may proceed for this user/title.
 * Disk durable GameSave is always allowed separately — this gates cloud path only.
 */
export async function resolveCrossSaveCloudEligibility(input: {
  userId: string
  gameId: string
  /** When false, cloud path stays fail-closed regardless of policy. */
  gameSaveCloudReady?: boolean
}): Promise<{
  allowed: boolean
  policy: CrossSavePolicy
  optedOut: boolean
  code?: string
  reason: string
}> {
  const policyRec = await getCrossSavePolicy(input.gameId)
  const policy = policyRec.policy
  const optedOut = await isCrossSaveUserOptedOut(input.userId, input.gameId)

  if (policy === 'disabled') {
    return {
      allowed: false,
      policy,
      optedOut,
      code: 'CROSS_SAVE_DISABLED_BY_TITLE',
      reason: 'Title crossSavePolicy=disabled',
    }
  }
  if (policy === 'optional' && optedOut) {
    return {
      allowed: false,
      policy,
      optedOut: true,
      code: 'CROSS_SAVE_USER_OPTED_OUT',
      reason: 'Player opted out of cross-save (default-on)',
    }
  }
  if (input.gameSaveCloudReady !== true) {
    return {
      allowed: false,
      policy,
      optedOut,
      code: 'CROSS_SAVE_CLOUD_HELD',
      reason: 'F.1 Prisma/R2 GameSave cloud marketing [HELD]',
    }
  }
  return {
    allowed: true,
    policy,
    optedOut: false,
    reason: policy === 'required' ? 'cross_save_required' : 'cross_save_optional_default_on',
  }
}

export async function probeCrossSavePolicyStoreWritable(): Promise<{
  writable: boolean
  root: string
  optOutRoot: string
  reason?: string
}> {
  const root = getPolicyRoot()
  const optOutRoot = getOptOutRoot()
  try {
    await fs.mkdir(root, { recursive: true })
    await fs.mkdir(optOutRoot, { recursive: true })
    const probe = path.join(root, `.probe_${process.pid}`)
    await fs.writeFile(probe, 'ok', 'utf8')
    await fs.unlink(probe)
    return { writable: true, root, optOutRoot }
  } catch (err) {
    return {
      writable: false,
      root,
      optOutRoot,
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}

export function getCrossSavePolicyStoreRoot(): string {
  return getPolicyRoot()
}

export function getCrossSaveOptOutStoreRoot(): string {
  return getOptOutRoot()
}
