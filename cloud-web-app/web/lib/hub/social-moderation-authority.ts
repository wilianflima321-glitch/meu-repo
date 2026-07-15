/**
 * I.4 — Social moderation durable authority (disk-backed).
 * Report + Block before party / deep-link. Never invents fake blocks or reports.
 * Layout:
 *   `.aethel/hub/social/blocks/<blockerId>/<blockedId>.json`
 *   `.aethel/hub/social/reports/<reportId>.json`
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('social-moderation-authority')

export const REPORT_REASONS = [
  'harassment',
  'hate',
  'sexual_content',
  'spam',
  'impersonation',
  'other',
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

export const REPORT_DETAILS_MAX = 2000

export interface SocialBlockRecord {
  id: string
  blockerId: string
  blockedId: string
  reason?: string
  createdAt: string
  updatedAt: string
}

export interface SocialReportRecord {
  id: string
  reporterId: string
  targetUserId: string
  reason: ReportReason
  details: string
  /** Optional Arcade / game context — never required for report. */
  gameId?: string
  status: 'open' | 'reviewed' | 'dismissed'
  createdAt: string
  updatedAt: string
}

const SOCIAL_DIR_SEGMENTS = ['.aethel', 'hub', 'social'] as const

function getSocialRoot(): string {
  const base = process.env.AETHEL_HUB_SOCIAL_ROOT
    ? path.resolve(process.env.AETHEL_HUB_SOCIAL_ROOT)
    : path.resolve(process.cwd(), ...SOCIAL_DIR_SEGMENTS)
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

function blockPath(blockerId: string, blockedId: string): string {
  return path.join(getSocialRoot(), 'blocks', sanitize(blockerId), `${sanitize(blockedId)}.json`)
}

function reportPath(reportId: string): string {
  return path.join(getSocialRoot(), 'reports', `${sanitize(reportId)}.json`)
}

function newBlockId(): string {
  return `blk_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`
}

function newReportId(): string {
  return `rpt_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`
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

async function writeJsonFile(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

export function isValidReportReason(reason: unknown): reason is ReportReason {
  return typeof reason === 'string' && (REPORT_REASONS as readonly string[]).includes(reason)
}

export function normalizeReportDetails(details: unknown): string {
  return String(details ?? '')
    .trim()
    .slice(0, REPORT_DETAILS_MAX)
}

/**
 * True when either direction has an active block (symmetric social gate).
 */
export async function isEitherBlocked(userA: string, userB: string): Promise<boolean> {
  const a = String(userA || '').trim()
  const b = String(userB || '').trim()
  if (!a || !b || a === b) return false
  const [ab, ba] = await Promise.all([
    readJsonFile<SocialBlockRecord>(blockPath(a, b)),
    readJsonFile<SocialBlockRecord>(blockPath(b, a)),
  ])
  return Boolean(ab || ba)
}

export async function getBlock(
  blockerId: string,
  blockedId: string,
): Promise<SocialBlockRecord | null> {
  const blocker = String(blockerId || '').trim()
  const blocked = String(blockedId || '').trim()
  if (!blocker || !blocked) return null
  return readJsonFile<SocialBlockRecord>(blockPath(blocker, blocked))
}

export async function listBlocksForUser(blockerId: string): Promise<SocialBlockRecord[]> {
  const blocker = String(blockerId || '').trim()
  if (!blocker) return []
  const dir = path.join(getSocialRoot(), 'blocks', sanitize(blocker))
  try {
    const files = await fs.readdir(dir)
    const out: SocialBlockRecord[] = []
    for (const name of files) {
      if (!name.endsWith('.json')) continue
      const row = await readJsonFile<SocialBlockRecord>(path.join(dir, name))
      if (row?.blockerId && row?.blockedId) out.push(row)
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return []
    throw err
  }
}

export type UpsertBlockInput = {
  blockerId: string
  blockedId: string
  reason?: string
}

export async function upsertBlock(input: UpsertBlockInput): Promise<SocialBlockRecord> {
  const blockerId = String(input.blockerId || '').trim()
  const blockedId = String(input.blockedId || '').trim()
  if (!blockerId || !blockedId) {
    throw Object.assign(new Error('BLOCK_IDENTITY_REQUIRED'), { code: 'BLOCK_IDENTITY_REQUIRED' })
  }
  if (blockerId === blockedId) {
    throw Object.assign(new Error('BLOCK_SELF_FORBIDDEN'), { code: 'BLOCK_SELF_FORBIDDEN' })
  }

  const file = blockPath(blockerId, blockedId)
  const existing = await readJsonFile<SocialBlockRecord>(file)
  const now = new Date().toISOString()
  const next: SocialBlockRecord = {
    id: existing?.id ?? newBlockId(),
    blockerId,
    blockedId,
    reason: input.reason ? String(input.reason).trim().slice(0, 200) : existing?.reason,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await writeJsonFile(file, next)
  log.info('social_block_upserted', { blockerId, blockedId, created: !existing })
  return next
}

export async function removeBlock(blockerId: string, blockedId: string): Promise<boolean> {
  const file = blockPath(String(blockerId || '').trim(), String(blockedId || '').trim())
  try {
    await fs.unlink(file)
    log.info('social_block_removed', { blockerId, blockedId })
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return false
    throw err
  }
}

export type CreateReportInput = {
  reporterId: string
  targetUserId: string
  reason: unknown
  details?: unknown
  gameId?: string
}

export async function createReport(input: CreateReportInput): Promise<SocialReportRecord> {
  const reporterId = String(input.reporterId || '').trim()
  const targetUserId = String(input.targetUserId || '').trim()
  if (!reporterId || !targetUserId) {
    throw Object.assign(new Error('REPORT_IDENTITY_REQUIRED'), { code: 'REPORT_IDENTITY_REQUIRED' })
  }
  if (reporterId === targetUserId) {
    throw Object.assign(new Error('REPORT_SELF_FORBIDDEN'), { code: 'REPORT_SELF_FORBIDDEN' })
  }
  if (!isValidReportReason(input.reason)) {
    throw Object.assign(new Error('REPORT_REASON_INVALID'), { code: 'REPORT_REASON_INVALID' })
  }

  const now = new Date().toISOString()
  const id = newReportId()
  const record: SocialReportRecord = {
    id,
    reporterId,
    targetUserId,
    reason: input.reason,
    details: normalizeReportDetails(input.details),
    gameId: input.gameId ? String(input.gameId).trim().slice(0, 80) : undefined,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  }
  await writeJsonFile(reportPath(id), record)
  log.info('social_report_created', {
    reportId: id,
    reporterId,
    targetUserId,
    reason: record.reason,
  })
  return record
}

export async function listReportsByReporter(reporterId: string): Promise<SocialReportRecord[]> {
  const reporter = String(reporterId || '').trim()
  if (!reporter) return []
  const dir = path.join(getSocialRoot(), 'reports')
  try {
    const files = await fs.readdir(dir)
    const out: SocialReportRecord[] = []
    for (const name of files) {
      if (!name.endsWith('.json')) continue
      const row = await readJsonFile<SocialReportRecord>(path.join(dir, name))
      if (row?.reporterId === reporter) out.push(row)
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return []
    throw err
  }
}

/** Probe used by Hub honesty — confirms durable social moderation root is writable. */
export async function probeSocialModerationWritable(): Promise<{
  writable: boolean
  root: string
  reason?: string
}> {
  const root = getSocialRoot()
  try {
    await fs.mkdir(root, { recursive: true })
    await fs.mkdir(path.join(root, 'blocks'), { recursive: true })
    await fs.mkdir(path.join(root, 'reports'), { recursive: true })
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

export function getSocialModerationRoot(): string {
  return getSocialRoot()
}
