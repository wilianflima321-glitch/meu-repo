/**
 * AI-v1-e / J.5 — GraphOperator
 * Prompt → SoundCue / Quest / VFX / VS / BT nodes via CreativeBridge + FusionTx (Trava I+II).
 * Fail-closed on CostGuard / LazyInspector / Critic reject. Never bypasses Bridge.
 */

import { createHash, randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  dispatchCreativeArtifact,
  type CreativeArtifactDomain,
  type CreativeArtifactResult,
} from '@/lib/production/creative-artifact-bridge'
import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  recordFusionMutation,
  type FusionScopeStore,
  type FusionYDocScope,
} from '@/lib/production/creative-fusion-transaction'
import { inspectLazyPatch } from '@/lib/production/lazy-inspector'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'

const log = createComponentLogger('graph-operator')

export type GraphOperatorTarget =
  | 'visual-script'
  | 'behavior-tree'
  | 'sound-cue'
  | 'quest'
  | 'vfx'

export type GraphOperatorNodeKind =
  | 'sound-cue'
  | 'quest'
  | 'vfx'
  | 'vs-stub'
  | 'bt-action'
  | 'bt-condition'

export interface GraphOperatorNode {
  id: string
  kind: GraphOperatorNodeKind
  label: string
  /** USER_WIRE stubs require creator wiring — never auto-physics */
  stub?: boolean
  wiresTo?: string[]
  meta?: Record<string, string>
}

export interface GraphOperatorGraphPayload {
  graphId: string
  target: GraphOperatorTarget
  nodes: GraphOperatorNode[]
  edges: Array<{ from: string; to: string; label?: string }>
  physicsAutoWired: false
  requiresUserWiring: boolean
}

export type GraphOperatorBlockReason =
  | 'cost_guard'
  | 'lazy_reject'
  | 'critic_reject'
  | 'empty_graph'
  | 'transaction_aborted'
  | 'marketing_claim_rejected'
  | 'provider_down'

export interface GraphOperatorSuccess {
  success: true
  graph: GraphOperatorGraphPayload
  artifactId: string
  fusionTransactionId: string
  snapshotHashBefore: string
  snapshotHashAfter: string
  evidenceReceiptId: string
  ledger: TaskEvidenceLedger
  bridge: CreativeArtifactResult
}

export interface GraphOperatorDenied {
  success: false
  blockedReason: GraphOperatorBlockReason
  message: string
  ledger: TaskEvidenceLedger
  bridge?: CreativeArtifactResult
}

export type GraphOperatorResult = GraphOperatorSuccess | GraphOperatorDenied

const TARGET_TO_SCOPE: Record<GraphOperatorTarget, FusionYDocScope> = {
  'visual-script': 'visual-script',
  'behavior-tree': 'behavior-tree',
  'sound-cue': 'sound-cue',
  quest: 'quest',
  vfx: 'visual-script',
}

const TARGET_TO_DOMAIN: Record<GraphOperatorTarget, CreativeArtifactDomain> = {
  'visual-script': 'vs-graph',
  'behavior-tree': 'bt-graph',
  'sound-cue': 'vs-graph',
  quest: 'vs-graph',
  vfx: 'vs-graph',
}

const FORBIDDEN_MARKETING =
  /gta|playable aaa|full physics|auto.?combat|video\s*→\s*playable|auto.?wire.?physics/i

/**
 * Critic gate for graph proposals (Law XI style — reject, never warn-only).
 */
export function evaluateGraphOperatorCritic(input: {
  prompt: string
  nodes: GraphOperatorNode[]
  edges: Array<{ from: string; to: string }>
}): { verdict: 'PASS' | 'REJECT'; reason?: string } {
  if (FORBIDDEN_MARKETING.test(input.prompt)) {
    return {
      verdict: 'REJECT',
      reason:
        'Critic: GraphOperator cannot claim auto-physics / playable AAA / GTA-class combat from a prompt alone.',
    }
  }
  if (!input.nodes.length) {
    return { verdict: 'REJECT', reason: 'Critic: empty graph — Law XVI forbids success with empty artifact.' }
  }
  if (input.nodes.some((n) => !n.id || !n.label.trim())) {
    return { verdict: 'REJECT', reason: 'Critic: every node requires id + label.' }
  }
  const ids = new Set(input.nodes.map((n) => n.id))
  for (const e of input.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) {
      return { verdict: 'REJECT', reason: 'Critic: edge references missing node id.' }
    }
  }
  return { verdict: 'PASS' }
}

/**
 * Derive SoundCue / Quest / VFX / VS stub nodes from a structured intent.
 * Does not invent Rapier/GAS wiring — stubs carry USER_WIRE labels when needed.
 */
