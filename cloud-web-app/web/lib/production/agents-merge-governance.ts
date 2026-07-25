/**
 * CW6 — Merge governance receipts (not J.11/J.12).
 * Real deny/apply evidence from governed change apply — no cosmetic success.
 */

import type { GovernedApplyResult } from '@/lib/ai/governed-change-apply-client'
import type { NexusCellUi } from '@/lib/production/nexus-mission-phases'
import type { FileValidationStatusEntry } from '@/lib/production/agent-apply-validation-gate'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('agents-merge-governance')

const APPLY_RECEIPT_HISTORY_CAP = 12

export type GovernedApplyReceipt = {
  outcome: 'applied' | 'denied'
  filePath: string
  /**
   * Real file paths touched by this apply (primary path + metadata lists).
   * Used for structured path dependency edges — never fabricated Nexus roots.
   */
  touchedPaths: string[]
  /**
   * Optional task dependency edges declared in apply metadata only.
   * Never invented from Nexus — empty when metadata omits them.
   */
  taskDependencies: ReceiptTaskDependencyEdge[]
  /** Per-file AST/L.5 swarm statuses from governed apply metadata (Cursor-like clarity). */
  fileValidation: FileValidationStatusEntry[]
  runId?: string
  rollbackToken?: string
  code?: string
  detail?: string
  at: string
  /** Always false — apply receipt alone never unlocks AI-native / Composer-surpass marketing. */
  marketingAllowed: false
  /** Always false — receipts must not claim Cursor Composer surpass. */
  composerSurpassClaim: false
}

export type NexusTaskDependencyEdge = {
  taskId: string
  dependsOnTaskIds: string[]
  domainLabel: string
  status: NexusCellUi['status']
}

/** Lightweight task dep edge from apply receipt metadata (not ACP / not fabricated). */
export type ReceiptTaskDependencyEdge = {
  taskId: string
  dependsOnTaskIds: string[]
  source: 'receipt-metadata'
}

/** Per-path rollup from governed apply receipts (Cursor-bar merge/apply OS). */
export type TouchedPathStatusEntry = {
  path: string
  /** applied | denied | conflict (both outcomes seen across history). */
  status: 'applied' | 'denied' | 'conflict'
  latestOutcome: 'applied' | 'denied'
  latestCode?: string
  applyCount: number
  denyCount: number
}

/** Visible dependency/receipt graph node for operator UX (not ACP). */
export type MergeReceiptGraphNode = {
  id: string
  kind: 'task' | 'apply' | 'path'
  label: string
  status: string
  dependsOnIds: string[]
  detail?: string
  code?: string
  at?: string
}

export type MergeReceiptConflictSummary = {
  appliedCount: number
  deniedCount: number
  conflictPathCount: number
  latestDeny: GovernedApplyReceipt | null
  /** Operator-facing one-liner — never claims success when any deny exists. */
  operatorSummary: string
  marketingAllowed: false
}

function metadataObjectFromApplyResult(
  result: GovernedApplyResult,
): Record<string, unknown> | null {
  const metadata = result.metadata
  if (!metadata || typeof metadata !== 'object') return null
  return metadata
}

const FILE_VALIDATION_STATUSES = new Set([
  'pass',
  'denied_ast',
  'denied_lazy',
  'denied_l5',
  'denied_disjoint',
  'skipped_non_ts',
])

/** Extract per-file validation statuses from apply metadata (deny or apply). */
export function extractFileValidationFromApplyResult(
  result: GovernedApplyResult,
): FileValidationStatusEntry[] {
  const metadata = metadataObjectFromApplyResult(result)
  if (!metadata) return []
  const raw = metadata.fileValidation
  if (!Array.isArray(raw)) return []
  const out: FileValidationStatusEntry[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const path = typeof row.path === 'string' ? row.path.trim() : ''
    const status = typeof row.status === 'string' ? row.status : ''
    if (!path || !FILE_VALIDATION_STATUSES.has(status)) continue
    out.push({
      path,
      status: status as FileValidationStatusEntry['status'],
      code: typeof row.code === 'string' ? row.code : undefined,
      detail: typeof row.detail === 'string' ? row.detail : undefined,
      taskId: typeof row.taskId === 'string' ? row.taskId : undefined,
    })
  }
  return out
}

