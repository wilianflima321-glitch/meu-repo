/**
 * L.14 MultiSurfaceContextPack — modular surfaces (game / web DOM / terminal)
 * Pack builder enables only active surfaces; unused slices omitted.
 */

export type MultiSurfaceKind = 'code' | 'scene' | 'dom' | 'terminal' | 'validation'

export interface ContextChunk {
  path: string
  startLine?: number
  endLine?: number
  content: string
  tokenEstimate: number
}

export interface MultiSurfaceContextPack {
  projectId: string
  repositoryManifestId?: string
  codeChunks: ContextChunk[]
  repoGraphSlice?: { symbol: string; callers: string[]; callees: string[] }
  sceneSelection?: string[]
  visualScriptGraphRef?: string
  terrainChunkRef?: string
  capabilityScore?: number
  previewDomSnapshot?: string
  previewConsoleErrors?: string[]
  terminalTail?: string
  lastValidationGate?: {
    verdict: 'PASS' | 'FAIL'
    summary: string
  }
  tokenBudget: number
  tokenCount: number
  activeSurfaces: MultiSurfaceKind[]
  /**
   * Onda K ambient — critical AmbientEmotionDelta slice only.
   * Live wire (az): populate only via `buildAmbientApexMoAPort` after CostGuard suppressor allow.
   * Never stream 60Hz CSI into the pack (token + COGS leak).
   */
  ambientCriticalDelta?: {
    label: 'calm' | 'stressed' | 'panicked' | 'absent'
    confidence: number
    source: string
    physiologyHeld: true
  }
}

export type WorkspaceSurfaceMode = 'game-3d' | 'web-react' | 'server-cli' | 'mixed'

export interface BuildMultiSurfacePackInput {
  projectId: string
  mode: WorkspaceSurfaceMode
  tokenBudget: number
  codeChunks?: ContextChunk[]
  repoGraphSlice?: MultiSurfaceContextPack['repoGraphSlice']
  sceneSelection?: string[]
  visualScriptGraphRef?: string
  terrainChunkRef?: string
  capabilityScore?: number
  previewDomSnapshot?: string
  previewConsoleErrors?: string[]
  terminalTail?: string
  lastValidationGate?: MultiSurfaceContextPack['lastValidationGate']
  repositoryManifestId?: string
  /** Critical ambient only — never 60Hz CSI stream */
  ambientCriticalDelta?: MultiSurfaceContextPack['ambientCriticalDelta']
}

const DEFAULT_BUDGETS: Record<WorkspaceSurfaceMode, number> = {
  'game-3d': 3000,
  'web-react': 2000,
  'server-cli': 1500,
  mixed: 2500,
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

function surfacesForMode(mode: WorkspaceSurfaceMode): MultiSurfaceKind[] {
  switch (mode) {
    case 'game-3d':
      return ['code', 'scene', 'validation']
    case 'web-react':
      return ['code', 'dom', 'validation']
    case 'server-cli':
      return ['code', 'terminal', 'validation']
    case 'mixed':
      return ['code', 'scene', 'dom', 'terminal', 'validation']
  }
}

/**
 * Build pack with hard tokenBudget truncate. Omits inactive surface fields entirely.
 */
export function buildMultiSurfaceContextPack(input: BuildMultiSurfacePackInput): MultiSurfaceContextPack {
  const tokenBudget = input.tokenBudget > 0 ? input.tokenBudget : DEFAULT_BUDGETS[input.mode]
  const activeSurfaces = surfacesForMode(input.mode)

  const pack: MultiSurfaceContextPack = {
    projectId: input.projectId,
    codeChunks: [],
    tokenBudget,
    tokenCount: 0,
    activeSurfaces,
    repositoryManifestId: input.repositoryManifestId,
  }

  let used = 0
  const take = (text: string): boolean => {
    const t = estimateTokens(text)
    if (used + t > tokenBudget) return false
    used += t
    return true
  }

  if (activeSurfaces.includes('code') && input.codeChunks?.length) {
    for (const chunk of input.codeChunks) {
      const est = chunk.tokenEstimate || estimateTokens(chunk.content)
      if (used + est > tokenBudget) break
      pack.codeChunks.push({ ...chunk, tokenEstimate: est })
      used += est
    }
  }

  if (input.repoGraphSlice && take(JSON.stringify(input.repoGraphSlice))) {
    pack.repoGraphSlice = input.repoGraphSlice
  }

  if (activeSurfaces.includes('scene')) {
    if (input.sceneSelection?.length && take(input.sceneSelection.join(','))) {
      pack.sceneSelection = input.sceneSelection
    }
    if (input.visualScriptGraphRef && take(input.visualScriptGraphRef)) {
      pack.visualScriptGraphRef = input.visualScriptGraphRef
    }
    if (input.terrainChunkRef && take(input.terrainChunkRef)) {
      pack.terrainChunkRef = input.terrainChunkRef
    }
    if (typeof input.capabilityScore === 'number') {
      pack.capabilityScore = input.capabilityScore
    }
  }

  if (activeSurfaces.includes('dom')) {
    if (input.previewDomSnapshot && take(input.previewDomSnapshot)) {
      pack.previewDomSnapshot = input.previewDomSnapshot
    }
    if (input.previewConsoleErrors?.length && take(input.previewConsoleErrors.join('\n'))) {
      pack.previewConsoleErrors = input.previewConsoleErrors
    }
  }

  if (activeSurfaces.includes('terminal') && input.terminalTail && take(input.terminalTail)) {
    pack.terminalTail = input.terminalTail
  }

  if (activeSurfaces.includes('validation') && input.lastValidationGate) {
    pack.lastValidationGate = input.lastValidationGate
    used += 8
  }


  // Onda K ambient — critical slice only (suppressor-gated upstream)
  if (input.ambientCriticalDelta) {
    const ambientText = JSON.stringify(input.ambientCriticalDelta)
    if (take(ambientText)) {
      pack.ambientCriticalDelta = input.ambientCriticalDelta
    }
  }

  pack.tokenCount = used
  if (pack.tokenCount > pack.tokenBudget) {
    throw new Error('MultiSurfaceContextPack exceeded tokenBudget after build')
  }
  return pack
}

export function assertPackWithinBudget(pack: MultiSurfaceContextPack): void {
  if (pack.tokenCount > pack.tokenBudget) {
    throw new Error(`Pack tokenCount ${pack.tokenCount} > budget ${pack.tokenBudget}`)
  }
}
