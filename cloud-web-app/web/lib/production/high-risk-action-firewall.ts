export type HighRiskActionKind =
  | 'investment'
  | 'financial-transfer'
  | 'purchase'
  | 'legal'
  | 'medical'
  | 'account-change'
  | 'credential-entry'
  | 'message-send'
  | 'deployment'
  | 'destructive-change'
  | 'external-publish'

export type HighRiskActionStatus = 'allowed' | 'held-for-approval' | 'blocked'

export interface HighRiskActionInput {
  action: string
  targetUrl?: string | null
  amountUsd?: number | null
  hasExplicitHumanApproval?: boolean
  hasDryRunEvidence?: boolean
  hasReplayEvidence?: boolean
  hasRollbackPlan?: boolean
  hasSpendingLimit?: boolean
  approvalToken?: string | null
}

export interface HighRiskActionDecision {
  status: HighRiskActionStatus
  kinds: HighRiskActionKind[]
  riskScore: number
  requiredApprovals: string[]
  requiredEvidence: string[]
  blockers: string[]
  warnings: string[]
  safeMode: 'read-only' | 'simulate-only' | 'approved-submit'
}

const INVESTMENT_PATTERN = /\b(invest|investment|trade|trading|stock|stocks|share|shares|crypto|bitcoin|ethereum|forex|option|futures|portfolio|brokerage|buy\s+\$|sell\s+\$)\b/i
const TRANSFER_PATTERN = /\b(transfer|wire|withdraw|deposit|bank|pix|ach|iban|routing|send\s+money|payment)\b/i
const PURCHASE_PATTERN = /\b(buy|purchase|checkout|subscribe|upgrade|order|cart|pay now|billing)\b/i
const LEGAL_PATTERN = /\b(contract|lawsuit|legal|attorney|terms|compliance filing|tax filing)\b/i
const MEDICAL_PATTERN = /\b(diagnose|prescription|medical|health insurance|doctor|patient)\b/i
const ACCOUNT_PATTERN = /\b(change password|delete account|close account|change email|2fa|mfa|security settings|admin settings)\b/i
const CREDENTIAL_PATTERN = /\b(login|sign in|password|otp|secret|api key|token|credential|passkey)\b/i
const MESSAGE_PATTERN = /\b(send message|send email|post tweet|publish post|reply to|dm |slack|teams|gmail|outlook)\b/i
const DEPLOY_PATTERN = /\b(deploy|promote production|release to prod|dns|domain|rollback production|publish site)\b/i
const DESTRUCTIVE_PATTERN = /\b(delete|destroy|reset|drop table|truncate|remove all|wipe|revoke|cancel subscription)\b/i
const PUBLISH_PATTERN = /\b(publish|submit|upload public|make public|marketplace listing|app store)\b/i

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function normalize(value: string | undefined | null): string {
  return value?.trim() ?? ''
}

export function classifyHighRiskAction(action: string, targetUrl?: string | null): HighRiskActionKind[] {
  const text = `${normalize(action)} ${normalize(targetUrl)}`
  const kinds: HighRiskActionKind[] = []

  if (INVESTMENT_PATTERN.test(text)) kinds.push('investment')
  if (TRANSFER_PATTERN.test(text)) kinds.push('financial-transfer')
  if (PURCHASE_PATTERN.test(text)) kinds.push('purchase')
  if (LEGAL_PATTERN.test(text)) kinds.push('legal')
  if (MEDICAL_PATTERN.test(text)) kinds.push('medical')
  if (ACCOUNT_PATTERN.test(text)) kinds.push('account-change')
  if (CREDENTIAL_PATTERN.test(text)) kinds.push('credential-entry')
  if (MESSAGE_PATTERN.test(text)) kinds.push('message-send')
  if (DEPLOY_PATTERN.test(text)) kinds.push('deployment')
  if (DESTRUCTIVE_PATTERN.test(text)) kinds.push('destructive-change')
  if (PUBLISH_PATTERN.test(text)) kinds.push('external-publish')

  return unique(kinds)
}

