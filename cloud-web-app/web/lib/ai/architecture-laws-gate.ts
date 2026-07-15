/**
 * Decision #58 — Architecture Laws Gate
 * No agent write without Laws pack + cartography + context pack.
 */

export type ArchitectureContextMissing =
  | 'laws_pack'
  | 'cartography'
  | 'context_pack'
  | 'project_memory'

export interface ArchitectureLawsGateInput {
  projectId: string
  lawsPackId?: string
  cartographyManifestId?: string
  contextPackId?: string
  projectMemoryDigestId?: string
  /** Write intents require full pack; read-only may skip memory */
  intent: 'read' | 'write' | 'apply'
}

export interface ArchitectureLawsGateResult {
  verdict: 'PASS' | 'BLOCK'
  code: 'OK' | 'ARCHITECTURE_CONTEXT_REQUIRED'
  missing: ArchitectureContextMissing[]
  message: string
}

export function evaluateArchitectureLawsGate(
  input: ArchitectureLawsGateInput,
): ArchitectureLawsGateResult {
  const missing: ArchitectureContextMissing[] = []

  if (!input.lawsPackId) missing.push('laws_pack')
  if (!input.cartographyManifestId) missing.push('cartography')
  if (!input.contextPackId) missing.push('context_pack')

  if (input.intent === 'write' || input.intent === 'apply') {
    if (!input.projectMemoryDigestId) missing.push('project_memory')
  }

  if (missing.length > 0) {
    return {
      verdict: 'BLOCK',
      code: 'ARCHITECTURE_CONTEXT_REQUIRED',
      missing,
      message: `Agent ${input.intent} blocked — missing: ${missing.join(', ')}`,
    }
  }

  return {
    verdict: 'PASS',
    code: 'OK',
    missing: [],
    message: 'Architecture context complete',
  }
}
