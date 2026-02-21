'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type {
  FullAccessScope,
  MissionDomain,
  MissionDomainSelection,
  StudioSession,
  UsageSummary,
  WalletSummary,
} from './studio-home.types'
import {
  defaultFullAccessScope,
  domainTemplate,
  fullAccessAllowedScopesForPlan,
  normalizeBudgetCap,
  sanitizeStudioProjectId,
  isTypingTarget,
  parseJson,
} from './studio-home.utils'
import { StudioHomeMissionPanel } from './StudioHomeMissionPanel'
import { StudioHomeTaskBoard } from './StudioHomeTaskBoard'
import { StudioHomeTeamChat } from './StudioHomeTeamChat'
import { StudioHomeOpsBar, StudioHomePreviewPanel } from './StudioHomeRightRail'

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
const LEGACY_DASHBOARD_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LEGACY_DASHBOARD === 'true'

type StudioLiveCost = {
  cost: StudioSession['cost']
  runsByRole: Record<string, number>
  totalRuns: number
  budgetExceeded: boolean
  updatedAt: string
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
  const [liveCost, setLiveCost] = useState<StudioLiveCost | null>(null)
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
    const costSnapshot = liveCost?.cost || session?.cost
    const cap = Number(costSnapshot?.budgetCap ?? budgetCap)
    const used = Number(costSnapshot?.usedCredits ?? 0)
    const safeCap = cap > 0 ? cap : 1
    const percent = Math.max(0, Math.min(100, Math.round((used / safeCap) * 100)))
    const pressure = percent >= 90 ? 'critical' : percent >= 70 ? 'high' : percent >= 50 ? 'medium' : 'normal'
    return { percent, pressure }
  }, [liveCost?.cost, session?.cost, budgetCap])

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

  const refreshLiveCost = useCallback(
    async (sessionId: string) => {
      const res = await fetch(`/api/studio/cost/live?sessionId=${encodeURIComponent(sessionId)}`, {
        cache: 'no-store',
      })
      const data = await parseJson(res)
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to load live cost telemetry.')
      setLiveCost({
        cost: data.cost as StudioSession['cost'],
        runsByRole: (data.runsByRole as Record<string, number>) || {},
        totalRuns: Number(data.totalRuns || 0),
        budgetExceeded: Boolean(data.budgetExceeded),
        updatedAt: new Date().toISOString(),
      })
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
    if (!session?.id || session.status !== 'active') {
      setLiveCost(null)
      return
    }
    void refreshLiveCost(session.id).catch(() => {})
    const interval = window.setInterval(() => {
      void refreshLiveCost(session.id).catch(() => {})
    }, 10000)
    return () => window.clearInterval(interval)
  }, [session?.id, session?.status, refreshLiveCost])

  useEffect(() => {
    if (sessionBootstrapped) return
    const restore = async () => {
      const params = new URLSearchParams(window.location.search)
      const querySessionId = params.get('sessionId')?.trim()
      const persistedSessionId = querySessionId || window.localStorage.getItem(STUDIO_SESSION_STORAGE_KEY)?.trim()
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

  const applyMissionDomainPreset = useCallback(
    (domain: MissionDomain) => {
      setMissionDomainSelection(domain)
      if (!trimmedMission) setMission(domainTemplate(domain))
    },
    [trimmedMission]
  )

  const handleProjectIdChange = useCallback((value: string) => {
    setProjectId(sanitizeStudioProjectId(value))
  }, [])

  const handleBudgetCapChange = useCallback((value: number) => {
    setBudgetCap(normalizeBudgetCap(value))
  }, [])

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
            {LEGACY_DASHBOARD_ENABLED && (
              <button
                onClick={() => router.push('/dashboard?legacy=1')}
                className="rounded border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Legacy dashboard
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(420px,1fr)_460px]">
          <section className="space-y-4">
            <StudioHomeMissionPanel
              mission={mission}
              projectId={projectId}
              budgetCap={budgetCap}
              qualityMode={qualityMode}
              missionDomainSelection={missionDomainSelection}
              trimmedMission={trimmedMission}
              busy={busy}
              variableUsageBlocked={variableUsageBlocked}
              session={session}
              onMissionChange={setMission}
              onProjectIdChange={handleProjectIdChange}
              onBudgetCapChange={handleBudgetCapChange}
              onMissionDomainChange={setMissionDomainSelection}
              onQualityModeChange={setQualityMode}
              onApplyDomainPreset={applyMissionDomainPreset}
              onStartSession={startSession}
            />

            <StudioHomeTaskBoard
              session={session}
              busy={busy}
              variableUsageBlocked={variableUsageBlocked}
              taskProgress={taskProgress}
              onCreateSuperPlan={createSuperPlan}
              onRunWave={runWave}
              onRunTask={runTask}
              onValidateTask={validateTask}
              onApplyTask={applyTask}
              onRollbackTask={rollbackTask}
            />
          </section>

          <section className="space-y-4">
            <StudioHomeTeamChat
              session={session}
              recentAgentRuns={recentAgentRuns}
              showAgentWorkspace={showAgentWorkspace}
              onToggleAgentWorkspace={() => setShowAgentWorkspace((prev) => !prev)}
              agentWorkspaceNode={showAgentWorkspace ? <AIChatPanelContainer /> : null}
            />
          </section>

          <section className="space-y-4">
            <StudioHomePreviewPanel
              showRuntimePreview={showRuntimePreview}
              onToggleRuntimePreview={() => setShowRuntimePreview((prev) => !prev)}
              previewContent={previewContent}
              previewRuntimeNode={
                showRuntimePreview ? (
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
                ) : null
              }
            />

            <StudioHomeOpsBar
              session={session}
              usage={usage}
              wallet={wallet}
              budgetCap={budgetCap}
              budgetProgress={budgetProgress}
              busy={busy}
              liveCost={liveCost}
              activeGrant={activeGrant}
              fullAccessScope={fullAccessScope}
              allowedFullAccessScopes={allowedFullAccessScopes}
              onStopSession={stopSession}
              onToggleFullAccess={toggleFullAccess}
              onFullAccessScopeChange={setFullAccessScope}
            />
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
