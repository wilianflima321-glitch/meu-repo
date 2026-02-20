'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const PreviewPanel = dynamic(() => import('@/components/ide/PreviewPanel'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-900/50" />,
})
const AIChatPanelContainer = dynamic(() => import('@/components/ide/AIChatPanelContainer'), {
  ssr: false,
  loading: () => <div className="h-52 w-full animate-pulse rounded bg-slate-900/50" />,
})
const AGENT_WORKSPACE_STORAGE_KEY = 'aethel_studio_home_agent_workspace'
const PREVIEW_RUNTIME_STORAGE_KEY = 'aethel_studio_home_runtime_preview'
const STUDIO_SESSION_STORAGE_KEY = 'aethel_studio_home_session_id'
type FullAccessScope = 'project' | 'workspace' | 'web_tools'
type MissionDomain = 'games' | 'films' | 'apps' | 'general'
type MissionDomainSelection = MissionDomain | 'auto'

type StudioTask = {
  id: string
  title: string
  ownerRole: 'planner' | 'coder' | 'reviewer'
  status: 'queued' | 'planning' | 'building' | 'validating' | 'blocked' | 'done' | 'error'
  estimateCredits: number
  estimateSeconds: number
  result?: string
  validationVerdict: 'pending' | 'passed' | 'failed'
  applyToken?: string
}

type StudioMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  agentRole?: 'planner' | 'coder' | 'reviewer'
  content: string
  timestamp: string
  status?: string
}

type FullAccessGrant = {
  id: string
  scope: FullAccessScope
  expiresAt: string
  revokedAt?: string
}

type StudioAgentRun = {
  id: string
  taskId: string
  role: 'planner' | 'coder' | 'reviewer'
  model: string
  status: 'running' | 'success' | 'error'
  tokensIn: number
  tokensOut: number
  latencyMs: number
  cost: number
  startedAt: string
  finishedAt?: string
  message: string
}

type StudioSession = {
  id: string
  projectId: string
  mission: string
  missionDomain?: 'games' | 'films' | 'apps' | 'general'
  qualityMode: 'standard' | 'delivery' | 'studio'
  qualityChecklist?: string[]
  status: 'active' | 'stopped' | 'completed'
  tasks: StudioTask[]
  agentRuns: StudioAgentRun[]
  messages: StudioMessage[]
  orchestration?: {
    mode: 'serial' | 'parallel_wave'
    conversationPolicy: 'peer_review'
    applyPolicy: 'serial_after_validation'
    lastWaveAt?: string
  }
  fullAccessGrants: FullAccessGrant[]
  cost: {
    estimatedCredits: number
    usedCredits: number
    budgetCap: number
    remainingCredits: number
  }
}

type WalletSummary = {
  balance: number
  currency: string
}

type UsageSummary = {
  plan: string
  usage: { tokens: { used: number; limit: number; remaining: number; percentUsed: number } }
  usageEntitlement?: {
    creditBalance: number
    variableUsageAllowed: boolean
    blockedReason: string | null
  }
}

function roleLabel(role: StudioTask['ownerRole']) {
  if (role === 'planner') return 'Planner'
  if (role === 'coder') return 'Coder'
  return 'Reviewer'
}

function statusTone(status: StudioTask['status']): string {
  if (status === 'done') return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
  if (status === 'error') return 'text-rose-300 border-rose-500/30 bg-rose-500/10'
  if (status === 'blocked') return 'text-amber-300 border-amber-500/30 bg-amber-500/10'
  if (status === 'planning' || status === 'building' || status === 'validating') {
    return 'text-sky-300 border-sky-500/30 bg-sky-500/10'
  }
  return 'text-slate-300 border-slate-600/40 bg-slate-700/20'
}

function fullAccessScopeLabel(scope: FullAccessScope): string {
  if (scope === 'web_tools') return 'Web + Tools'
  if (scope === 'workspace') return 'Workspace'
  return 'Project'
}

function missionDomainLabel(domain: MissionDomainSelection): string {
  if (domain === 'auto') return 'Auto'
  if (domain === 'games') return 'Games'
  if (domain === 'films') return 'Films'
  if (domain === 'apps') return 'Apps'
  return 'General'
}

