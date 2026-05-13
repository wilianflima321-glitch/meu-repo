export type GizmoEliteMode = 'translate' | 'rotate' | 'scale'
export type GizmoEliteSpace = 'world' | 'local'
export type GizmoPivotMode = 'median' | 'active-object' | 'individual-origins' | 'world-origin'
export type GizmoAxisPlaneConstraint = 'free' | 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'screen'
export type GizmoOutlineMode = 'selected' | 'hovered' | 'locked' | 'conflict'

export interface GizmoEliteSnapSettings {
  enabled: boolean
  translateStep: number
  rotateStepDegrees: number
  scaleStep: number
}

export interface GizmoEliteControlState {
  mode: GizmoEliteMode
  space: GizmoEliteSpace
  pivotMode: GizmoPivotMode
  constraint: GizmoAxisPlaneConstraint
  selectedObjectIds: string[]
  activeObjectId: string | null
  snap: GizmoEliteSnapSettings
  outlineModes: GizmoOutlineMode[]
  inspectorRefreshRequired: boolean
  undoPreviewRequired: boolean
  blockers: string[]
  warnings: string[]
}

export interface GizmoEliteControlInput {
  mode: GizmoEliteMode
  space: GizmoEliteSpace
  pivotMode: GizmoPivotMode
  constraint?: GizmoAxisPlaneConstraint
  selectedObjectIds: string[]
  activeObjectId?: string | null
  snap?: Partial<GizmoEliteSnapSettings>
  lockedObjectIds?: string[]
  conflictObjectIds?: string[]
  source: 'user' | 'agent'
  evidenceRefs?: string[]
}

export interface GizmoUndoVisualPacket {
  operationId: string
  selectedObjectIds: string[]
  beforeFrameRef: string
  afterFrameRef: string
  rollbackLabel: string
  timelineLabel: string
  requiresReview: boolean
}

const DEFAULT_SNAP: GizmoEliteSnapSettings = {
  enabled: true,
  translateStep: 0.25,
  rotateStepDegrees: 15,
  scaleStep: 0.05,
}

function normalizeSelection(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).sort()
}

function isConstraintCompatible(mode: GizmoEliteMode, constraint: GizmoAxisPlaneConstraint): boolean {
  if (constraint === 'free') return true
  if (mode === 'rotate') return constraint === 'x' || constraint === 'y' || constraint === 'z' || constraint === 'screen'
  return true
}

function buildOutlineModes(input: GizmoEliteControlInput, blockers: string[]): GizmoOutlineMode[] {
  const modes = new Set<GizmoOutlineMode>(['selected'])
  if ((input.lockedObjectIds ?? []).length > 0) modes.add('locked')
  if ((input.conflictObjectIds ?? []).length > 0 || blockers.length > 0) modes.add('conflict')
  return Array.from(modes)
}

export function buildGizmoEliteControlState(input: GizmoEliteControlInput): GizmoEliteControlState {
  const selectedObjectIds = normalizeSelection(input.selectedObjectIds)
  const blockers: string[] = []
  const warnings: string[] = []
  const constraint = input.constraint ?? 'free'
  const activeObjectId = input.activeObjectId && selectedObjectIds.includes(input.activeObjectId)
    ? input.activeObjectId
    : selectedObjectIds[0] ?? null

  if (selectedObjectIds.length === 0) {
    blockers.push('No selected object is available for gizmo interaction.')
  }
  if (!isConstraintCompatible(input.mode, constraint)) {
    blockers.push(`Constraint ${constraint} is not compatible with ${input.mode} mode.`)
  }
  if (input.pivotMode === 'active-object' && !activeObjectId) {
    blockers.push('Active-object pivot requires a selected active object.')
  }
  if (input.pivotMode === 'individual-origins' && selectedObjectIds.length < 2) {
    warnings.push('Individual-origin pivot is only meaningful for multi-select operations.')
  }
  if (input.source === 'agent' && (input.evidenceRefs ?? []).length === 0) {
    blockers.push('Agent gizmo edits require before/after evidence before apply.')
  }

  const snap = { ...DEFAULT_SNAP, ...input.snap }
  if (snap.enabled && (snap.translateStep <= 0 || snap.rotateStepDegrees <= 0 || snap.scaleStep <= 0)) {
    blockers.push('Snap settings must use positive translate, rotate, and scale steps.')
  }

  return {
    mode: input.mode,
    space: input.space,
    pivotMode: input.pivotMode,
    constraint,
    selectedObjectIds,
    activeObjectId,
    snap,
    outlineModes: buildOutlineModes(input, blockers),
    inspectorRefreshRequired: true,
    undoPreviewRequired: selectedObjectIds.length > 0,
    blockers,
    warnings,
  }
}

export function canApplyGizmoEliteControl(state: GizmoEliteControlState): boolean {
  return state.blockers.length === 0 && state.selectedObjectIds.length > 0
}

export function buildGizmoUndoVisualPacket(input: {
  operationId: string
  selectedObjectIds: string[]
  beforeFrameRef?: string
  afterFrameRef?: string
  source: 'user' | 'agent'
}): GizmoUndoVisualPacket {
  const selectedObjectIds = normalizeSelection(input.selectedObjectIds)
  return {
    operationId: input.operationId,
    selectedObjectIds,
    beforeFrameRef: input.beforeFrameRef ?? `viewport:before:${input.operationId}`,
    afterFrameRef: input.afterFrameRef ?? `viewport:after:${input.operationId}`,
    rollbackLabel: `Rollback ${selectedObjectIds.length} object${selectedObjectIds.length === 1 ? '' : 's'}`,
    timelineLabel: `Gizmo operation ${input.operationId} (${selectedObjectIds.length} selected)`,
    requiresReview: input.source === 'agent' || selectedObjectIds.length > 1,
  }
}
