/**
 * N1 — Finance project domain + L.14 vault isolation.
 * Fail-closed: strategy capital, Hub Coins, and AI BYOK credits never mix.
 */

import { createHash, randomUUID } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('finance-domain-vault')

export type ProjectDomainKind = 'game' | 'finance'

/** Distinct capital pools — never interchangeable at runtime. */
export type CapitalPoolKind = 'strategy_capital' | 'hub_coins' | 'ai_byok_credits'

export type FinanceVaultIsolationErrorCode =
  | 'cross_domain_scope_merge'
  | 'capital_pool_mix'
  | 'hub_coins_in_finance_vault'
  | 'ai_byok_in_finance_vault'
  | 'invalid_domain'

export type FinanceVaultResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: FinanceVaultIsolationErrorCode; message: string }

export interface FinanceProjectVault {
  projectId: string
  domain: 'finance'
  vaultId: string
  /** Sealed Yjs scope — must never alias a game project scope. */
  sealedYjsScope: string
  strategyCapitalUsd: number
  /** Exchange secret ref (Blind Brain target) — not LLM BYOK. */
  exchangeKeyRef: string | null
  createdAt: string
}

export interface GameProjectScope {
  projectId: string
  domain: 'game'
  yjsScope: string
}

export interface CreateFinanceVaultInput {
  projectId: string
  strategyCapitalUsd: number
  exchangeKeyRef?: string | null
  now?: string
}

const FINANCE_SCOPE_PREFIX = 'finance:vault:'
const GAME_SCOPE_PREFIX = 'game:yjs:'

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

export function financeSealedYjsScope(projectId: string, vaultId: string): string {
  return `${FINANCE_SCOPE_PREFIX}${projectId}:${vaultId}`
}

export function gameYjsScope(projectId: string): string {
  return `${GAME_SCOPE_PREFIX}${projectId}`
}

export function createFinanceProjectVault(input: CreateFinanceVaultInput): FinanceProjectVault {
  const vaultId = randomUUID()
  const createdAt = input.now ?? new Date().toISOString()
  const vault: FinanceProjectVault = {
    projectId: input.projectId,
    domain: 'finance',
    vaultId,
    sealedYjsScope: financeSealedYjsScope(input.projectId, vaultId),
    strategyCapitalUsd: input.strategyCapitalUsd,
    exchangeKeyRef: input.exchangeKeyRef ?? null,
    createdAt,
  }
  log.info('finance_vault_created', {
    projectId: vault.projectId,
    vaultId: vault.vaultId,
    scope: vault.sealedYjsScope,
  })
  return vault
}

export function createGameProjectScope(projectId: string): GameProjectScope {
  return {
    projectId,
    domain: 'game',
    yjsScope: gameYjsScope(projectId),
  }
}

/** Fail-closed — finance and game Yjs scopes must never alias or merge. */
export function assertFinanceDomainIsolated(
  finance: FinanceProjectVault,
  game: GameProjectScope,
): FinanceVaultResult<{ isolated: true }> {
  if (finance.domain !== 'finance' || game.domain !== 'game') {
    return { ok: false, code: 'invalid_domain', message: 'domain kind mismatch' }
  }
  if (finance.projectId === game.projectId && finance.sealedYjsScope === game.yjsScope) {
    return {
      ok: false,
      code: 'cross_domain_scope_merge',
      message: 'finance vault scope must not alias game Yjs scope',
    }
  }
  if (finance.sealedYjsScope.startsWith(GAME_SCOPE_PREFIX)) {
    return {
      ok: false,
      code: 'cross_domain_scope_merge',
      message: 'finance vault scope carries game prefix',
    }
  }
  if (game.yjsScope.startsWith(FINANCE_SCOPE_PREFIX)) {
    return {
      ok: false,
      code: 'cross_domain_scope_merge',
      message: 'game scope carries finance vault prefix',
    }
  }
  return { ok: true, value: { isolated: true } }
}

export function rejectCrossDomainCapitalMix(
  source: CapitalPoolKind,
  target: CapitalPoolKind,
): FinanceVaultResult<{ allowed: false } | { allowed: true; fingerprint: string }> {
  if (source !== target) {
    return {
      ok: false,
      code: 'capital_pool_mix',
      message: `capital pool ${source} cannot fund or settle ${target}`,
    }
  }
  return { ok: true, value: { allowed: true, fingerprint: digest(`${source}:${target}`) } }
}

export function assertStrategyCapitalNotHubCoins(
  pool: CapitalPoolKind,
): FinanceVaultResult<{ pool: 'strategy_capital' }> {
  if (pool === 'hub_coins') {
    return {
      ok: false,
      code: 'hub_coins_in_finance_vault',
      message: 'Hub Aethel Coins (H.0 HELD) must not back strategy capital',
    }
  }
  if (pool !== 'strategy_capital') {
    return {
      ok: false,
      code: 'capital_pool_mix',
      message: `expected strategy_capital pool, got ${pool}`,
    }
  }
  return { ok: true, value: { pool: 'strategy_capital' } }
}

export function assertStrategyCapitalNotAiByok(
  pool: CapitalPoolKind,
): FinanceVaultResult<{ pool: 'strategy_capital' }> {
  if (pool === 'ai_byok_credits') {
    return {
      ok: false,
      code: 'ai_byok_in_finance_vault',
      message: 'Law XVI AI BYOK credits must not settle broker margin or PnL',
    }
  }
  if (pool !== 'strategy_capital') {
    return {
      ok: false,
      code: 'capital_pool_mix',
      message: `expected strategy_capital pool, got ${pool}`,
    }
  }
  return { ok: true, value: { pool: 'strategy_capital' } }
}

export function financeVaultFingerprint(vault: FinanceProjectVault): string {
  return digest(
    `${vault.projectId}|${vault.vaultId}|${vault.sealedYjsScope}|${vault.strategyCapitalUsd}`,
  )
}