export function proposeGraphNodes(input: {
  prompt: string
  target: GraphOperatorTarget
  nodeHints?: Array<{ kind: GraphOperatorNodeKind; label: string }>
}): { nodes: GraphOperatorNode[]; edges: Array<{ from: string; to: string; label?: string }> } {
  const hints =
    input.nodeHints?.length
      ? input.nodeHints
      : defaultHintsForTarget(input.target, input.prompt)

  const nodes: GraphOperatorNode[] = hints.map((h, i) => {
    const needsWire =
      h.kind === 'vs-stub' ||
      h.kind === 'bt-action' ||
      h.kind === 'vfx' ||
      /physics|combat|impulse|gas/i.test(h.label)
    return {
      id: `node_${i}_${slug(h.label)}`,
      kind: h.kind,
      label: needsWire ? `USER_WIRE: ${h.label}` : h.label,
      stub: needsWire || undefined,
      meta: { target: input.target },
    }
  })

  const edges = nodes.slice(0, -1).map((n, i) => ({
    from: n.id,
    to: nodes[i + 1].id,
    label: 'then',
  }))

  return { nodes, edges }
}

function defaultHintsForTarget(
  target: GraphOperatorTarget,
  prompt: string,
): Array<{ kind: GraphOperatorNodeKind; label: string }> {
  const short = prompt.trim().slice(0, 48) || 'Untitled'
  switch (target) {
    case 'sound-cue':
      return [
        { kind: 'sound-cue', label: `${short} WavePlayer` },
        { kind: 'sound-cue', label: `${short} Mixer` },
        { kind: 'sound-cue', label: 'Output' },
      ]
    case 'quest':
      return [
        { kind: 'quest', label: `${short} Start` },
        { kind: 'quest', label: `${short} Objective` },
        { kind: 'quest', label: `${short} Complete` },
      ]
    case 'vfx':
      return [
        { kind: 'vfx', label: `${short} Spawn` },
        { kind: 'vfx', label: `${short} Lifetime` },
      ]
    case 'behavior-tree':
      return [
        { kind: 'bt-condition', label: `${short} Guard` },
        { kind: 'bt-action', label: `${short} Action (wire GAS/physics)` },
      ]
    case 'visual-script':
    default:
      return [
        { kind: 'vs-stub', label: `${short} Entry` },
        { kind: 'vs-stub', label: `${short} Wire physics here` },
        { kind: 'vs-stub', label: `${short} Exit` },
      ]
  }
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || randomUUID().slice(0, 6)
}

/**
 * Production GraphOperator — Bridge → CostGuard → Lazy → Critic → FusionTx mutate → evidence.
 */
