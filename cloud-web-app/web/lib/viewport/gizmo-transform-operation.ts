export type GizmoTransformMode = 'translate' | 'rotate' | 'scale'
export type GizmoTransformSpace = 'world' | 'local'
export type GizmoTransformSource = 'user' | 'agent'
export type GizmoSnapProfile = 'freeform' | 'gameplay-grid' | 'cinematic-shot' | 'ui-layout' | 'architecture'

export type GizmoTransformVector = {
  x: number
  y: number
  z: number
}

export type GizmoTransformSnapshot = {
  position: GizmoTransformVector
  rotation: GizmoTransformVector
  scale: GizmoTransformVector
}

export type GizmoTransformableObject = {
  id: string
  name?: string
  position: readonly [number, number, number]
  rotation: readonly [number, number, number]
  scale: readonly [number, number, number]
}

export type GizmoTransformValidation = {
  ok: boolean
  warnings: string[]
  blockers: string[]
}

export type GizmoTransformRollback = {
  operationId: string
  targetSnapshots: Record<string, GizmoTransformSnapshot>
  reason: string
}

export type GizmoTransformOperation = {
  version: 1
  id: string
  projectId?: string
  sceneId?: string
  objectIds: string[]
  objectNames: Record<string, string>
  mode: GizmoTransformMode
  space: GizmoTransformSpace
  snapEnabled: boolean
  snapProfile: GizmoSnapProfile
  source: GizmoTransformSource
  agentId?: string
  reason: string
  before: Record<string, GizmoTransformSnapshot>
  after: Record<string, GizmoTransformSnapshot>
  delta: Record<string, GizmoTransformSnapshot>
  evidenceRefs: string[]
  validation: GizmoTransformValidation
  rollback: GizmoTransformRollback
  createdAt: string
}

export type BuildGizmoTransformOperationInput = {
  id?: string
  projectId?: string
  sceneId?: string
  objectsBefore: readonly GizmoTransformableObject[]
  objectsAfter: readonly GizmoTransformableObject[]
  mode: GizmoTransformMode
  space: GizmoTransformSpace
  snapEnabled: boolean
  snapProfile?: GizmoSnapProfile
  source: GizmoTransformSource
  agentId?: string
  reason?: string
  evidenceRefs?: readonly string[]
  createdAt?: string
}

const DEFAULT_REASON_BY_SOURCE: Record<GizmoTransformSource, string> = {
  user: 'Manual viewport gizmo transform',
  agent: 'Agent-requested viewport gizmo transform',
}

const transformModes: GizmoTransformMode[] = ['translate', 'rotate', 'scale']
const transformSpaces: GizmoTransformSpace[] = ['world', 'local']
const transformSources: GizmoTransformSource[] = ['user', 'agent']
const snapProfiles: GizmoSnapProfile[] = ['freeform', 'gameplay-grid', 'cinematic-shot', 'ui-layout', 'architecture']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function pickOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function pickStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

