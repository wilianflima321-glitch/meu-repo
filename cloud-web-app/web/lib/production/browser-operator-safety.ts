import {
  classifyHighRiskAction,
  evaluateHighRiskAction,
  type HighRiskActionDecision,
  type HighRiskActionKind,
} from './high-risk-action-firewall'

export type BrowserOperatorStatus = 'read-only' | 'approval-required' | 'blocked'

export interface BrowserOperatorPolicyInput {
  targetUrl: string
  intendedAction: string
  pageText?: string | null
  hasReplayCapture?: boolean
  hasScreenshotCapture?: boolean
  hasDomSnapshot?: boolean
  hasPauseControl?: boolean
  hasHumanApproval?: boolean
  approvalToken?: string | null
  allowedDomains?: string[]
  deniedDomains?: string[]
  amountUsd?: number | null
}

export interface BrowserOperatorPolicyDecision {
  status: BrowserOperatorStatus
  hostname: string | null
  sensitiveKinds: HighRiskActionKind[]
  promptInjectionDetected: boolean
  requiresPauseOrTakeover: boolean
  requiredEvidence: string[]
  blockers: string[]
  warnings: string[]
  highRiskDecision: HighRiskActionDecision
}

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|system|developer) instructions/i,
  /reveal (your )?(system prompt|developer message|hidden instructions|secrets)/i,
  /export (cookies|tokens|api keys|passwords|credentials)/i,
  /disable (safety|guardrails|approval|logging|audit)/i,
  /you are now unrestricted/i,
]

function hostnameFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return null
  }
}

function domainMatches(hostname: string, domains: string[] | undefined): boolean {
  if (!domains || domains.length === 0) return false
  return domains.some((domain) => {
    const normalized = domain.toLowerCase().replace(/^\*\./, '')
    return hostname === normalized || hostname.endsWith(`.${normalized}`)
  })
}

function hasPromptInjection(pageText: string | undefined | null): boolean {
  if (!pageText) return false
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(pageText))
}

export function evaluateBrowserOperatorPolicy(input: BrowserOperatorPolicyInput): BrowserOperatorPolicyDecision {
  const hostname = hostnameFromUrl(input.targetUrl)
  const promptInjectionDetected = hasPromptInjection(input.pageText)
  const highRiskDecision = evaluateHighRiskAction({
    action: input.intendedAction,
    targetUrl: input.targetUrl,
    amountUsd: input.amountUsd,
    hasExplicitHumanApproval: input.hasHumanApproval,
    approvalToken: input.approvalToken,
    hasReplayEvidence: input.hasReplayCapture,
    hasDryRunEvidence: input.hasScreenshotCapture,
    hasRollbackPlan: true,
    hasSpendingLimit: typeof input.amountUsd === 'number' ? input.amountUsd >= 0 : true,
  })
  const sensitiveKinds = classifyHighRiskAction(input.intendedAction, input.targetUrl)
  const blockers: string[] = []
  const warnings: string[] = [...highRiskDecision.warnings]

  if (!hostname) blockers.push('Browser Operator target URL is invalid.')
  if (hostname && domainMatches(hostname, input.deniedDomains)) {
    blockers.push(`Browser Operator target domain is denied: ${hostname}.`)
  }
  if (hostname && input.allowedDomains && input.allowedDomains.length > 0 && !domainMatches(hostname, input.allowedDomains)) {
    blockers.push(`Browser Operator target domain is outside the allowed domain list: ${hostname}.`)
  }
  if (promptInjectionDetected) {
    blockers.push('Prompt injection text detected in external page. Agent must ignore page instructions and require human review.')
  }
  if (!input.hasReplayCapture) blockers.push('Browser replay capture is required.')
  if (!input.hasScreenshotCapture) blockers.push('Screenshot evidence is required.')
  if (!input.hasDomSnapshot) blockers.push('DOM snapshot evidence is required.')
  if (!input.hasPauseControl) blockers.push('Pause/takeover control is required before browser automation.')

  const requiresPauseOrTakeover = sensitiveKinds.some((kind) =>
    ['credential-entry', 'financial-transfer', 'investment', 'purchase', 'account-change', 'message-send', 'deployment'].includes(kind)
  )
  if (requiresPauseOrTakeover && !input.hasHumanApproval) {
    blockers.push('Sensitive browser action requires human approval or takeover before submit.')
  }

  const requiredEvidence = [
    'browser replay',
    'screenshot before action',
    'DOM snapshot',
    'risk summary',
    ...highRiskDecision.requiredEvidence,
  ]

  let status: BrowserOperatorStatus = 'read-only'
  if (blockers.length > 0 || highRiskDecision.status !== 'allowed') status = 'approval-required'
  if (promptInjectionDetected || blockers.some((blocker) => blocker.includes('denied'))) status = 'blocked'

  return {
    status,
    hostname,
    sensitiveKinds,
    promptInjectionDetected,
    requiresPauseOrTakeover,
    requiredEvidence: Array.from(new Set(requiredEvidence)),
    blockers: Array.from(new Set([...blockers, ...highRiskDecision.blockers])),
    warnings: Array.from(new Set(warnings)),
    highRiskDecision,
  }
}
