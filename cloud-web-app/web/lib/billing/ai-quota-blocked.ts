/**
 * Block 6H.4 — AiQuotaBlocked contract (PAYG §4.2).
 * Calm EN only — never "suspended" / "banned".
 */

export type AiQuotaErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'ULTRA_REQUIRES_WALLET'
  | 'INSUFFICIENT_WALLET'
  | 'PAYG_CAP_REACHED'
  | 'SPEND_BLOCKED'

export type AiQuotaActionType =
  | 'buy_credits'
  | 'enable_payg'
  | 'connect_byok'
  | 'upgrade'
  | 'view_usage'

export type AiQuotaAction = {
  type: AiQuotaActionType
  href: string
  label?: string
  primary?: boolean
  requiresSpendCap?: boolean
  held?: boolean
}

export type AiQuotaBlockedResponse = {
  error: AiQuotaErrorCode | string
  message: string
  pools?: {
    fast?: { used: number; limit: number; usdEquivalent?: number }
    premiumRaw?: { used: number; limit: number; usdEquivalent?: number }
    weightedAudit?: { used: number; limit: number }
  }
  wallet?: { available: number; currency: 'credits'; usdEquivalent?: number }
  payg?: { enabled: boolean; accruedUsd: number; capUsd: number | null }
  actions: AiQuotaAction[]
  ideLocked: false
}

/** Binding CTA order (PAYG §4.2) */
export const AI_QUOTA_CTA_ORDER: AiQuotaActionType[] = [
  'buy_credits',
  'enable_payg',
  'connect_byok',
  'upgrade',
  'view_usage',
]

const DEFAULT_HREFS: Record<AiQuotaActionType, string> = {
  buy_credits: '/billing?tab=credits',
  enable_payg: '/billing?tab=payg',
  connect_byok: '/settings?tab=byok',
  upgrade: '/pricing',
  view_usage: '/billing?tab=usage',
}

const DEFAULT_LABELS: Record<AiQuotaActionType, string> = {
  buy_credits: 'Buy AI credits',
  enable_payg: 'Enable PAYG with spend cap',
  connect_byok: 'Connect BYOK',
  upgrade: 'Upgrade plan',
  view_usage: 'View usage',
}

const BLOCK_CODES = new Set([
  'QUOTA_EXCEEDED',
  'ULTRA_REQUIRES_WALLET',
  'INSUFFICIENT_WALLET',
  'PAYG_CAP_REACHED',
  'SPEND_BLOCKED',
  'INSUFFICIENT_CREDITS',
])

export function isAiQuotaBlockCode(code: unknown): boolean {
  return typeof code === 'string' && BLOCK_CODES.has(code)
}

export function calmQuotaMessage(raw?: string): string {
  const text = String(raw || '').trim()
  const lower = text.toLowerCase()
  if (!text || lower.includes('suspended') || lower.includes('banned')) {
    return 'AI quota reached for this month. The IDE stays open — choose how to continue AI.'
  }
  return text
}

export function sortQuotaActions(actions: AiQuotaAction[]): AiQuotaAction[] {
  return [...actions].sort((a, b) => {
    const ia = AI_QUOTA_CTA_ORDER.indexOf(a.type)
    const ib = AI_QUOTA_CTA_ORDER.indexOf(b.type)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
}

type SpendSessionCta = {
  id?: string
  type?: string
  label?: string
  href?: string
  held?: boolean
  primary?: boolean
}

/**
 * Normalize spend-session 402 JSON (`ctas`) or §4.2 (`actions`) into AiQuotaBlockedResponse.
 */
export function normalizeAiQuotaBlocked(raw: unknown): AiQuotaBlockedResponse | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const error = String(body.error || '')
  if (!isAiQuotaBlockCode(error) && body.ideLocked !== false && !Array.isArray(body.ctas) && !Array.isArray(body.actions)) {
    return null
  }
  if (!isAiQuotaBlockCode(error) && !Array.isArray(body.ctas) && !Array.isArray(body.actions)) {
    return null
  }

  const fromCtas = Array.isArray(body.ctas) ? (body.ctas as SpendSessionCta[]) : []
  const fromActions = Array.isArray(body.actions) ? (body.actions as SpendSessionCta[]) : []
  const merged = [...fromActions, ...fromCtas]

  const actions: AiQuotaAction[] = merged
    .map((c) => {
      const id = String(c.type || c.id || '')
      const type = (AI_QUOTA_CTA_ORDER.includes(id as AiQuotaActionType)
        ? id
        : mapLegacyCtaId(id)) as AiQuotaActionType | null
      if (!type) return null
      return {
        type,
        href: c.href || DEFAULT_HREFS[type],
        label: c.label || DEFAULT_LABELS[type],
        primary: Boolean(c.primary) || type === 'buy_credits',
        held: Boolean(c.held),
        requiresSpendCap: type === 'enable_payg',
      } satisfies AiQuotaAction
    })
    .filter((a): a is NonNullable<typeof a> => Boolean(a))

  const ensured =
    actions.length > 0
      ? actions
      : AI_QUOTA_CTA_ORDER.filter((t) => t !== 'view_usage').map((type) => ({
          type,
          href: DEFAULT_HREFS[type],
          label: DEFAULT_LABELS[type],
          primary: type === 'buy_credits',
          requiresSpendCap: type === 'enable_payg',
        }))

  return {
    error,
    message: calmQuotaMessage(typeof body.message === 'string' ? body.message : undefined),
    pools: body.pools as AiQuotaBlockedResponse['pools'],
    wallet: body.wallet as AiQuotaBlockedResponse['wallet'],
    payg: body.payg as AiQuotaBlockedResponse['payg'],
    actions: sortQuotaActions(ensured),
    ideLocked: false,
  }
}

function mapLegacyCtaId(id: string): AiQuotaActionType | null {
  switch (id) {
    case 'buy_credits':
    case 'enable_payg':
    case 'connect_byok':
    case 'upgrade':
    case 'view_usage':
      return id
    default:
      return null
  }
}