/** Collect real touched file paths from apply input + optional result metadata. */
export function extractTouchedPathsFromApplyResult(
  filePath: string,
  result: GovernedApplyResult,
): string[] {
  const paths = new Set<string>()
  const primary = filePath.trim()
  if (primary) paths.add(primary)

  const metadata = metadataObjectFromApplyResult(result)
  if (metadata) {
    const listKeys = ['touchedPaths', 'changedFiles', 'files', 'filePaths'] as const
    for (const key of listKeys) {
      const value = metadata[key]
      if (!Array.isArray(value)) continue
      for (const entry of value) {
        if (typeof entry === 'string' && entry.trim()) paths.add(entry.trim())
      }
    }
    const metaPath = metadata.filePath
    if (typeof metaPath === 'string' && metaPath.trim()) paths.add(metaPath.trim())
  }

  return Array.from(paths)
}

/**
 * Extract task dependency edges from apply metadata only.
 * Accepts `taskDependencies: [{ taskId, dependsOnTaskIds }]` or a single
 * `{ taskId, dependsOnTaskIds }` pair — never invents Nexus roots.
 */
export function extractTaskDependenciesFromApplyResult(
  result: GovernedApplyResult,
): ReceiptTaskDependencyEdge[] {
  const metadata = metadataObjectFromApplyResult(result)
  if (!metadata) return []

  const edges: ReceiptTaskDependencyEdge[] = []
  const pushEdge = (taskId: unknown, dependsOn: unknown) => {
    if (typeof taskId !== 'string' || !taskId.trim()) return
    if (!Array.isArray(dependsOn)) return
    const dependsOnTaskIds = dependsOn
      .filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
      .map((id) => id.trim())
    edges.push({
      taskId: taskId.trim(),
      dependsOnTaskIds,
      source: 'receipt-metadata',
    })
  }

  const list = metadata.taskDependencies
  if (Array.isArray(list)) {
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as Record<string, unknown>
      pushEdge(row.taskId, row.dependsOnTaskIds)
    }
  }

  // Single-edge shorthand on the receipt metadata object.
  if (edges.length === 0) {
    pushEdge(metadata.taskId, metadata.dependsOnTaskIds)
  }

  return edges
}

/**
 * Deduped lightweight task dependency list from receipt metadata only.
 * Does not merge or invent Nexus cell edges.
 */
export function buildReceiptTaskDependencyList(
  receipts: readonly GovernedApplyReceipt[],
): ReceiptTaskDependencyEdge[] {
  const byTask = new Map<string, ReceiptTaskDependencyEdge>()
  for (const receipt of receipts) {
    for (const edge of receipt.taskDependencies ?? []) {
      const existing = byTask.get(edge.taskId)
      if (!existing) {
        byTask.set(edge.taskId, { ...edge, dependsOnTaskIds: [...edge.dependsOnTaskIds] })
        continue
      }
      const merged = new Set([...existing.dependsOnTaskIds, ...edge.dependsOnTaskIds])
      byTask.set(edge.taskId, {
        taskId: edge.taskId,
        dependsOnTaskIds: Array.from(merged),
        source: 'receipt-metadata',
      })
    }
  }
  return Array.from(byTask.values())
}

/**
 * Visible touched-path list with status from real governed apply receipts.
 * conflict = path saw both applied and denied across session history.
 */
export function buildTouchedPathStatusList(
  receipts: readonly GovernedApplyReceipt[],
): TouchedPathStatusEntry[] {
  type Acc = {
    path: string
    applyCount: number
    denyCount: number
    latestOutcome: 'applied' | 'denied'
    latestCode?: string
  }
  const byPath = new Map<string, Acc>()

  for (const receipt of receipts) {
    const paths =
      receipt.touchedPaths?.filter((p) => typeof p === 'string' && p.trim()) ?? []
    const list = paths.length > 0 ? paths : [receipt.filePath].filter(Boolean)
    for (const path of list) {
      const prev = byPath.get(path) ?? {
        path,
        applyCount: 0,
        denyCount: 0,
        latestOutcome: receipt.outcome,
      }
      if (receipt.outcome === 'applied') prev.applyCount += 1
      else prev.denyCount += 1
      prev.latestOutcome = receipt.outcome
      prev.latestCode = receipt.code
      byPath.set(path, prev)
    }
  }

  return Array.from(byPath.values()).map((entry) => {
    const status: TouchedPathStatusEntry['status'] =
      entry.applyCount > 0 && entry.denyCount > 0
        ? 'conflict'
        : entry.denyCount > 0
          ? 'denied'
          : 'applied'
    return {
      path: entry.path,
      status,
      latestOutcome: entry.latestOutcome,
      latestCode: entry.latestCode,
      applyCount: entry.applyCount,
      denyCount: entry.denyCount,
    }
  })
}

