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
  scope: 'project' | 'workspace' | 'web_tools'
  expiresAt: string
  revokedAt?: string
}

type StudioSession = {
  id: string
  projectId: string
  mission: string
  qualityMode: 'standard' | 'delivery' | 'studio'
  status: 'active' | 'stopped' | 'completed'
  tasks: StudioTask[]
  messages: StudioMessage[]
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

function canRunTask(
  task: StudioTask,
  sessionStatus: StudioSession['status'] | null,
  allTasks: StudioTask[]
): boolean {
  if (sessionStatus !== 'active') return false
  if (!(task.status === 'queued' || task.status === 'blocked' || task.status === 'error')) return false
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
  return task.status === 'done' && task.validationVerdict === 'pending'
}

function canApplyTask(task: StudioTask, sessionStatus: StudioSession['status'] | null): boolean {
  if (sessionStatus !== 'active') return false
  if (task.applyToken) return false
  return task.validationVerdict === 'passed'
}

function canRollbackTask(task: StudioTask, sessionStatus: StudioSession['status'] | null): boolean {
  if (sessionStatus !== 'active') return false
  return Boolean(task.applyToken)
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
  const [projectId, setProjectId] = useState('default')
  const [budgetCap, setBudgetCap] = useState(30)
  const [qualityMode, setQualityMode] = useState<'standard' | 'delivery' | 'studio'>('studio')
  const [showAgentWorkspace, setShowAgentWorkspace] = useState(false)
  const [session, setSession] = useState<StudioSession | null>(null)
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const previewContent = useMemo(() => {
    if (selectedTask?.result) return `# ${selectedTask.title}\n\n${selectedTask.result}`
    if (mission.trim()) return `# Mission\n\n${mission.trim()}`
    return '# Studio Home\n\nCreate a mission to generate a super plan.'
  }, [selectedTask, mission])

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
  }, [])

  useEffect(() => {
    window.localStorage.setItem(AGENT_WORKSPACE_STORAGE_KEY, showAgentWorkspace ? '1' : '0')
  }, [showAgentWorkspace])

  const requireSessionId = useCallback(() => {
    if (!session?.id) throw new Error('Start a studio session first.')
    return session.id
  }, [session?.id])

  const startSession = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      await withAction(async () => {
        const res = await fetch('/api/studio/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mission,
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
    },
    [withAction, mission, projectId, qualityMode, budgetCap]
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

  const createSuperPlan = useCallback(async () => {
    await withAction(async () => {
      const sessionId = requireSessionId()
      const res = await fetch('/api/studio/tasks/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await parseJson(res)
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to generate super plan.')
      setSession(data.session as StudioSession)
      setToast('Super plan generated.')
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
        body: JSON.stringify({ sessionId, scope: 'workspace' }),
      })
      const data = await parseJson(res)
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to enable full access.')
      setSession(data.session as StudioSession)
      setToast('Full Access enabled (30 minutes).')
    })
  }, [withAction, requireSessionId, activeGrant])

  const openIde = useCallback(() => {
    const nextProjectId = (session?.projectId || projectId || 'default').trim() || 'default'
    const params = new URLSearchParams()
    params.set('projectId', nextProjectId)
    params.set('entry', 'ai')
    if (session?.id) params.set('sessionId', session.id)
    if (selectedTask?.id) params.set('taskId', selectedTask.id)
    router.push(`/ide?${params.toString()}`)
  }, [router, session?.projectId, session?.id, projectId, selectedTask?.id])

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
            <button
              onClick={openIde}
              className="rounded border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              Open IDE
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
                <button
                  type="submit"
                  disabled={busy || variableUsageBlocked}
                  className="w-full rounded border border-blue-500/40 bg-blue-500/20 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-500/30 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Start Studio Session
                </button>
              </form>
            </div>

            <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Task Board</div>
                <button
                  disabled={!session || busy || session.status !== 'active' || variableUsageBlocked}
                  onClick={createSuperPlan}
                  className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  Super Plan
                </button>
              </div>
              <div className="space-y-2">
                {(session?.tasks || []).map((task) => (
                  <div key={task.id} className={`rounded border px-3 py-2 text-xs ${statusTone(task.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-100">{task.title}</div>
                      <div className="text-[10px] uppercase tracking-wide">{task.status}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300">
                      {roleLabel(task.ownerRole)} | {task.estimateCredits} credits | {task.estimateSeconds}s
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
            <div className="h-[460px] overflow-hidden rounded border border-slate-800 bg-slate-900/60">
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
              </div>
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
                  {activeGrant ? 'Revoke Full Access' : 'Full Access (30m)'}
                </button>
              </div>
              {activeGrant && (
                <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                  Active grant: {activeGrant.scope} until {new Date(activeGrant.expiresAt).toLocaleTimeString()}
                </div>
              )}
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
