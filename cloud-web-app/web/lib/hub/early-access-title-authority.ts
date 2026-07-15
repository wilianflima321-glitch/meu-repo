/**
 * I.2 deepen — Early-access creator opt-in flag (disk-backed).
 * Titles opt in to XIV.2 Early Access Reviews (30m gate + badge).
 * Default off — no silent <2h review spam.
 * Layout: `.aethel/hub/early-access/<gameId>.json`
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('early-access-title-authority')

/** Law XIV.2 — Early Access Reviews minimum after creator opt-in. */
export const EARLY_ACCESS_REVIEW_REQUIRED_SECONDS = 1800

export interface EarlyAccessTitleFlag {
  gameId: string
  /** Creator opt-in — false/default means standard 2h verified gate only. */
  enabled: boolean
  requiredSeconds: number
  updatedBy: string
  updatedAt: string
  createdAt: string
}

const EA_DIR_SEGMENTS = ['.aethel', 'hub', 'early-access'] as const

function getEarlyAccessRoot(): string {
  const base = process.env.AETHEL_HUB_EARLY_ACCESS_ROOT
    ? path.resolve(process.env.AETHEL_HUB_EARLY_ACCESS_ROOT)
    : path.resolve(process.cwd(), ...EA_DIR_SEGMENTS)
  return base
}

function sanitize(segment: string): string {
  return (
    String(segment || '')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80) || 'unknown'
  )
}

function flagPath(gameId: string): string {
  return path.join(getEarlyAccessRoot(), `${sanitize(gameId)}.json`)
}

async function readFlagFile(file: string): Promise<EarlyAccessTitleFlag | null> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as EarlyAccessTitleFlag
    if (!parsed || !parsed.gameId) return null
    return {
      ...parsed,
      enabled: parsed.enabled === true,
      requiredSeconds: Math.max(
        EARLY_ACCESS_REVIEW_REQUIRED_SECONDS,
        Math.floor(Number(parsed.requiredSeconds) || EARLY_ACCESS_REVIEW_REQUIRED_SECONDS),
      ),
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return null
    throw err
  }
}

async function writeFlagFile(file: string, flag: EarlyAccessTitleFlag): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(flag, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

/** Empty-honest: missing file ⇒ not opted in. */
export async function getEarlyAccessTitleFlag(
  gameId: string,
): Promise<EarlyAccessTitleFlag | null> {
  const id = String(gameId || '').trim()
  if (!id) return null
  return readFlagFile(flagPath(id))
}

export async function isEarlyAccessReviewsEnabled(gameId: string): Promise<boolean> {
  const flag = await getEarlyAccessTitleFlag(gameId)
  return flag?.enabled === true
}

export type SetEarlyAccessOptInInput = {
  gameId: string
  userId: string
  enabled: boolean
  /**
   * When provided (from PublishedGame.authorId), must match userId.
   * When omitted (tests / no catalog row), auth userId is accepted as creator.
   */
  authorId?: string | null
}

export async function setEarlyAccessOptIn(
  input: SetEarlyAccessOptInInput,
): Promise<EarlyAccessTitleFlag> {
  const gameId = String(input.gameId || '').trim()
  const userId = String(input.userId || '').trim()
  if (!gameId || !userId) {
    throw Object.assign(new Error('EARLY_ACCESS_IDENTITY_REQUIRED'), {
      code: 'EARLY_ACCESS_IDENTITY_REQUIRED',
    })
  }

  const authorId =
    input.authorId === undefined || input.authorId === null
      ? null
      : String(input.authorId).trim() || null
  if (authorId && authorId !== userId) {
    throw Object.assign(new Error('EARLY_ACCESS_NOT_CREATOR'), {
      code: 'EARLY_ACCESS_NOT_CREATOR',
    })
  }

  const file = flagPath(gameId)
  const existing = await readFlagFile(file)
  const now = new Date().toISOString()
  const next: EarlyAccessTitleFlag = {
    gameId,
    enabled: input.enabled === true,
    requiredSeconds: EARLY_ACCESS_REVIEW_REQUIRED_SECONDS,
    updatedBy: userId,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
  }
  await writeFlagFile(file, next)
  log.info('early_access_opt_in_set', {
    gameId,
    userId,
    enabled: next.enabled,
  })
  return next
}

export async function probeEarlyAccessStoreWritable(): Promise<{
  writable: boolean
  root: string
  reason?: string
}> {
  const root = getEarlyAccessRoot()
  try {
    await fs.mkdir(root, { recursive: true })
    const probe = path.join(root, `.probe_${process.pid}`)
    await fs.writeFile(probe, 'ok', 'utf8')
    await fs.unlink(probe)
    return { writable: true, root }
  } catch (err) {
    return {
      writable: false,
      root,
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}

export function getEarlyAccessStoreRoot(): string {
  return getEarlyAccessRoot()
}