export function toGovernedApplyReceipt(
  filePath: string,
  result: GovernedApplyResult,
): GovernedApplyReceipt {
  const touchedPaths = extractTouchedPathsFromApplyResult(filePath, result)
  const taskDependencies = extractTaskDependenciesFromApplyResult(result)
  const fileValidation = extractFileValidationFromApplyResult(result)
  if (result.ok) {
    const receipt: GovernedApplyReceipt = {
      outcome: 'applied',
      filePath,
      touchedPaths,
      taskDependencies,
      fileValidation,
      runId: result.runId,
      rollbackToken: result.rollbackToken,
      detail: result.message,
      at: new Date().toISOString(),
      marketingAllowed: false,
      composerSurpassClaim: false,
    }
    log.info('governed_apply_receipt', {
      outcome: 'applied',
      filePath,
      runId: result.runId,
      touchedPathCount: touchedPaths.length,
      taskDependencyCount: taskDependencies.length,
      fileValidationCount: fileValidation.length,
      composerSurpassClaim: false,
    })
    return receipt
  }

  const receipt: GovernedApplyReceipt = {
    outcome: 'denied',
    filePath,
    touchedPaths,
    taskDependencies,
    fileValidation,
    runId: result.runId,
    code: result.error || result.copy.code,
    detail: result.copy.detail || result.banner,
    at: new Date().toISOString(),
    marketingAllowed: false,
    composerSurpassClaim: false,
  }
  log.info('governed_apply_receipt', {
    outcome: 'denied',
    filePath,
    code: receipt.code,
    runId: result.runId,
    touchedPathCount: touchedPaths.length,
    taskDependencyCount: taskDependencies.length,
    fileValidationCount: fileValidation.length,
    composerSurpassClaim: false,
  })
  return receipt
}

/**
 * Append apply receipt to session history (newest last), capped for UI.
 */
export function appendGovernedApplyReceipt(
  history: readonly GovernedApplyReceipt[],
  receipt: GovernedApplyReceipt,
  cap = APPLY_RECEIPT_HISTORY_CAP,
): GovernedApplyReceipt[] {
  const next = [...history, receipt]
  if (next.length <= cap) return next
  return next.slice(next.length - cap)
}

/**
 * Derive task-graph dependency edges from Nexus cells.
 * Only explicit `dependsOnTaskIds` count — never invent peripheral→nucleus
 * role heuristics (CW6 fake task-graph theater; J.11 ACP STOPPED).
 */
export function buildNexusTaskDependencyList(
  cells: readonly NexusCellUi[],
): NexusTaskDependencyEdge[] {
  return cells.map((cell) => {
    const dependsOnTaskIds = cell.dependsOnTaskIds?.filter(Boolean) ?? []
    return {
      taskId: cell.taskId,
      dependsOnTaskIds,
      domainLabel: cell.domainLabel,
      status: cell.status,
    }
  })
}

/**
 * Build a visible dependency + apply-receipt graph from live Nexus cells
 * and governed apply path receipts (ledger/apply — not J.11 ACP).
 *
 * Apply edges depend on real `touchedPaths` / `filePath` nodes only —
 * never invent apply→Nexus-root edges (CW6 theater).
 */
