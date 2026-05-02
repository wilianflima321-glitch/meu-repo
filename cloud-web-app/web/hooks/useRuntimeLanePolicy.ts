'use client'

import { useMemo } from 'react'

import { useRuntimeCapabilityProfile } from '@/hooks/useRuntimeCapabilityProfile'
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
}

export function useRuntimeLanePolicy(
  lane: RuntimeWorkLane,
  options: RuntimeLanePressureOptions = {}
): RuntimeLanePolicyState {
  const { profile } = useRuntimeCapabilityProfile()
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
    }
  }, [activeCount, lane, profile.policy, queuedCount, userActive])
}

export default useRuntimeLanePolicy
