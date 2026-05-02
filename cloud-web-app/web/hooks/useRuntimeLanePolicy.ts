'use client'

import { useMemo } from 'react'

import { useRuntimeCapabilityProfile } from '@/hooks/useRuntimeCapabilityProfile'
import {
  resolveRuntimeExecutionRoute,
  type RuntimeExecutionRoute,
} from '@/lib/device/runtime-execution-router'
import {
  buildRuntimeLaneBudgets,
  decideRuntimeLaneStart,
  type RuntimeLaneBudget,
  type RuntimeLaneDecision,
  type RuntimeWorkLane,
} from '@/lib/device/runtime-lane-scheduler'

type RuntimeLanePressureOptions = {
  activeCount?: number
  queuedCount?: number
  userActive?: boolean
}

type RuntimeLanePolicyState = {
  budget: RuntimeLaneBudget | null
  decision: RuntimeLaneDecision
  route: RuntimeExecutionRoute
}

export function useRuntimeLanePolicy(
  lane: RuntimeWorkLane,
  options: RuntimeLanePressureOptions = {}
): RuntimeLanePolicyState {
  const { profile, localBridge } = useRuntimeCapabilityProfile()
  const activeCount = options.activeCount ?? 0
  const queuedCount = options.queuedCount ?? 0
  const userActive = options.userActive ?? false

  return useMemo(() => {
    const budget = buildRuntimeLaneBudgets(profile.policy).find((item) => item.lane === lane) ?? null
    const decision = decideRuntimeLaneStart(profile.policy, lane, {
      userActive,
      activeByLane: { [lane]: activeCount },
      queuedByLane: { [lane]: queuedCount },
    })

    return {
      budget,
      decision,
      route: resolveRuntimeExecutionRoute({
        profile,
        decision,
        localBridge,
      }),
    }
  }, [activeCount, lane, localBridge, profile, queuedCount, userActive])
}

export default useRuntimeLanePolicy
