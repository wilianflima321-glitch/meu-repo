/**
 * Letter bu/bv — Character / GAS topology honesty aggregate.
 * DQ compute ready only after bv soak evidence.
 */

import {
  DUAL_QUATERNION_SKINNING_WIRED,
  planDualQuaternionSkinning,
  type DualQuaternionComputeSoakResult,
} from '@/lib/character/dual-quaternion-skinning'
import { CHARACTER_BIOLOGICAL_BRIDGE_WIRED } from '@/lib/character/character-biological-bridge'
import { GAS_CLIENT_PREDICTION_WIRED, evaluateGasPredictionHonesty } from '@/lib/character/gas-client-prediction'
import { FOOT_CONTACT_IK_WIRED } from '@/lib/character/foot-contact-ik'
import { RUNTIME_RETARGETING_WIRED } from '@/lib/character/runtime-retargeting'
import { ENVIRONMENT_QUERY_SYSTEM_WIRED } from '@/lib/character/environment-query-system'
import { DATA_ASSET_ITEM_PIPELINE_WIRED } from '@/lib/character/data-asset-item-pipeline'

export const CHARACTER_TOPOLOGY_LETTER = 'bu' as const

export interface CharacterTopologyHonestyReport {
  letter: typeof CHARACTER_TOPOLOGY_LETTER
  dualQuaternionSkinning: {
    wired: boolean
    gpuCompute: boolean
    /** Letter bv — soak-gated. */
    dqComputeSkinningReady: boolean
    held: boolean
  }
  biologicalBridge: { wired: boolean }
  gasClientPrediction: {
    wired: boolean
    ready: boolean
    ggpoLiveMarketingAllowed: false
  }
  footContactIk: { wired: boolean }
  runtimeRetargeting: { wired: boolean }
  eqs: { wired: boolean; /** Letter cj soak — not bu lib-only. */ playtestReady?: boolean }
  dataAssetIde: { wired: boolean }
  notes: string[]
}

export function probeCharacterTopologyHonesty(input?: {
  webgpuComputeAvailable?: boolean
  gasActivationsPredicted?: number
  rollbackBound?: boolean
  /** Letter bv soak evidence. */
  dqSoak?: DualQuaternionComputeSoakResult
  capabilityScore?: number
  /** Letter cj — EQS playtest soak (optional; prefer probeEqsPlaytestHonesty). */
  eqsPlaytestReady?: boolean
}): CharacterTopologyHonestyReport {
  const dq = planDualQuaternionSkinning({
    webgpuAvailable: input?.webgpuComputeAvailable === true,
    webgpuComputeAvailable: input?.webgpuComputeAvailable === true,
    bonePoses: [
      {
        boneIndex: 0,
        rotation: [0, 0, 0, 1],
        position: [0, 1, 0],
      },
    ],
    capabilityScore: input?.capabilityScore,
    soakPassed: input?.dqSoak?.passed === true,
    soakFramesProven: input?.dqSoak?.frames,
  })
  const gas = evaluateGasPredictionHonesty({
    sessionWired: GAS_CLIENT_PREDICTION_WIRED,
    rollbackSessionBound: input?.rollbackBound === true,
    activationsPredicted: input?.gasActivationsPredicted ?? 0,
  })

  return {
    letter: CHARACTER_TOPOLOGY_LETTER,
    dualQuaternionSkinning: {
      wired: DUAL_QUATERNION_SKINNING_WIRED,
      gpuCompute: dq.gpuComputeSkinning,
      dqComputeSkinningReady: dq.dqComputeSkinningReady,
      held: !dq.dqComputeSkinningReady,
    },
    biologicalBridge: { wired: CHARACTER_BIOLOGICAL_BRIDGE_WIRED },
    gasClientPrediction: {
      wired: GAS_CLIENT_PREDICTION_WIRED,
      ready: gas.gasPredictionReady,
      ggpoLiveMarketingAllowed: false,
    },
    footContactIk: { wired: FOOT_CONTACT_IK_WIRED },
    runtimeRetargeting: { wired: RUNTIME_RETARGETING_WIRED },
    eqs: {
      wired: ENVIRONMENT_QUERY_SYSTEM_WIRED,
      playtestReady: input?.eqsPlaytestReady === true,
    },
    dataAssetIde: { wired: DATA_ASSET_ITEM_PIPELINE_WIRED },
    notes: [
      ...dq.notes,
      ...gas.notes,
      'Euphoria AAA / GGPO-live / GAS IPC 60Hz remain HELD',
      'Nanite/Euphoria AAA skinning claims forbidden',
      input?.eqsPlaytestReady === true
        ? 'EQS playtestReady CLOSED (letter cj) — see probeEqsPlaytestHonesty'
        : 'EQS playtestReady via letter cj soak (probeEqsPlaytestHonesty)',
    ],
  }
}
