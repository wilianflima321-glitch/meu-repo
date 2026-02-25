export type StudioFullAccessScope = 'project' | 'workspace' | 'web_tools'

export type StudioActionClass =
  | 'project_read'
  | 'project_write'
  | 'workspace_read'
  | 'workspace_write'
  | 'workspace_command'
  | 'web_navigation'
  | 'web_form_submit'
  | 'deploy_release'
  | 'domain_dns_change'
  | 'account_link'
  | 'financial_transaction'
  | 'account_security_change'
  | 'credential_export'

export type StudioFullAccessPolicy = {
  scope: StudioFullAccessScope
  plan: string
  allowedActionClasses: StudioActionClass[]
  manualConfirmActionClasses: StudioActionClass[]
  blockedActionClasses: StudioActionClass[]
  notes: string[]
}

const ALL_ACTION_CLASSES: StudioActionClass[] = [
  'project_read',
  'project_write',
  'workspace_read',
  'workspace_write',
  'workspace_command',
  'web_navigation',
  'web_form_submit',
  'deploy_release',
  'domain_dns_change',
  'account_link',
  'financial_transaction',
  'account_security_change',
  'credential_export',
]

const ALWAYS_BLOCKED: StudioActionClass[] = [
  'financial_transaction',
  'account_security_change',
  'credential_export',
]

function normalizePlan(plan: string | null | undefined): string {
  const normalized = String(plan || '').trim().toLowerCase()
  return normalized || 'starter_trial'
}

export function listStudioActionClasses(): StudioActionClass[] {
  return [...ALL_ACTION_CLASSES]
}

export function resolveStudioActionClass(value: unknown): StudioActionClass | null {
  const raw = String(value || '').trim() as StudioActionClass
  return ALL_ACTION_CLASSES.includes(raw) ? raw : null
}

export function getStudioFullAccessPolicy(
  scope: StudioFullAccessScope,
  plan: string | null | undefined
): StudioFullAccessPolicy {
  const normalizedPlan = normalizePlan(plan)
  const isEnterprise = normalizedPlan === 'enterprise'

  const allowedBase: StudioActionClass[] = ['project_read', 'project_write']
  const manualConfirmBase: StudioActionClass[] = []

  if (scope === 'workspace' || scope === 'web_tools') {
    allowedBase.push('workspace_read', 'workspace_write', 'workspace_command')
    manualConfirmBase.push('workspace_command')
  }

  if (scope === 'web_tools') {
    allowedBase.push('web_navigation', 'web_form_submit', 'account_link', 'deploy_release', 'domain_dns_change')
    manualConfirmBase.push('web_form_submit', 'deploy_release', 'domain_dns_change')
  }

  // Keep DNS mutation restricted to enterprise until explicit policy promotion.
  const blockedByPlan: StudioActionClass[] = []
  if (!isEnterprise) {
    blockedByPlan.push('domain_dns_change')
  }

  const blocked = Array.from(new Set([...ALWAYS_BLOCKED, ...blockedByPlan]))
  const allowed = allowedBase.filter((item) => !blocked.includes(item))
  const manualConfirm = manualConfirmBase.filter((item) => allowed.includes(item))

  return {
    scope,
    plan: normalizedPlan,
    allowedActionClasses: allowed,
    manualConfirmActionClasses: manualConfirm,
    blockedActionClasses: blocked,
    notes: [
      'Nenhuma acao financeira automatica e permitida por Full Access.',
      'Mudancas sensiveis exigem confirmacao manual explicita por sessao.',
      'Acoes bloqueadas retornam erro explicito sem fallback oculto.',
    ],
  }
}

export function evaluateStudioActionPolicy(
  policy: StudioFullAccessPolicy,
  actionClass: StudioActionClass
): {
  allowed: boolean
  blocked: boolean
  manualConfirmRequired: boolean
} {
  const blocked = policy.blockedActionClasses.includes(actionClass)
  if (blocked) {
    return { allowed: false, blocked: true, manualConfirmRequired: false }
  }
  const allowed = policy.allowedActionClasses.includes(actionClass)
  const manualConfirmRequired = allowed && policy.manualConfirmActionClasses.includes(actionClass)
  return { allowed, blocked: false, manualConfirmRequired }
}