function makeId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.()
  return randomId ? `${prefix}_${randomId}` : `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function vectorFromTuple(tuple: readonly [number, number, number]): GizmoTransformVector {
  return { x: tuple[0], y: tuple[1], z: tuple[2] }
}

function vectorFromRecord(value: unknown): GizmoTransformVector | null {
  if (!isRecord(value)) return null
  const x = value.x
  const y = value.y
  const z = value.z
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null
  return { x, y, z }
}

function snapshotFromRecord(value: unknown): GizmoTransformSnapshot | null {
  if (!isRecord(value)) return null
  const position = vectorFromRecord(value.position)
  const rotation = vectorFromRecord(value.rotation)
  const scale = vectorFromRecord(value.scale)
  return position && rotation && scale ? { position, rotation, scale } : null
}

function snapshotMapFromRecord(value: unknown): Record<string, GizmoTransformSnapshot> | null {
  if (!isRecord(value)) return null
  const snapshots: Record<string, GizmoTransformSnapshot> = {}
  for (const [key, candidate] of Object.entries(value)) {
    const snapshot = snapshotFromRecord(candidate)
    if (!snapshot) return null
    snapshots[key] = snapshot
  }
  return snapshots
}

function subtractVector(after: GizmoTransformVector, before: GizmoTransformVector): GizmoTransformVector {
  return {
    x: after.x - before.x,
    y: after.y - before.y,
    z: after.z - before.z,
  }
}

function isFiniteVector(vector: GizmoTransformVector): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z)
}

function magnitude(vector: GizmoTransformVector): number {
  return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2)
}

function hasChanged(delta: GizmoTransformSnapshot): boolean {
  const epsilon = 0.000_001
  return magnitude(delta.position) > epsilon || magnitude(delta.rotation) > epsilon || magnitude(delta.scale) > epsilon
}

export function sceneObjectToGizmoSnapshot(object: GizmoTransformableObject): GizmoTransformSnapshot {
  return {
    position: vectorFromTuple(object.position),
    rotation: vectorFromTuple(object.rotation),
    scale: vectorFromTuple(object.scale),
  }
}

export function buildGizmoTransformOperation(input: BuildGizmoTransformOperationInput): GizmoTransformOperation {
  const beforeById: Record<string, GizmoTransformSnapshot> = {}
  const afterById: Record<string, GizmoTransformSnapshot> = {}
  const deltaById: Record<string, GizmoTransformSnapshot> = {}
  const objectNames: Record<string, string> = {}
  const afterObjectsById = new Map(input.objectsAfter.map((object) => [object.id, object]))

  for (const beforeObject of input.objectsBefore) {
    const afterObject = afterObjectsById.get(beforeObject.id)
    if (!afterObject) continue

    const before = sceneObjectToGizmoSnapshot(beforeObject)
    const after = sceneObjectToGizmoSnapshot(afterObject)
    beforeById[beforeObject.id] = before
    afterById[beforeObject.id] = after
    objectNames[beforeObject.id] = afterObject.name ?? beforeObject.name ?? beforeObject.id
    deltaById[beforeObject.id] = {
      position: subtractVector(after.position, before.position),
      rotation: subtractVector(after.rotation, before.rotation),
      scale: subtractVector(after.scale, before.scale),
    }
  }

  const operation: GizmoTransformOperation = {
    version: 1,
    id: input.id ?? makeId('gizmo_transform'),
    projectId: input.projectId,
    sceneId: input.sceneId,
    objectIds: Object.keys(beforeById),
    objectNames,
    mode: input.mode,
    space: input.space,
    snapEnabled: input.snapEnabled,
    snapProfile: input.snapProfile ?? (input.snapEnabled ? 'gameplay-grid' : 'freeform'),
    source: input.source,
    agentId: input.agentId,
    reason: input.reason?.trim() || DEFAULT_REASON_BY_SOURCE[input.source],
    before: beforeById,
    after: afterById,
    delta: deltaById,
    evidenceRefs: [...(input.evidenceRefs ?? [])],
    validation: { ok: true, warnings: [], blockers: [] },
    rollback: {
      operationId: '',
      targetSnapshots: beforeById,
      reason: 'Restore objects to their exact pre-transform state.',
    },
    createdAt: input.createdAt ?? new Date().toISOString(),
  }

  operation.rollback.operationId = operation.id
  operation.validation = validateGizmoTransformOperation(operation)
  return operation
}

export function validateGizmoTransformOperation(operation: GizmoTransformOperation): GizmoTransformValidation {
  const warnings: string[] = []
  const blockers: string[] = []

  if (operation.objectIds.length === 0) {
    blockers.push('No transformable objects were included in the gizmo operation.')
  }

  for (const objectId of operation.objectIds) {
    const before = operation.before[objectId]
    const after = operation.after[objectId]
    const delta = operation.delta[objectId]

    if (!before || !after || !delta) {
      blockers.push(`Object ${objectId} is missing before, after, or delta transform data.`)
      continue
    }

    const vectors = [before.position, before.rotation, before.scale, after.position, after.rotation, after.scale, delta.position, delta.rotation, delta.scale]
    if (vectors.some((vector) => !isFiniteVector(vector))) {
      blockers.push(`Object ${objectId} contains a non-finite transform value.`)
    }

    if (after.scale.x <= 0 || after.scale.y <= 0 || after.scale.z <= 0) {
      blockers.push(`Object ${objectId} has an invalid non-positive scale.`)
    }

    if (magnitude(delta.position) > 10_000) {
      blockers.push(`Object ${objectId} moved beyond the safe scene transform budget.`)
    }

    if (magnitude(delta.rotation) > Math.PI * 8) {
      warnings.push(`Object ${objectId} rotated more than four full turns in one operation.`)
    }

    if (!hasChanged(delta)) {
      warnings.push(`Object ${objectId} did not materially change.`)
    }
  }

  if (operation.source === 'agent' && !operation.reason.trim()) {
    blockers.push('Agent gizmo operations must include a reason for audit and rollback review.')
  }

  if (operation.source === 'agent' && operation.evidenceRefs.length === 0) {
    warnings.push('Agent gizmo operation has no evidence references yet.')
  }

  return {
    ok: blockers.length === 0,
    warnings,
    blockers,
  }
}

export function coerceGizmoTransformOperation(input: unknown): GizmoTransformOperation | null {
  const wrapper = isRecord(input) && isRecord(input.operation) ? input.operation : input
  if (!isRecord(wrapper)) return null

  const objectIds = pickStringArray(wrapper.objectIds)
  const before = snapshotMapFromRecord(wrapper.before)
  const after = snapshotMapFromRecord(wrapper.after)
  const providedDelta = snapshotMapFromRecord(wrapper.delta)
  if (!before || !after) return null

  const delta: Record<string, GizmoTransformSnapshot> = providedDelta ?? Object.fromEntries(
    objectIds.map((objectId) => {
      const beforeSnapshot = before[objectId]
      const afterSnapshot = after[objectId]
      return [
        objectId,
        beforeSnapshot && afterSnapshot
          ? {
              position: subtractVector(afterSnapshot.position, beforeSnapshot.position),
              rotation: subtractVector(afterSnapshot.rotation, beforeSnapshot.rotation),
              scale: subtractVector(afterSnapshot.scale, beforeSnapshot.scale),
            }
          : {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 0, y: 0, z: 0 },
            },
      ]
    })
  )

  const objectNames = isRecord(wrapper.objectNames)
    ? Object.fromEntries(Object.entries(wrapper.objectNames).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    : Object.fromEntries(objectIds.map((objectId) => [objectId, objectId]))

  const operation: GizmoTransformOperation = {
    version: 1,
    id: pickString(wrapper.id, makeId('gizmo_transform')),
    projectId: pickOptionalString(wrapper.projectId),
    sceneId: pickOptionalString(wrapper.sceneId),
    objectIds,
    objectNames,
    mode: pickEnum(wrapper.mode, transformModes, 'translate'),
    space: pickEnum(wrapper.space, transformSpaces, 'world'),
    snapEnabled: pickBoolean(wrapper.snapEnabled, true),
    snapProfile: pickEnum(wrapper.snapProfile, snapProfiles, 'gameplay-grid'),
    source: pickEnum(wrapper.source, transformSources, 'user'),
    agentId: pickOptionalString(wrapper.agentId),
    reason: pickString(wrapper.reason, DEFAULT_REASON_BY_SOURCE[pickEnum(wrapper.source, transformSources, 'user')]),
    before,
    after,
    delta,
    evidenceRefs: pickStringArray(wrapper.evidenceRefs),
    validation: { ok: true, warnings: [], blockers: [] },
    rollback: {
      operationId: pickString(wrapper.id, makeId('gizmo_transform')),
      targetSnapshots: before,
      reason: 'Restore objects to their exact pre-transform state.',
    },
    createdAt: pickString(wrapper.createdAt, new Date().toISOString()),
  }

  operation.validation = validateGizmoTransformOperation(operation)
  return operation
}

export function buildRollbackGizmoTransformOperation(
  operation: GizmoTransformOperation,
  options: { id?: string; source?: GizmoTransformSource; reason?: string; createdAt?: string } = {},
): GizmoTransformOperation {
  const rollbackOperation: GizmoTransformOperation = {
    ...operation,
    id: options.id ?? makeId('gizmo_rollback'),
    source: options.source ?? operation.source,
    reason: options.reason ?? `Rollback for ${operation.id}`,
    before: operation.after,
    after: operation.before,
    delta: Object.fromEntries(
      operation.objectIds.map((objectId) => {
        const current = operation.after[objectId]
        const target = operation.before[objectId]
        return [
          objectId,
          {
            position: subtractVector(target.position, current.position),
            rotation: subtractVector(target.rotation, current.rotation),
            scale: subtractVector(target.scale, current.scale),
          },
        ]
      }),
    ),
    evidenceRefs: [...operation.evidenceRefs],
    rollback: {
      operationId: options.id ?? operation.id,
      targetSnapshots: operation.after,
      reason: 'Re-apply the transform that existed before this rollback.',
    },
    createdAt: options.createdAt ?? new Date().toISOString(),
  }

  rollbackOperation.validation = validateGizmoTransformOperation(rollbackOperation)
  return rollbackOperation
}

export function summarizeGizmoTransformOperation(operation: GizmoTransformOperation): string {
  const objectNames = operation.objectIds.map((objectId) => operation.objectNames[objectId] ?? objectId).join(', ')
  const scope = operation.sceneId ? `scene ${operation.sceneId}` : 'active scene'
  const source = operation.source === 'agent' ? 'Agent' : 'User'
  return `${source} ${operation.mode} transform on ${objectNames || 'no objects'} in ${scope}`
}
