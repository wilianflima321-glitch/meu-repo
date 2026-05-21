'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'

import { AgentFleetCoordinatorStrip } from '@/components/ai/AgentFleetCoordinatorStrip'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import { cn } from '@/lib/utils'

import { fetchAgentFleet, fetchBrowserOperatorRuns, groupMembers, patchAgentFleet } from './window/agent-window-api'
import { AgentFleetPanel } from './window/AgentFleetPanel'
import { AgentReplayPanel } from './window/AgentReplayPanel'
import { AgentWindowError, AgentWindowLoading, AgentWindowNoProject } from './window/AgentWindowStates'
import { AgentWindowTabs } from './window/AgentWindowTabs'

type AgentsWindowProps = {
  projectId?: string
  className?: string
}

export function AgentsWindow({ projectId, className }: AgentsWindowProps) {
  const [selectedAgentId, setSelectedAgentId] = useState('universal')
  const [activeView, setActiveView] = useState<'fleet' | 'replay'>('fleet')
  const [replayRunId, setReplayRunId] = useState('')
  const focusClass = `${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const currentProjectId = projectId && projectId !== 'default' ? projectId : null

  const { data, error, isLoading, mutate } = useSWR(
    currentProjectId ? ['agent-window-fleet', currentProjectId] : null,
    () => fetchAgentFleet(currentProjectId as string),
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
    },
  )

  const {
    data: replayRuns,
    error: replayRunsError,
    isLoading: replayRunsLoading,
    mutate: refreshReplayRuns,
  } = useSWR(
    currentProjectId ? ['browser-operator-runs', currentProjectId] : null,
    () => fetchBrowserOperatorRuns(currentProjectId as string),
    {
      refreshInterval: activeView === 'replay' ? 10000 : 30000,
      revalidateOnFocus: false,
    },
  )

  const grouped = useMemo(() => groupMembers(data?.members ?? []), [data])
  const topMembers = useMemo(() => (data?.members ?? []).slice(0, 8), [data])
  const latestReplayRun = replayRuns?.[0]

  useEffect(() => {
    if (!replayRunId && latestReplayRun?.runId) {
      setReplayRunId(latestReplayRun.runId)
    }
  }, [latestReplayRun?.runId, replayRunId])

  const togglePause = useCallback(async () => {
    if (!currentProjectId || !data) return
    await mutate(patchAgentFleet(currentProjectId, { paused: !data.paused }), {
      optimisticData: { ...data, paused: !data.paused },
      rollbackOnError: true,
      populateCache: true,
      revalidate: false,
    })
  }, [currentProjectId, data, mutate])

  if (!currentProjectId) {
    return <AgentWindowNoProject className={className} />
  }

  if (isLoading) {
    return <AgentWindowLoading className={className} />
  }

  if (error || !data) {
    return <AgentWindowError className={className} focusClass={focusClass} onRetry={() => void mutate()} />
  }

  return (
    <section className={cn('flex h-full min-h-0 flex-col bg-[color-mix(in_srgb,var(--aethel-surface-primary)_72%,transparent)]', className)}>
      <AgentFleetCoordinatorStrip
        projectId={currentProjectId}
        selectedAgentId={selectedAgentId}
        onSelectAgentId={setSelectedAgentId}
      />

      <AgentWindowTabs activeView={activeView} setActiveView={setActiveView} focusClass={focusClass} />

      {activeView === 'replay' ? (
        <AgentReplayPanel
          replayRunId={replayRunId}
          setReplayRunId={setReplayRunId}
          replayRuns={replayRuns}
          replayRunsError={replayRunsError}
          replayRunsLoading={replayRunsLoading}
          refreshReplayRuns={() => void refreshReplayRuns()}
          focusClass={focusClass}
        />
      ) : (
        <AgentFleetPanel
          data={data}
          grouped={grouped}
          topMembers={topMembers}
          latestReplayRun={latestReplayRun}
          onTogglePause={() => void togglePause()}
          onRefresh={() => void mutate()}
          focusClass={focusClass}
        />
      )}
    </section>
  )
}

export default AgentsWindow