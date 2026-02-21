import type {
  FullAccessScope,
  MissionDomain,
  MissionDomainSelection,
  StudioAgentRun,
  StudioSession,
  StudioTask,
} from './studio-home.types'

export function roleLabel(role: StudioTask['ownerRole']) {
  if (role === 'planner') return 'Planner'
  if (role === 'coder') return 'Coder'
  return 'Reviewer'
}

export function sanitizeStudioProjectId(value: string): string {
  const raw = String(value || '').trim()
  if (!raw) return 'default'
  const sanitized = raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return sanitized || 'default'
}

export function normalizeBudgetCap(value: number): number {
  if (!Number.isFinite(value)) return 30
  return Math.max(5, Math.min(100000, Math.round(value)))
}

export function statusTone(status: StudioTask['status']): string {
  if (status === 'done') return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
  if (status === 'error') return 'text-rose-300 border-rose-500/30 bg-rose-500/10'
  if (status === 'blocked') return 'text-amber-300 border-amber-500/30 bg-amber-500/10'
  if (status === 'planning' || status === 'building' || status === 'validating') {
    return 'text-sky-300 border-sky-500/30 bg-sky-500/10'
  }
  return 'text-slate-300 border-slate-600/40 bg-slate-700/20'
}

export function fullAccessScopeLabel(scope: FullAccessScope): string {
  if (scope === 'web_tools') return 'Web + Tools'
  if (scope === 'workspace') return 'Workspace'
  return 'Project'
}

export function missionDomainLabel(domain: MissionDomainSelection): string {
  if (domain === 'auto') return 'Auto'
  if (domain === 'games') return 'Games'
  if (domain === 'films') return 'Films'
  if (domain === 'apps') return 'Apps'
  return 'General'
}

export function domainTemplate(domain: MissionDomain): string {
  if (domain === 'games') {
    return 'Create a gameplay-ready feature with deterministic state, asset/runtime validation, and rollback-safe apply plan.'
  }
  if (domain === 'films') {
    return 'Build a render/export workflow with temporal consistency checks, preview validation, and explicit runtime limits.'
  }
  if (domain === 'apps') {
    return 'Implement a production-ready feature with multi-file dependency checks, accessibility states, and verified apply criteria.'
  }
  return 'Define a mission with explicit scope, acceptance criteria, cost cap, and deterministic validation before apply.'
}

export function runStatusTone(status: StudioAgentRun['status']): string {
  if (status === 'success') return 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10'
  if (status === 'error') return 'text-rose-200 border-rose-500/30 bg-rose-500/10'
  return 'text-sky-200 border-sky-500/30 bg-sky-500/10'
}

export function formatRunCost(cost: number): string {
  if (!Number.isFinite(cost)) return '-'
  return cost.toFixed(2)
}

export function fullAccessAllowedScopesForPlan(plan: string | null | undefined): FullAccessScope[] {
  const normalized = String(plan || '').trim().toLowerCase()
  if (normalized === 'basic') return ['project', 'workspace']
  if (normalized === 'pro' || normalized === 'studio' || normalized === 'enterprise') {
    return ['project', 'workspace', 'web_tools']
  }
  return ['project']
}

export function defaultFullAccessScope(scopes: FullAccessScope[]): FullAccessScope {
  if (scopes.includes('workspace')) return 'workspace'
  return scopes[0] || 'project'
}

export function canRunTask(
  task: StudioTask,
  sessionStatus: StudioSession['status'] | null,
  allTasks: StudioTask[]
): boolean {
  if (sessionStatus !== 'active') return false
  const runEligible =
    task.status === 'queued' ||
    task.status === 'blocked' ||
    task.status === 'error' ||
    (task.ownerRole === 'planner' && task.status === 'planning')
  if (!runEligible) return false
  if (task.ownerRole === 'coder') {
    return allTasks.some((item) => item.ownerRole === 'planner' && item.status === 'done')
  }
  if (task.ownerRole === 'reviewer') {
    return allTasks.some((item) => item.ownerRole === 'coder' && item.status === 'done')
  }
  return true
}

export function canValidateTask(task: StudioTask, sessionStatus: StudioSession['status'] | null): boolean {
  if (sessionStatus !== 'active') return false
  if (task.ownerRole !== 'reviewer') return false
  return task.status === 'done' && task.validationVerdict === 'pending'
}

export function canApplyTask(task: StudioTask, sessionStatus: StudioSession['status'] | null): boolean {
  if (sessionStatus !== 'active') return false
  if (task.ownerRole !== 'reviewer') return false
  if (task.status !== 'done') return false
  if (task.applyToken) return false
  return task.validationVerdict === 'passed'
}

export function canRollbackTask(task: StudioTask, sessionStatus: StudioSession['status'] | null): boolean {
  if (sessionStatus !== 'active') return false
  if (task.ownerRole !== 'reviewer') return false
  return Boolean(task.applyToken)
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}

export async function parseJson(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}
