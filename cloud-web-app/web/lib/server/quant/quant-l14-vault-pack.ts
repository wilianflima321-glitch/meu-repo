/**
 * SF4 — Quant L.14 project vault pack (domain isolation deepen).
 * Finance sealed vault ≠ game MultiSurface pack; refuse cross-domain surface merge.
 * Firecracker / Forge sandbox still HELD at OS isolation layer.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  assertFinanceDomainIsolated,
  createFinanceProjectVault,
  createGameProjectScope,
  type FinanceProjectVault,
  type GameProjectScope,
} from '@/lib/server/quant/finance-domain-vault'
import type { ContextChunk, MultiSurfaceKind } from '@/lib/production/multi-surface-context-pack'

const log = createComponentLogger('quant-l14-vault-pack')

export type QuantVaultSurfaceKind = 'finance-vault' | 'market-pattern' | 'audit-trail' | 'risk'

export interface QuantL14VaultPack {
  projectId: string
  vaultId: string
  sealedYjsScope: string
  domain: 'finance'
  tokenBudget: number
  tokenCount: number
  activeSurfaces: QuantVaultSurfaceKind[]
  /** Never include game MultiSurfaceKind in finance pack */
  forbiddenGameSurfaces: MultiSurfaceKind[]
  vaultChunks: ContextChunk[]
  marketPatternRefs: string[]
  auditTrailRef: string | null
  riskEnvelopeRef: string | null
  forgeSandboxOsIsolation: false
  firecrackerReady: false
  investmentGrade: false
}

export type QuantVaultPackRejectCode =
  | 'cross_domain_merge'
  | 'game_surface_in_finance'
  | 'invalid_vault'
  | 'budget_exceeded'

export type QuantVaultPackResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: QuantVaultPackRejectCode; message: string }

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

const FORBIDDEN_GAME_SURFACES: MultiSurfaceKind[] = ['code', 'scene', 'dom', 'terminal', 'validation']

/**
 * Build a finance-only L.14-style pack sealed to N1 vault scope.
 */
export function buildQuantL14VaultPack(input: {
  vault: FinanceProjectVault
  tokenBudget?: number
  vaultChunks?: ContextChunk[]
  marketPatternRefs?: string[]
  auditTrailRef?: string | null
  riskEnvelopeRef?: string | null
  /** If provided, assert isolation against this game scope */
  gameScope?: GameProjectScope
  /** Attempt to smuggle game surfaces — must fail */
  attemptedGameSurfaces?: MultiSurfaceKind[]
}): QuantVaultPackResult<QuantL14VaultPack> {
  const vault = input.vault
  if (!vault || vault.domain !== 'finance' || !vault.vaultId || !vault.sealedYjsScope) {
    return { ok: false, code: 'invalid_vault', message: 'N1 finance vault required for SF4 pack' }
  }

  if (input.gameScope) {
    const isolated = assertFinanceDomainIsolated(vault, input.gameScope)
    if (!isolated.ok) {
      return {
        ok: false,
        code: 'cross_domain_merge',
        message: isolated.message,
      }
    }
  }

  const attempted = input.attemptedGameSurfaces ?? []
  if (attempted.some((s) => FORBIDDEN_GAME_SURFACES.includes(s))) {
    return {
      ok: false,
      code: 'game_surface_in_finance',
      message: 'game MultiSurface kinds cannot enter quant L.14 vault pack',
    }
  }

  const tokenBudget = input.tokenBudget ?? 1500
  const vaultChunks = (input.vaultChunks ?? []).map((c) => ({
    ...c,
    tokenEstimate: c.tokenEstimate || estimateTokens(c.content),
  }))
  const marketPatternRefs = input.marketPatternRefs ?? []
  const activeSurfaces: QuantVaultSurfaceKind[] = ['finance-vault']
  if (marketPatternRefs.length > 0) activeSurfaces.push('market-pattern')
  if (input.auditTrailRef) activeSurfaces.push('audit-trail')
  if (input.riskEnvelopeRef) activeSurfaces.push('risk')

  let tokenCount = vaultChunks.reduce((acc, c) => acc + c.tokenEstimate, 0)
  tokenCount += marketPatternRefs.join(',').length > 0 ? estimateTokens(marketPatternRefs.join(',')) : 0
  if (input.auditTrailRef) tokenCount += estimateTokens(input.auditTrailRef)
  if (input.riskEnvelopeRef) tokenCount += estimateTokens(input.riskEnvelopeRef)

  if (tokenCount > tokenBudget) {
    return {
      ok: false,
      code: 'budget_exceeded',
      message: `quant vault pack tokenCount ${tokenCount} exceeds budget ${tokenBudget}`,
    }
  }

  const pack: QuantL14VaultPack = {
    projectId: vault.projectId,
    vaultId: vault.vaultId,
    sealedYjsScope: vault.sealedYjsScope,
    domain: 'finance',
    tokenBudget,
    tokenCount,
    activeSurfaces,
    forbiddenGameSurfaces: [...FORBIDDEN_GAME_SURFACES],
    vaultChunks,
    marketPatternRefs,
    auditTrailRef: input.auditTrailRef ?? null,
    riskEnvelopeRef: input.riskEnvelopeRef ?? null,
    forgeSandboxOsIsolation: false,
    firecrackerReady: false,
    investmentGrade: false,
  }

  log.info('quant_l14_vault_pack_built', {
    projectId: pack.projectId,
    vaultId: pack.vaultId,
    surfaces: pack.activeSurfaces,
    tokenCount: pack.tokenCount,
  })
  return { ok: true, value: pack }
}

export function probeQuantL14VaultPackReadiness(): {
  id: 'SF4'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  path: string
  note: string
  firecrackerReady: false
  investmentGrade: false
} {
  const vault = createFinanceProjectVault({ projectId: 'sf4-probe', strategyCapitalUsd: 100 })
  const game = createGameProjectScope('sf4-probe-game')
  const okPack = buildQuantL14VaultPack({
    vault,
    gameScope: game,
    marketPatternRefs: ['market-pattern://PROBE/1d'],
    auditTrailRef: 'n3:probe',
    riskEnvelopeRef: 'n5:probe',
    vaultChunks: [
      {
        path: `finance:vault:${vault.vaultId}`,
        content: 'strategy capital sealed; Hub Coins excluded',
        tokenEstimate: 12,
      },
    ],
  })
  const rejectGame = buildQuantL14VaultPack({
    vault,
    attemptedGameSurfaces: ['scene'],
  })
  const ready =
    okPack.ok &&
    okPack.value.domain === 'finance' &&
    okPack.value.firecrackerReady === false &&
    okPack.value.investmentGrade === false &&
    !rejectGame.ok &&
    rejectGame.code === 'game_surface_in_finance'

  return {
    id: 'SF4',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    path: 'lib/server/quant/quant-l14-vault-pack.ts',
    note: ready
      ? 'L.14 finance vault pack sealed vs game surfaces; Forge OS / Firecracker isolation still HELD.'
      : 'SF4 quant L.14 vault pack probe failed.',
    firecrackerReady: false,
    investmentGrade: false,
  }
}