export function buildMergeReceiptDependencyGraph(input: {
  cells?: readonly NexusCellUi[]
  applyReceipts?: readonly GovernedApplyReceipt[]
}): MergeReceiptGraphNode[] {
  const cells = input.cells ?? []
  const applyReceipts = input.applyReceipts ?? []
  const edges = buildNexusTaskDependencyList(cells)
  const taskNodes: MergeReceiptGraphNode[] = edges.map((edge) => {
    const cell = cells.find((c) => c.taskId === edge.taskId)
    return {
      id: `task:${edge.taskId}`,
      kind: 'task',
      label: edge.domainLabel,
      status: edge.status,
      dependsOnIds: edge.dependsOnTaskIds.map((id) => `task:${id}`),
      detail: cell ? `${cell.role} · ${cell.status}` : edge.status,
    }
  })

  const touchedByReceipt = applyReceipts.map((receipt) => {
    const paths =
      receipt.touchedPaths?.filter((p) => typeof p === 'string' && p.trim()) ?? []
    return paths.length > 0 ? paths : [receipt.filePath].filter(Boolean)
  })

  const pathStatusByPath = new Map(
    buildTouchedPathStatusList(applyReceipts).map((entry) => [entry.path, entry]),
  )

  const pathOrder: string[] = []
  const seenPaths = new Set<string>()
  for (const paths of touchedByReceipt) {
    for (const path of paths) {
      if (seenPaths.has(path)) continue
      seenPaths.add(path)
      pathOrder.push(path)
    }
  }

  const pathNodes: MergeReceiptGraphNode[] = pathOrder.map((path) => {
    const base = path.split(/[/\\]/).pop() || path
    const rollup = pathStatusByPath.get(path)
    return {
      id: `path:${path}`,
      kind: 'path',
      label: base,
      status: rollup?.status ?? 'touched',
      dependsOnIds: [],
      detail: path,
      code: rollup?.latestCode,
    }
  })

  // Receipt-metadata task edges only — never fabricated apply→Nexus links.
  const receiptTaskEdges = buildReceiptTaskDependencyList(applyReceipts)
  const receiptTaskNodes: MergeReceiptGraphNode[] = receiptTaskEdges.map((edge) => ({
    id: `receipt-task:${edge.taskId}`,
    kind: 'task',
    label: edge.taskId,
    status: 'receipt-metadata',
    dependsOnIds: edge.dependsOnTaskIds.map((id) => `receipt-task:${id}`),
    detail: 'Task dependency from apply receipt metadata',
  }))

  const applyNodes: MergeReceiptGraphNode[] = applyReceipts.map((receipt, index) => {
    const base = receipt.filePath.split(/[/\\]/).pop() || receipt.filePath
    const paths = touchedByReceipt[index] ?? [receipt.filePath]
    return {
      id: `apply:${receipt.runId || receipt.at}:${index}`,
      kind: 'apply',
      label: base,
      status: receipt.outcome,
      dependsOnIds: paths.map((path) => `path:${path}`),
      detail: receipt.detail,
      code: receipt.code,
      at: receipt.at,
    }
  })

  return [...taskNodes, ...receiptTaskNodes, ...pathNodes, ...applyNodes]
}

/** Operator-useful conflict/deny summary for merge receipt list. */
export function summarizeMergeReceiptConflict(
  receipts: readonly GovernedApplyReceipt[],
): MergeReceiptConflictSummary {
  const appliedCount = receipts.filter((r) => r.outcome === 'applied').length
  const denied = receipts.filter((r) => r.outcome === 'denied')
  const deniedCount = denied.length
  const latestDeny = denied.length > 0 ? denied[denied.length - 1]! : null
  const pathRollup = buildTouchedPathStatusList(receipts)
  const conflictPathCount = pathRollup.filter((p) => p.status === 'conflict').length

  let operatorSummary: string
  if (receipts.length === 0) {
    operatorSummary = 'No governed apply receipts yet.'
  } else if (deniedCount > 0 && latestDeny) {
    const conflictNote =
      conflictPathCount > 0
        ? ` ${conflictPathCount} path(s) have mixed applied+denied history.`
        : ''
    operatorSummary = `Merge blocked — ${deniedCount} denied, ${appliedCount} applied. Latest: ${
      latestDeny.code || 'APPLY_DENIED'
    } on ${latestDeny.filePath}.${conflictNote} Nothing claimed as success while denies remain.`
  } else if (conflictPathCount > 0) {
    operatorSummary = `${appliedCount} applied · 0 denied, but ${conflictPathCount} path(s) still show conflict history. Marketing fail-closed.`
  } else {
    operatorSummary = `${appliedCount} applied · 0 denied. Marketing still fail-closed.`
  }

  return {
    appliedCount,
    deniedCount,
    conflictPathCount,
    latestDeny,
    operatorSummary,
    marketingAllowed: false,
  }
}

/** Extract sha256 / patch-hash refs from ledger event refs (VisualEvidence HELD path). */
export function extractPatchHashRefsFromLedgerEvents(
  events: ReadonlyArray<{ refs: string[] }>,
): string[] {
  const refs: string[] = []
  for (const event of events) {
    for (const ref of event.refs) {
      if (/^sha256:/i.test(ref) || /patch.?hash/i.test(ref)) {
        refs.push(ref)
      }
    }
  }
  return Array.from(new Set(refs))
}