function approvalForKind(kind: HighRiskActionKind): string {
  switch (kind) {
    case 'investment':
      return 'signed human approval with asset, quantity, price/limit, account, and max loss stated'
    case 'financial-transfer':
      return 'explicit human approval with recipient, amount, currency, and account stated'
    case 'purchase':
      return 'explicit human approval with merchant, item, total cost, and refund risk stated'
    case 'credential-entry':
      return 'human takeover or one-time approval for this exact login session'
    case 'account-change':
      return 'explicit approval for this account setting change'
    case 'deployment':
      return 'release approval plus rollback owner'
    case 'destructive-change':
      return 'destructive-action approval plus backup/rollback evidence'
    case 'message-send':
      return 'approval of final outbound text and recipient'
    case 'external-publish':
      return 'approval of final public artifact and destination'
    case 'legal':
      return 'human legal review approval'
    case 'medical':
      return 'human medical/professional review approval'
  }
}

function evidenceForKind(kind: HighRiskActionKind): string[] {
  switch (kind) {
    case 'investment':
      return ['dry-run order preview', 'risk disclosure', 'current quote timestamp', 'human signed confirmation']
    case 'financial-transfer':
      return ['recipient verification screenshot', 'amount confirmation screenshot', 'human signed confirmation']
    case 'purchase':
      return ['checkout summary screenshot', 'total cost', 'refund/cancellation summary']
    case 'credential-entry':
      return ['browser replay', 'redacted login target', 'pause/takeover marker']
    case 'account-change':
      return ['before/after setting summary', 'browser replay', 'rollback or recovery path']
    case 'deployment':
      return ['build/test evidence', 'deploy preview', 'rollback plan']
    case 'destructive-change':
      return ['backup evidence', 'diff/impact summary', 'rollback plan']
    case 'message-send':
      return ['final text preview', 'recipient identity evidence']
    case 'external-publish':
      return ['public preview', 'license/provenance check', 'rollback/unpublish path']
    case 'legal':
      return ['source citations', 'human legal review']
    case 'medical':
      return ['source citations', 'human professional review']
  }
}

export function evaluateHighRiskAction(input: HighRiskActionInput): HighRiskActionDecision {
  const kinds = classifyHighRiskAction(input.action, input.targetUrl)
  const requiredApprovals = unique(kinds.map(approvalForKind))
  const requiredEvidence = unique(kinds.flatMap(evidenceForKind))
  const blockers: string[] = []
  const warnings: string[] = []

  if (kinds.length === 0) {
    return {
      status: 'allowed',
      kinds,
      riskScore: 0,
      requiredApprovals: [],
      requiredEvidence: ['mission ledger note'],
      blockers: [],
      warnings: [],
      safeMode: 'approved-submit',
    }
  }

  if (!input.hasExplicitHumanApproval || !input.approvalToken) {
    blockers.push('High-risk action requires explicit human approval before submit.')
  }
  if (!input.hasReplayEvidence && kinds.some((kind) => ['credential-entry', 'purchase', 'financial-transfer', 'investment', 'account-change'].includes(kind))) {
    blockers.push('Browser replay evidence is required for account, payment, investment, and credential actions.')
  }
  if (!input.hasDryRunEvidence && kinds.some((kind) => ['investment', 'financial-transfer', 'purchase', 'deployment', 'destructive-change'].includes(kind))) {
    blockers.push('Dry-run or preview evidence is required before committing this action.')
  }
  if (!input.hasRollbackPlan && kinds.some((kind) => ['deployment', 'destructive-change', 'account-change', 'external-publish'].includes(kind))) {
    blockers.push('Rollback or recovery plan is required before committing this action.')
  }
  if ((input.amountUsd ?? 0) > 0 && !input.hasSpendingLimit) {
    blockers.push('A spending limit must be recorded before submitting a paid or investment action.')
  }

  if (kinds.includes('legal')) warnings.push('Agent may summarize and cite legal sources, but must not provide final legal judgment.')
  if (kinds.includes('medical')) warnings.push('Agent may organize evidence, but must not provide diagnosis or treatment decisions.')
  if (kinds.includes('investment')) warnings.push('Agent must not independently choose investments or execute trades without signed human confirmation.')

  const riskScore = Math.min(100, 20 + kinds.length * 15 + (input.amountUsd ? 20 : 0))
  const status: HighRiskActionStatus = blockers.length > 0 ? 'held-for-approval' : 'allowed'

  return {
    status,
    kinds,
    riskScore,
    requiredApprovals,
    requiredEvidence,
    blockers,
    warnings,
    safeMode: status === 'allowed' ? 'approved-submit' : 'simulate-only',
  }
}