function domainTemplate(domain: MissionDomain): string {
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

function runStatusTone(status: StudioAgentRun['status']): string {
  if (status === 'success') return 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10'
  if (status === 'error') return 'text-rose-200 border-rose-500/30 bg-rose-500/10'
  return 'text-sky-200 border-sky-500/30 bg-sky-500/10'
}

function fullAccessAllowedScopesForPlan(plan: string | null | undefined): FullAccessScope[] {
  const normalized = String(plan || '').trim().toLowerCase()
  if (normalized === 'basic') return ['project', 'workspace']
  if (normalized === 'pro' || normalized === 'studio' || normalized === 'enterprise') {
    return ['project', 'workspace', 'web_tools']
  }
  return ['project']
}

function defaultFullAccessScope(scopes: FullAccessScope[]): FullAccessScope {
  if (scopes.includes('workspace')) return 'workspace'
  return scopes[0] || 'project'
}

function canRunTask(
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

function canValidateTask(task: StudioTask, sessionStatus: StudioSession['status'] | null): boolean {
  if (sessionStatus !== 'active') return false
  if (task.ownerRole !== 'reviewer') return false
  return task.status === 'done' && task.validationVerdict === 'pending'
}

function canApplyTask(task: StudioTask, sessionStatus: StudioSession['status'] | null): boolean {
  if (sessionStatus !== 'active') return false
  if (task.ownerRole !== 'reviewer') return false
  if (task.status !== 'done') return false
  if (task.applyToken) return false
  return task.validationVerdict === 'passed'
}

function canRollbackTask(task: StudioTask, sessionStatus: StudioSession['status'] | null): boolean {
  if (sessionStatus !== 'active') return false
  if (task.ownerRole !== 'reviewer') return false
  return Boolean(task.applyToken)
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}

async function parseJson(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

export default function StudioHome() {
  const router = useRouter()
  const [mission, setMission] = useState('')
  const [missionDomainSelection, setMissionDomainSelection] = useState<MissionDomainSelection>('auto')
  const [projectId, setProjectId] = useState('default')
  const [budgetCap, setBudgetCap] = useState(30)
  const [qualityMode, setQualityMode] = useState<'standard' | 'delivery' | 'studio'>('studio')
  const [showAgentWorkspace, setShowAgentWorkspace] = useState(false)
  const [showRuntimePreview, setShowRuntimePreview] = useState(false)
  const [session, setSession] = useState<StudioSession | null>(null)
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionBootstrapped, setSessionBootstrapped] = useState(false)
  const [fullAccessScope, setFullAccessScope] = useState<FullAccessScope>('workspace')
  const trimmedMission = useMemo(() => mission.trim(), [mission])
  const selectedMissionDomain = missionDomainSelection === 'auto' ? undefined : missionDomainSelection
  const recentAgentRuns = useMemo(() => (session?.agentRuns || []).slice(-6).reverse(), [session?.agentRuns])

  const activeGrant = useMemo(
    () =>
      session?.fullAccessGrants.find((item) => {
        if (item.revokedAt) return false
        return new Date(item.expiresAt).getTime() > Date.now()
      }) ?? null,
    [session]
  )

  const selectedTask = session?.tasks[session.tasks.length - 1] || null
  const variableUsageBlocked = Boolean(usage?.usageEntitlement && !usage.usageEntitlement.variableUsageAllowed)
  const allowedFullAccessScopes = useMemo(
    () => fullAccessAllowedScopesForPlan(usage?.plan),
    [usage?.plan]
  )

  const previewContent = useMemo(() => {
    if (selectedTask?.result) return `# ${selectedTask.title}\n\n${selectedTask.result}`
    if (mission.trim()) return `# Mission\n\n${mission.trim()}`
    return '# Studio Home\n\nCreate a mission to generate a super plan.'
  }, [selectedTask, mission])

  const taskProgress = useMemo(() => {
    const tasks = session?.tasks || []
    const total = tasks.length
    const done = tasks.filter((task) => task.status === 'done').length
    const blocked = tasks.filter((task) => task.status === 'blocked').length
    const failed = tasks.filter((task) => task.status === 'error').length
    const active = tasks.filter((task) =>
      task.status === 'planning' || task.status === 'building' || task.status === 'validating'
    ).length
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    return { total, done, blocked, failed, active, percent }
  }, [session?.tasks])

  const budgetProgress = useMemo(() => {
    const cap = Number(session?.cost.budgetCap ?? budgetCap)
    const used = Number(session?.cost.usedCredits ?? 0)
    const safeCap = cap > 0 ? cap : 1
    const percent = Math.max(0, Math.min(100, Math.round((used / safeCap) * 100)))
    const pressure = percent >= 90 ? 'critical' : percent >= 70 ? 'high' : percent >= 50 ? 'medium' : 'normal'
    return { percent, pressure }
  }, [session?.cost.budgetCap, session?.cost.usedCredits, budgetCap])

  const loadOps = useCallback(async () => {
    const [walletRes, usageRes] = await Promise.allSettled([
      fetch('/api/wallet/summary', { cache: 'no-store' }),
      fetch('/api/usage/status', { cache: 'no-store' }),
    ])

    if (walletRes.status === 'fulfilled' && walletRes.value.ok) {
      const data = await parseJson(walletRes.value)
      setWallet({ balance: Number(data.balance || 0), currency: String(data.currency || 'credits') })
    }
    if (usageRes.status === 'fulfilled' && usageRes.value.ok) {
      const data = await parseJson(usageRes.value)
      setUsage(data.data || null)
    }
  }, [])

  const withAction = useCallback(async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setToast(null)
    try {
      await action()
      await loadOps()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.')
    } finally {
      setBusy(false)
    }
  }, [loadOps])

  useEffect(() => {
    void loadOps()
  }, [loadOps])

  useEffect(() => {
    const persisted = window.localStorage.getItem(AGENT_WORKSPACE_STORAGE_KEY)
    if (persisted === '1') setShowAgentWorkspace(true)
    const previewPersisted = window.localStorage.getItem(PREVIEW_RUNTIME_STORAGE_KEY)
    if (previewPersisted === '1') setShowRuntimePreview(true)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(AGENT_WORKSPACE_STORAGE_KEY, showAgentWorkspace ? '1' : '0')
  }, [showAgentWorkspace])

  useEffect(() => {
    window.localStorage.setItem(PREVIEW_RUNTIME_STORAGE_KEY, showRuntimePreview ? '1' : '0')
  }, [showRuntimePreview])

  useEffect(() => {
    if (!session?.id || session.status !== 'active') {
      window.localStorage.removeItem(STUDIO_SESSION_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STUDIO_SESSION_STORAGE_KEY, session.id)
  }, [session?.id, session?.status])

  useEffect(() => {
    if (activeGrant) return
    if (allowedFullAccessScopes.includes(fullAccessScope)) return
    setFullAccessScope(defaultFullAccessScope(allowedFullAccessScopes))
  }, [activeGrant, allowedFullAccessScopes, fullAccessScope])

  useEffect(() => {
    if (!session?.missionDomain) return
    setMissionDomainSelection(session.missionDomain)
  }, [session?.missionDomain])

  const requireSessionId = useCallback(() => {
    if (!session?.id) throw new Error('Start a studio session first.')
    return session.id
  }, [session?.id])

  const startSessionAction = useCallback(async () => {
    await withAction(async () => {
      const res = await fetch('/api/studio/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission: trimmedMission,
          missionDomain: selectedMissionDomain,
          projectId,
          qualityMode,
          budgetCap,
        }),
      })
      const data = await parseJson(res)
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to start session.')
      setSession(data.session as StudioSession)
      setToast('Studio session started.')
    })
  }, [withAction, trimmedMission, selectedMissionDomain, projectId, qualityMode, budgetCap])

  const startSession = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      await startSessionAction()
    },
    [startSessionAction]
  )

  const refreshSession = useCallback(
    async (sessionId: string) => {
      const res = await fetch(`/api/studio/session/${sessionId}`, { cache: 'no-store' })
      const data = await parseJson(res)
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to refresh session.')
      setSession(data.session as StudioSession)
    },
    []
  )

  useEffect(() => {
    if (!session?.id || session.status !== 'active' || busy) return
    const interval = window.setInterval(() => {
      void refreshSession(session.id).catch(() => {})
    }, 8000)
    return () => window.clearInterval(interval)
  }, [session?.id, session?.status, busy, refreshSession])

  useEffect(() => {
    if (sessionBootstrapped) return
    const restore = async () => {
      const persistedSessionId = window.localStorage.getItem(STUDIO_SESSION_STORAGE_KEY)?.trim()
      if (!persistedSessionId) {
        setSessionBootstrapped(true)
        return
      }
      try {
        await refreshSession(persistedSessionId)
        setToast('Resumed latest Studio session.')
      } catch {
        window.localStorage.removeItem(STUDIO_SESSION_STORAGE_KEY)
      } finally {
        setSessionBootstrapped(true)
      }
    }
    void restore()
  }, [sessionBootstrapped, refreshSession])

  const createSuperPlan = useCallback(async () => {
    await withAction(async () => {
      const sessionId = requireSessionId()
      const res = await fetch('/api/studio/tasks/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, force: false }),
      })
      const data = await parseJson(res)
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to generate super plan.')
      setSession(data.session as StudioSession)
      setToast('Super plan generated.')
    })
  }, [withAction, requireSessionId])

  const runWave = useCallback(async () => {
    await withAction(async () => {
      const sessionId = requireSessionId()
      const res = await fetch('/api/studio/tasks/run-wave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, maxSteps: 3 }),
      })
      const data = await parseJson(res)
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to run wave.')
      setSession(data.session as StudioSession)
      const executed = Array.isArray(data?.metadata?.executedTaskIds) ? data.metadata.executedTaskIds.length : 0
      setToast(`Wave executed with ${executed} completed step(s).`)
    })
  }, [withAction, requireSessionId])

  const runTask = useCallback(
    async (taskId: string) => {
      await withAction(async () => {
        const sessionId = requireSessionId()
        const res = await fetch(`/api/studio/tasks/${taskId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const data = await parseJson(res)
        if (!res.ok) throw new Error(data.message || data.error || 'Failed to run task.')
        setSession(data.session as StudioSession)
        setToast('Task executed.')
      })
    },
    [withAction, requireSessionId]
  )

  const validateTask = useCallback(
    async (taskId: string) => {
      await withAction(async () => {
        const sessionId = requireSessionId()
        const res = await fetch(`/api/studio/tasks/${taskId}/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const data = await parseJson(res)
        if (!res.ok) throw new Error(data.message || data.error || 'Validation failed.')
        setSession(data.session as StudioSession)
        setToast('Validation passed.')
      })
    },
    [withAction, requireSessionId]
  )

  const applyTask = useCallback(
    async (taskId: string) => {
      await withAction(async () => {
        const sessionId = requireSessionId()
        const res = await fetch(`/api/studio/tasks/${taskId}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const data = await parseJson(res)
        if (!res.ok) throw new Error(data.message || data.error || 'Apply failed.')
        setSession(data.session as StudioSession)
        setToast(`Apply completed${data.applyToken ? ` (${data.applyToken})` : ''}.`)
      })
    },
    [withAction, requireSessionId]
  )

  const rollbackTask = useCallback(
    async (taskId: string, applyToken?: string) => {
      await withAction(async () => {
        const sessionId = requireSessionId()
        const res = await fetch(`/api/studio/tasks/${taskId}/rollback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, applyToken }),
        })
        const data = await parseJson(res)
        if (!res.ok) throw new Error(data.message || data.error || 'Rollback failed.')
        setSession(data.session as StudioSession)
        setToast('Rollback completed.')
      })
    },
    [withAction, requireSessionId]
  )

  const stopSession = useCallback(async () => {
    await withAction(async () => {
      const sessionId = requireSessionId()
      const res = await fetch(`/api/studio/session/${sessionId}/stop`, { method: 'POST' })
      const data = await parseJson(res)
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to stop session.')
      setSession(data.session as StudioSession)
      setToast('Session stopped.')
    })
  }, [withAction, requireSessionId])

  const toggleFullAccess = useCallback(async () => {
    await withAction(async () => {
      const sessionId = requireSessionId()
      if (activeGrant) {
        const res = await fetch(`/api/studio/access/full/${activeGrant.id}?sessionId=${encodeURIComponent(sessionId)}`, {
          method: 'DELETE',
        })
        const data = await parseJson(res)
        if (!res.ok) throw new Error(data.message || data.error || 'Failed to revoke full access.')
        setSession(data.session as StudioSession)
        setToast('Full Access revoked.')
        return
      }
      const res = await fetch('/api/studio/access/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, scope: fullAccessScope }),
      })
      const data = await parseJson(res)
      if (!res.ok) {
        const suggestedScopes = Array.isArray(data?.metadata?.allowedScopes)
          ? (data.metadata.allowedScopes as FullAccessScope[])
          : []
        if (suggestedScopes.length > 0) {
          const normalized = defaultFullAccessScope(suggestedScopes)
          setFullAccessScope(normalized)
          const readable = suggestedScopes.map(fullAccessScopeLabel).join(', ')
          throw new Error(`${data.message || 'Scope is not allowed for current plan.'} Allowed: ${readable}.`)
        }
        throw new Error(data.message || data.error || 'Failed to enable full access.')
      }
      setSession(data.session as StudioSession)
      const ttlMinutes = Number(data?.metadata?.ttlMinutes || 0)
      const grantedScope = (data?.metadata?.scope || fullAccessScope) as FullAccessScope
      setToast(
        ttlMinutes > 0
          ? `Full Access enabled: ${fullAccessScopeLabel(grantedScope)} (${ttlMinutes}m).`
          : `Full Access enabled: ${fullAccessScopeLabel(grantedScope)}.`
      )
    })
  }, [withAction, requireSessionId, activeGrant, fullAccessScope])

  const openIde = useCallback(() => {
    const nextProjectId = (session?.projectId || projectId || 'default').trim() || 'default'
    const params = new URLSearchParams()
    params.set('projectId', nextProjectId)
    params.set('entry', 'ai')
    if (session?.id) params.set('sessionId', session.id)
    if (selectedTask?.id) params.set('taskId', selectedTask.id)
    router.push(`/ide?${params.toString()}`)
  }, [router, session?.projectId, session?.id, projectId, selectedTask?.id])

  const copySessionLink = useCallback(async () => {
    if (!session?.id) return
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('sessionId', session.id)
      await navigator.clipboard.writeText(url.toString())
      setError(null)
      setToast('Session link copied.')
    } catch {
      setError('Failed to copy session link.')
    }
  }, [session?.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      const key = event.key.toLowerCase()
      const typing = isTypingTarget(event.target)

      if (key === 'i') {
        event.preventDefault()
        openIde()
        return
      }

      if (key === ',') {
        event.preventDefault()
        router.push('/settings')
        return
      }

      if (key === 'enter') {
        if (!trimmedMission || busy || variableUsageBlocked) return
        if (session?.id) return
        if (!typing || event.target instanceof HTMLTextAreaElement) {
          event.preventDefault()
          void startSessionAction()
        }
        return
      }

      if (typing) return

      if (event.shiftKey && key === 'r') {
        event.preventDefault()
        if (
          session &&
          session.status === 'active' &&
          !busy &&
          !variableUsageBlocked &&
          session.tasks.length > 0 &&
          !session.tasks.every((task) => task.status === 'done')
        ) {
          void runWave()
        }
        return
      }

      if (event.shiftKey && key === 'p') {
        event.preventDefault()
        if (
          session &&
          session.status === 'active' &&
          !busy &&
          !variableUsageBlocked &&
          session.tasks.length === 0
        ) {
          void createSuperPlan()
        }
        return
      }

      if (key === '.') {
        event.preventDefault()
        if (session && session.status === 'active' && !busy) {
          void stopSession()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    router,
    openIde,
    trimmedMission,
    busy,
    variableUsageBlocked,
    session,
    startSessionAction,
    runWave,
    createSuperPlan,
    stopSession,
  ])

  if (!sessionBootstrapped) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-[1600px] items-center justify-center px-4 py-4">
          <div className="rounded border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
            Restoring Studio Home session...
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900/60 px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Studio Home</h1>
            <p className="text-xs text-slate-400">
              Chat/preview-first mission control with deterministic apply/rollback and full handoff to IDE.
            </p>
            {session && (
              <div className="mt-2 inline-flex items-center rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300">
                Session {session.status.toUpperCase()} - {session.id.slice(0, 8)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {busy && (
              <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-200">
                Running...
              </span>
            )}
            <button
              onClick={openIde}
              className="rounded border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              Open IDE
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="rounded border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Settings
            </button>
            <button
              onClick={() =>
                router.push(`/project-settings?projectId=${encodeURIComponent(session?.projectId || projectId || 'default')}`)
              }
              className="rounded border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Project Settings
            </button>
            <button
              onClick={() => {
                void copySessionLink()
              }}
              disabled={!session}
              className="rounded border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Copy Session Link
            </button>
            <button
              onClick={() => router.push('/dashboard?legacy=1')}
              className="rounded border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Legacy dashboard
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(420px,1fr)_460px]">
          <section className="space-y-4">
            <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Mission</div>
              <form onSubmit={startSession} className="space-y-3">
                <label className="sr-only" htmlFor="studio-mission">
                  Mission description
                </label>
                <textarea
                  id="studio-mission"
                  value={mission}
                  onChange={(event) => setMission(event.target.value)}
                  placeholder="Describe mission: what to build, quality target, constraints, and expected output."
                  required
                  className="h-32 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="sr-only" htmlFor="studio-project-id">
                    Project id
                  </label>
                  <input
                    id="studio-project-id"
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    placeholder="projectId"
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  <label className="sr-only" htmlFor="studio-budget-cap">
                    Budget cap
                  </label>
                  <input
                    id="studio-budget-cap"
                    value={budgetCap}
                    onChange={(event) => setBudgetCap(Number(event.target.value))}
                    type="number"
                    min={5}
                    max={100000}
                    step={1}
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400" htmlFor="mission-domain">
                    Mission domain
                  </label>
                  <select
                    id="mission-domain"
                    value={missionDomainSelection}
                    onChange={(event) => setMissionDomainSelection(event.target.value as MissionDomainSelection)}
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="auto">auto</option>
                    <option value="games">games</option>
                    <option value="films">films</option>
                    <option value="apps">apps</option>
                    <option value="general">general</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400" htmlFor="quality-mode">
                    Quality mode
                  </label>
                  <select
                    id="quality-mode"
                    value={qualityMode}
                    onChange={(event) => setQualityMode(event.target.value as 'standard' | 'delivery' | 'studio')}
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="standard">standard</option>
                    <option value="delivery">delivery</option>
                    <option value="studio">studio</option>
                  </select>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 px-2 py-2">
                  <div className="mb-1 text-[11px] text-slate-500">Quick mission presets</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['games', 'films', 'apps', 'general'] as MissionDomain[]).map((domain) => (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => {
                          setMissionDomainSelection(domain)
                          if (!trimmedMission) setMission(domainTemplate(domain))
                        }}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {missionDomainLabel(domain)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Domain strategy: {missionDomainLabel(missionDomainSelection)}.{' '}
                    {missionDomainSelection === 'auto'
                      ? 'The backend infers domain from mission text.'
                      : 'Domain is locked for this session to keep checklist and validation aligned.'}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy || variableUsageBlocked || !trimmedMission}
                  className="w-full rounded border border-blue-500/40 bg-blue-500/20 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-500/30 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Start Studio Session
                </button>
                <div className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-500">
                  Shortcuts: <code>Ctrl/Cmd+Enter</code> start session, <code>Ctrl/Cmd+Shift+P</code> super plan,{' '}
                  <code>Ctrl/Cmd+Shift+R</code> run wave, <code>Ctrl/Cmd+.</code> stop, <code>Ctrl/Cmd+I</code> open
                  IDE, <code>Ctrl/Cmd+,</code> settings.
                </div>
              </form>
              {session?.missionDomain && (
                <div className="mt-3 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-300">
                  <div className="font-semibold uppercase tracking-wide text-slate-400">
                    Domain: {session.missionDomain}
                  </div>
                  <div className="mt-1 text-slate-400">Quality checklist</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-300">
                    {(session.qualityChecklist || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Task Board</div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={
                      !session ||
                      busy ||
                      session.status !== 'active' ||
                      variableUsageBlocked ||
                      session.tasks.length > 0
                    }
                    onClick={createSuperPlan}
                    className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    Super Plan
                  </button>
                  <button
                    disabled={
                      !session ||
                      busy ||
                      session.status !== 'active' ||
                      variableUsageBlocked ||
                      session.tasks.length === 0 ||
                      session.tasks.every((task) => task.status === 'done')
                    }
                    onClick={runWave}
                    className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    Run Wave
                  </button>
                </div>
              </div>
              {taskProgress.total > 0 && (
                <div className="mb-2 rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-400">
                  <div className="mb-1 flex items-center justify-between">
                    <span>
                      Progress: {taskProgress.done}/{taskProgress.total} ({taskProgress.percent}%)
                    </span>
                    <span>
                      active {taskProgress.active} | blocked {taskProgress.blocked} | failed {taskProgress.failed}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-slate-800">
                    <div
                      className="h-full bg-sky-500 transition-all"
                      style={{ width: `${taskProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
              {session?.tasks.length ? (
                <div className="mb-2 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-400">
                  Super plan already created for this session. Complete or stop this session before opening a new plan.
                </div>
              ) : null}
              <div className="mb-2 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-500">
                Validation/apply/rollback are restricted to reviewer checkpoints.
              </div>
              {session?.orchestration ? (
                <div className="mb-2 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-400">
                  Orchestration: {session.orchestration.mode} | policy: {session.orchestration.applyPolicy}
                  {session.orchestration.lastWaveAt
                    ? ` | last wave: ${new Date(session.orchestration.lastWaveAt).toLocaleTimeString()}`
                    : ''}
                </div>
              ) : null}
              {session?.tasks.length && session.tasks.every((task) => task.status === 'done') ? (
                <div className="mb-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200">
                  Wave execution complete. Validate/apply reviewer checkpoint or start a new mission.
                </div>
              ) : null}
              <div className="space-y-2">
                {(session?.tasks || []).map((task) => (
                  <div key={task.id} className={`rounded border px-3 py-2 text-xs ${statusTone(task.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-100">{task.title}</div>
                      <div className="text-[10px] uppercase tracking-wide">{task.status}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300">
                      {roleLabel(task.ownerRole)} | {task.estimateCredits} credits | {task.estimateSeconds}s | verdict:{' '}
                      {task.validationVerdict}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <button
                        disabled={
                          busy ||
                          !session ||
                          variableUsageBlocked ||
                          !canRunTask(task, session.status, session.tasks)
                        }
                        onClick={() => runTask(task.id)}
                        className="rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                      >
                        Run
                      </button>
                      <button
                        disabled={busy || !session || !canValidateTask(task, session.status)}
                        onClick={() => validateTask(task.id)}
                        className="rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                      >
                        Validate
                      </button>
                      <button
                        disabled={busy || !session || !canApplyTask(task, session.status)}
                        onClick={() => applyTask(task.id)}
                        className="rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                      >
                        Apply
                      </button>
                      <button
                        disabled={busy || !session || !canRollbackTask(task, session.status)}
                        onClick={() => rollbackTask(task.id, task.applyToken)}
                        className="rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                      >
                        Rollback
                      </button>
                    </div>
                  </div>
                ))}
                {!session?.tasks?.length && (
                  <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-500">
                    No tasks yet. Start session and generate Super Plan.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Team Chat Live</div>
              <div className="mb-2 flex items-center justify-end">
                <button
                  onClick={() => setShowAgentWorkspace((prev) => !prev)}
                  className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  {showAgentWorkspace ? 'Hide Agent Workspace' : 'Open Agent Workspace'}
                </button>
              </div>
              <div aria-live="polite" className="max-h-64 space-y-2 overflow-auto pr-1">
                {(session?.messages || []).map((message) => (
                  <div key={message.id} className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs">
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span>
                        {message.role}
                        {message.agentRole ? `/${message.agentRole}` : ''}
                      </span>
                      <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-slate-200">{message.content}</p>
                  </div>
                ))}
                {!session?.messages?.length && (
                  <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-500">
                    Session messages will appear here.
                  </div>
                )}
              </div>
              <div className="mt-3 rounded border border-slate-800 bg-slate-950 px-2 py-2">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Agent Runs
                </div>
                <div className="space-y-1">
                  {recentAgentRuns.map((run) => (
                    <div
                      key={run.id}
                      className={`rounded border px-2 py-1 text-[11px] ${runStatusTone(run.status)}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-slate-100">
                        <span>
                          {roleLabel(run.role)} · {run.model}
                        </span>
                        <span>{run.latencyMs}ms</span>
                      </div>
                      <div className="text-slate-300">
                        tokens {run.tokensIn}/{run.tokensOut} · cost {run.cost}
                      </div>
                    </div>
                  ))}
                  {recentAgentRuns.length === 0 && (
                    <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-500">
                      No agent runs yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showAgentWorkspace ? (
              <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                <AIChatPanelContainer />
              </div>
            ) : (
              <div className="rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
                Agent workspace is collapsed to keep the home surface responsive. Use the button above when you need
                deep chat actions.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="overflow-hidden rounded border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Interactive Preview</div>
                <button
                  onClick={() => setShowRuntimePreview((prev) => !prev)}
                  className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  {showRuntimePreview ? 'Use Lite Preview' : 'Enable Runtime Preview'}
                </button>
              </div>
              {showRuntimePreview ? (
                <div className="h-[460px]">
                  <PreviewPanel
                    title="Interactive Preview"
                    filePath="studio-home.md"
                    content={previewContent}
                    projectId={session?.projectId || projectId}
                    isStale={Boolean(session?.status === 'stopped')}
                    onRefresh={() => {
                      if (session?.id) {
                        void withAction(async () => refreshSession(session.id))
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="h-[460px] overflow-auto p-3">
                  <pre className="whitespace-pre-wrap text-xs leading-5 text-slate-300">{previewContent}</pre>
                </div>
              )}
            </div>

            <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Ops Bar</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
                  <div className="text-slate-500">Plan</div>
                  <div className="font-semibold text-slate-100">{usage?.plan || '-'}</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
                  <div className="text-slate-500">Wallet</div>
                  <div className="font-semibold text-slate-100">
                    {wallet ? `${wallet.balance.toLocaleString()} ${wallet.currency}` : '-'}
                  </div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
                  <div className="text-slate-500">Budget cap</div>
                  <div className="font-semibold text-slate-100">{session?.cost.budgetCap ?? budgetCap}</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
                  <div className="text-slate-500">Used credits</div>
                  <div className="font-semibold text-slate-100">{session?.cost.usedCredits ?? 0}</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
                  <div className="text-slate-500">Remaining credits</div>
                  <div className="font-semibold text-slate-100">{session?.cost.remainingCredits ?? '-'}</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
                  <div className="text-slate-500">Cost pressure</div>
                  <div className="font-semibold text-slate-100">
                    {session && session.cost.budgetCap > 0 && session.cost.remainingCredits / session.cost.budgetCap <= 0.3
                      ? 'high'
                      : 'normal'}
                  </div>
                </div>
              </div>
              <div className="mt-2 rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-400">
                <div className="mb-1 flex items-center justify-between">
                  <span>Budget usage: {budgetProgress.percent}%</span>
                  <span>
                    {budgetProgress.pressure === 'critical'
                      ? 'critical'
                      : budgetProgress.pressure === 'high'
                        ? 'high'
                        : budgetProgress.pressure === 'medium'
                          ? 'medium'
                          : 'normal'}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded bg-slate-800">
                  <div
                    className={`h-full transition-all ${
                      budgetProgress.pressure === 'critical'
                        ? 'bg-rose-500'
                        : budgetProgress.pressure === 'high'
                          ? 'bg-amber-500'
                          : budgetProgress.pressure === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-emerald-500'
                    }`}
                    style={{ width: `${budgetProgress.percent}%` }}
                  />
                </div>
              </div>
              {budgetProgress.pressure === 'critical' && (
                <div className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
                  Budget is almost exhausted. Finish validation/apply now or stop session to prevent forced blocking.
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={!session || busy || session.status !== 'active'}
                  onClick={stopSession}
                  className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  Stop
                </button>
                <button
                  disabled={!session || busy || session.status !== 'active'}
                  onClick={toggleFullAccess}
                  className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {activeGrant ? 'Revoke Full Access' : `Full Access (${fullAccessScopeLabel(fullAccessScope)})`}
                </button>
                <label className="sr-only" htmlFor="studio-full-access-scope">
                  Full access scope
                </label>
                <select
                  id="studio-full-access-scope"
                  value={fullAccessScope}
                  onChange={(event) => setFullAccessScope(event.target.value as FullAccessScope)}
                  disabled={!session || busy || session.status !== 'active' || Boolean(activeGrant)}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-40"
                >
                  <option value="project">Project</option>
                  <option value="workspace" disabled={!allowedFullAccessScopes.includes('workspace')}>
                    Workspace
                  </option>
                  <option value="web_tools" disabled={!allowedFullAccessScopes.includes('web_tools')}>
                    Web + Tools
                  </option>
                </select>
              </div>
              {activeGrant && (
                <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                  Active grant: {fullAccessScopeLabel(activeGrant.scope)} until{' '}
                  {new Date(activeGrant.expiresAt).toLocaleTimeString()}
                </div>
              )}
              <div className="mt-2 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-400">
                Allowed scopes for current plan: {allowedFullAccessScopes.map(fullAccessScopeLabel).join(', ')}.
              </div>
              <div className="mt-2 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-400">
                Note: Studio Home apply/rollback controls manage mission checkpoints. File-level patch apply remains in
                `/ide` deterministic flows.
              </div>
              {usage?.usageEntitlement && !usage.usageEntitlement.variableUsageAllowed && (
                <div className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
                  Variable AI usage is blocked (
                  <code>{usage.usageEntitlement.blockedReason || 'CREDITS_EXHAUSTED'}</code>).
                  Premium interface features remain active until cycle end.
                </div>
              )}
            </div>
          </section>
        </div>

        {(toast || error) && (
          <div aria-live="polite" className="fixed bottom-4 right-4 z-40 max-w-xl space-y-2">
            {toast && (
              <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                {toast}
              </div>
            )}
            {error && (
              <div className="rounded border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