export async function runGraphOperator(input: {
  projectId: string
  userId: string
  prompt: string
  target: GraphOperatorTarget
  planId?: string
  byokProfileId?: string
  usageBucketId?: string
  estimatedTokenWeight?: number
  nodeHints?: Array<{ kind: GraphOperatorNodeKind; label: string }>
  adapter: CostGuardLedgerAdapter
  store: FusionScopeStore
  /** Optional pre-opened tx; otherwise begins one for the target scope */
  fusionTransactionId?: string
}): Promise<GraphOperatorResult> {
  let ledger = createTaskEvidenceLedger({
    taskId: `graph-op-${randomUUID().slice(0, 8)}`,
    projectId: input.projectId,
    mission: `J.5 GraphOperator (${input.target}): ${input.prompt.slice(0, 80)}`,
    ownerAgent: 'GraphOperator',
  })

  const proposed = proposeGraphNodes({
    prompt: input.prompt,
    target: input.target,
    nodeHints: input.nodeHints,
  })

  const critic = evaluateGraphOperatorCritic({
    prompt: input.prompt,
    nodes: proposed.nodes,
    edges: proposed.edges,
  })
  if (critic.verdict === 'REJECT') {
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'Graph Critic REJECT',
      summary: critic.reason ?? 'critic_reject',
      refs: ['gate:graph-critic'],
      actor: 'GraphOperatorCritic',
    })
    return {
      success: false,
      blockedReason: FORBIDDEN_MARKETING.test(input.prompt)
        ? 'marketing_claim_rejected'
        : 'critic_reject',
      message: critic.reason ?? 'Graph Critic rejected proposal',
      ledger,
    }
  }

  const graphPayload: GraphOperatorGraphPayload = {
    graphId: `gop_${createHash('sha256')
      .update(`${input.projectId}:${input.target}:${proposed.nodes.map((n) => n.id).join('|')}`)
      .digest('hex')
      .slice(0, 12)}`,
    target: input.target,
    nodes: proposed.nodes,
    edges: proposed.edges,
    physicsAutoWired: false,
    requiresUserWiring: proposed.nodes.some((n) => n.stub === true),
  }

  const serialized = JSON.stringify(graphPayload, null, 2)
  const lazy = inspectLazyPatch(serialized)
  // Graph JSON may contain "USER_WIRE" labels — those are intentional stubs, not TODO markers.
  // Re-scan only for elision / empty-success patterns that would indicate lazy ship.
  if (lazy.verdict === 'REJECT') {
    const fatal = lazy.matchedPatterns.filter(
      (p) =>
        p.startsWith('comment-elision') ||
        p.startsWith('block-elision') ||
        p === 'empty-success' ||
        p === 'not-implemented-throw',
    )
    if (fatal.length > 0) {
      ledger = appendTaskEvidence(ledger, {
        kind: 'validation',
        title: 'LazyInspector REJECT',
        summary: `settle:0 patterns=${fatal.join(',')}`,
        refs: lazy.hunkRefs,
        actor: 'LazyInspector',
      })
      return {
        success: false,
        blockedReason: 'lazy_reject',
        message: `LazyInspector rejected graph payload: ${fatal.join(', ')}`,
        ledger,
      }
    }
  }

  const scope = TARGET_TO_SCOPE[input.target]
  const domain = TARGET_TO_DOMAIN[input.target]
  let txId = input.fusionTransactionId
  let snapshotHashBefore = ''
  let beganHere = false

  try {
    if (!txId) {
      const tx = await beginCreativeFusionTransaction({
        projectId: input.projectId,
        yDocScope: scope,
        store: input.store,
      })
      txId = tx.id
      snapshotHashBefore = tx.snapshotHashBefore
      beganHere = true
    } else {
      snapshotHashBefore = createHash('sha256')
        .update(input.store.getSnapshot(input.projectId, scope))
        .digest('hex')
        .slice(0, 32)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'transaction_aborted'
    return {
      success: false,
      blockedReason: 'transaction_aborted',
      message,
      ledger,
    }
  }

  const weight = input.estimatedTokenWeight ?? 1200
  const { result: bridge, ledger: bridgeLedger } = await dispatchCreativeArtifact({
    request: {
      domain,
      prompt: input.prompt,
      projectId: input.projectId,
      userId: input.userId,
      evidenceKind: 'graph-operator',
      costGuard: {
        estimatedTokenWeight: weight,
        byokProfileId: input.byokProfileId,
        usageBucketId: input.usageBucketId,
        planId: input.planId ?? 'pro',
      },
      fusionTransactionId: txId,
      requiresFusionWrite: true,
      fusionScope: scope,
    },
    adapter: input.adapter,
    ledger,
    provider: async () => {
      const before = JSON.parse(input.store.getSnapshot(input.projectId, scope) || '{}') as {
        projectId?: string
        scope?: string
        graphs?: GraphOperatorGraphPayload[]
      }
      const graphs = Array.isArray(before.graphs) ? [...before.graphs, graphPayload] : [graphPayload]
      const nextPayload = JSON.stringify({
        projectId: input.projectId,
        scope,
        graphs,
        updatedAt: new Date().toISOString(),
      })
      recordFusionMutation(txId!, input.store, nextPayload)
      return {
        artifactId: graphPayload.graphId,
        provider: 'graph-operator-local',
        costUsd: 0,
        actualTokenWeight: weight,
        empty: false,
      }
    },
  })

  ledger = bridgeLedger

  if (!bridge.success) {
    return {
      success: false,
      blockedReason:
        bridge.blockedReason === 'transaction_aborted'
          ? 'transaction_aborted'
          : bridge.blockedReason === 'empty_artifact'
            ? 'empty_graph'
            : bridge.blockedReason === 'provider_down'
              ? 'provider_down'
              : 'cost_guard',
      message: `CreativeBridge blocked GraphOperator: ${bridge.blockedReason ?? 'unknown'}`,
      ledger,
      bridge,
    }
  }

  let snapshotHashAfter = snapshotHashBefore
  if (beganHere && txId) {
    const committed = await commitCreativeFusionTransaction(txId, input.store)
    snapshotHashAfter = committed.snapshotHashAfter
  } else {
    snapshotHashAfter = createHash('sha256')
      .update(input.store.getSnapshot(input.projectId, scope))
      .digest('hex')
      .slice(0, 32)
  }

  ledger = appendTaskEvidence(ledger, {
    kind: 'artifact',
    title: 'GraphOperator committed',
    summary: `${graphPayload.nodes.length} nodes → ${scope}; physicsAutoWired=false`,
    refs: [
      `graph:${graphPayload.graphId}`,
      `tx:${txId}`,
      `snap:${snapshotHashBefore}→${snapshotHashAfter}`,
    ],
    actor: 'GraphOperator',
  })

  log.info('graph_operator_ok', {
    graphId: graphPayload.graphId,
    target: input.target,
    nodes: graphPayload.nodes.length,
    txId,
  })

  return {
    success: true,
    graph: graphPayload,
    artifactId: graphPayload.graphId,
    fusionTransactionId: txId!,
    snapshotHashBefore,
    snapshotHashAfter,
    evidenceReceiptId: ledger.events[ledger.events.length - 1]?.id ?? '',
    ledger,
    bridge,
  }
}
