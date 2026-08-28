/**
 * Mini-IA allowlist enforce on creative tool dispatch (Top-8 deepen).
 *
 * Mini-IA may only call the narrow allowlisted surface from Maestro creative pulse.
 * Host PTY / OrchestratorProd / live broker / non-allowlisted tools fail-closed with evidence.
 * Maestro pulse remains the orchestration choke — this gate is the dispatch enforcer.
 *
 * No J.12 OrchestratorProd resurrection. No Meshy/UE/Tripo claims.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import { evaluateAgentShellPolicy } from '@/lib/production/agent-shell-policy'
import {
  isMiniIaToolAllowed,
  isMiniIaToolForbidden,
  MINI_IA_ALLOWED_TOOLS,
  MINI_IA_FORBIDDEN_TOOLS,
  ORCHESTRATOR_PROD_STOPPED,
  J12_ORCHESTRATOR_PROD_SHIPPED,
  type MiniIaAllowedTool,
} from '@/lib/production/maestro-creative-pulse'

const log = createComponentLogger('mini-ia-tool-dispatch')

export const MINI_IA_TOOL_DISPATCH_LETTER = 'mini-ia-dispatch' as const
export const MINI_IA_TOOL_DISPATCH_WIRED = true as const

export type MiniIaCallerSurface = 'mini-ia' | 'maestro' | 'agent' | 'user'

export type MiniIaDispatchRejectCode =
  | 'invalid_input'
  | 'tool_forbidden'
  | 'tool_not_allowlisted'
  | 'host_pty_forbidden'
  | 'live_broker_forbidden'
  | 'orchestrator_prod_stopped'
  | 'mini_ia_orchestration_forbidden'

export type MiniIaDispatchResult<T> =
  | { ok: true; value: T }
  | {
      ok: false
      code: MiniIaDispatchRejectCode
      message: string
      evidence: MiniIaDispatchEvidence
    }

export interface MiniIaDispatchEvidence {
  version: 1
  letter: typeof MINI_IA_TOOL_DISPATCH_LETTER
  projectId: string
  toolName: string
  callerSurface: MiniIaCallerSurface
  fingerprint: string
  orchestratorProdShipped: false
  j12Stopped: true
  miniIaMayOrchestrate: false
  refs: string[]
  summary: string
}

export interface MiniIaToolDispatchInput {
  projectId: string
  /** Raw tool name from chat/agent registry or Mini-IA surface. */
  toolName: string
  callerSurface: MiniIaCallerSurface
  /** Explicit host PTY attempt. */
  hostPty?: boolean
  liveBroker?: boolean
  requestOrchestratorProd?: boolean
  /** When Mini-IA tries to own orchestration (must stay Maestro). */
  miniIaAttemptOrchestrate?: boolean
  now?: string
}

export interface MiniIaToolDispatchVerdict {
  allowed: boolean
  toolName: MiniIaAllowedTool | string
  callerSurface: MiniIaCallerSurface
  evidence: MiniIaDispatchEvidence
  maestroOwnsOrchestration: true
  orchestratorProdShipped: false
}

/** Map common agent/chat tool ids onto Mini-IA allowlist / forbidden names. */
const TOOL_ALIASES: Record<string, string> = {
  run_command: 'host.pty',
  terminal_execute: 'host.pty',
  host_pty: 'host.pty',
  'desktop.native.pty': 'desktop.native.pty',
  orchestrator_prod: 'orchestrator.prod.dispatch',
  'orchestrator-prod': 'orchestrator.prod.dispatch',
  acp_dispatch: 'acp.task.dispatch',
  live_broker: 'live.broker.submit',
  classify_intent: 'creative.intent.classify',
  cost_preflight: 'creative.cost.preflight',
  nexus_hint: 'nexus.squad.hint',
  fusion_scope: 'fusion.scope.propose',
  quality_tier: 'quality.tier.read',
  scene_context: 'scene.context.read',
  vector_search: 'vector.index.search',
}

function normalizeToolName(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  return TOOL_ALIASES[lower] ?? TOOL_ALIASES[trimmed] ?? trimmed
}

function fingerprintEvidence(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32)
}

function buildEvidence(input: {
  projectId: string
  toolName: string
  callerSurface: MiniIaCallerSurface
  summary: string
  refs: string[]
  now?: string
}): MiniIaDispatchEvidence {
  const createdAt = input.now ?? new Date().toISOString()
  const fingerprint = fingerprintEvidence([
    MINI_IA_TOOL_DISPATCH_LETTER,
    input.projectId,
    input.toolName,
    input.callerSurface,
    input.summary,
    createdAt,
  ])
  return {
    version: 1,
    letter: MINI_IA_TOOL_DISPATCH_LETTER,
    projectId: input.projectId,
    toolName: input.toolName,
    callerSurface: input.callerSurface,
    fingerprint,
    orchestratorProdShipped: false,
    j12Stopped: true,
    miniIaMayOrchestrate: false,
    refs: input.refs,
    summary: input.summary,
  }
}

/**
 * Enforce Mini-IA allowlist on a creative tool dispatch attempt.
 * Maestro / user surfaces are not restricted to Mini-IA allowlist (Maestro owns orchestration).
 * Agent Creative-mode callers marked mini-ia must stay on the allowlist.
 */
export function evaluateMiniIaToolDispatch(
  input: MiniIaToolDispatchInput,
): MiniIaDispatchResult<MiniIaToolDispatchVerdict> {
  if (!input.projectId?.trim()) {
    const evidence = buildEvidence({
      projectId: input.projectId ?? '',
      toolName: input.toolName ?? '',
      callerSurface: input.callerSurface ?? 'mini-ia',
      summary: 'invalid projectId',
      refs: ['mini-ia:invalid_input'],
      now: input.now,
    })
    return { ok: false, code: 'invalid_input', message: 'projectId required', evidence }
  }

  const toolName = normalizeToolName(input.toolName ?? '')
  if (!toolName) {
    const evidence = buildEvidence({
      projectId: input.projectId,
      toolName: '',
      callerSurface: input.callerSurface,
      summary: 'toolName required',
      refs: ['mini-ia:invalid_input'],
      now: input.now,
    })
    return { ok: false, code: 'invalid_input', message: 'toolName required', evidence }
  }

  if (input.requestOrchestratorProd === true || toolName === 'orchestrator.prod.dispatch') {
    const evidence = buildEvidence({
      projectId: input.projectId,
      toolName,
      callerSurface: input.callerSurface,
      summary: 'J.12 OrchestratorProd STOPPED — Mini-IA/agent must not dispatch OrchestratorProd',
      refs: ['j12:stopped', 'orchestrator.prod.dispatch'],
      now: input.now,
    })
    log.warn('mini_ia_dispatch_j12_stopped', { projectId: input.projectId, toolName })
    return {
      ok: false,
      code: 'orchestrator_prod_stopped',
      message: evidence.summary,
      evidence,
    }
  }

  const hostPtyTools = new Set([
    'host.pty',
    'desktop.native.pty',
    'cloud.container.pty',
    'agent.shell.host',
  ])
  if (input.hostPty === true || hostPtyTools.has(toolName)) {
    const shell = evaluateAgentShellPolicy({
      callerKind: 'agent',
      requestedTarget: 'host-pty',
      sandboxAvailable: false,
    })
    const evidence = buildEvidence({
      projectId: input.projectId,
      toolName,
      callerSurface: input.callerSurface,
      summary: shell.reason,
      refs: ['law-48:agent-shell', 'mini-ia:host_pty_forbidden', toolName],
      now: input.now,
    })
    log.warn('mini_ia_dispatch_host_pty', { projectId: input.projectId, toolName })
    return { ok: false, code: 'host_pty_forbidden', message: shell.reason, evidence }
  }

  if (input.liveBroker === true || toolName === 'live.broker.submit') {
    const evidence = buildEvidence({
      projectId: input.projectId,
      toolName,
      callerSurface: input.callerSurface,
      summary: 'Mini-IA must not submit live broker orders',
      refs: ['mini-ia:live_broker_forbidden'],
      now: input.now,
    })
    return { ok: false, code: 'live_broker_forbidden', message: evidence.summary, evidence }
  }

  if (input.miniIaAttemptOrchestrate === true) {
    const evidence = buildEvidence({
      projectId: input.projectId,
      toolName,
      callerSurface: input.callerSurface,
      summary: 'Mini-IA may not orchestrate — Maestro creative pulse owns orchestration',
      refs: ['maestro:orchestration-choke', 'mini-ia:no-orchestrate'],
      now: input.now,
    })
    return {
      ok: false,
      code: 'mini_ia_orchestration_forbidden',
      message: evidence.summary,
      evidence,
    }
  }

  // Mini-IA surface (and Creative agent acting as Mini-IA) — allowlist only
  const enforceAllowlist =
    input.callerSurface === 'mini-ia' ||
    (input.callerSurface === 'agent' && input.toolName.startsWith('creative.'))

  if (enforceAllowlist) {
    if (isMiniIaToolForbidden(toolName)) {
      const evidence = buildEvidence({
        projectId: input.projectId,
        toolName,
        callerSurface: input.callerSurface,
        summary: `Forbidden Mini-IA tool "${toolName}"`,
        refs: ['mini-ia:tool_forbidden', toolName],
        now: input.now,
      })
      return { ok: false, code: 'tool_forbidden', message: evidence.summary, evidence }
    }
    if (!isMiniIaToolAllowed(toolName)) {
      const evidence = buildEvidence({
        projectId: input.projectId,
        toolName,
        callerSurface: input.callerSurface,
        summary: `Tool "${toolName}" outside Mini-IA allowlist — Maestro owns orchestration`,
        refs: ['mini-ia:not_allowlisted', ...MINI_IA_ALLOWED_TOOLS.slice(0, 3)],
        now: input.now,
      })
      log.warn('mini_ia_dispatch_not_allowlisted', { projectId: input.projectId, toolName })
      return { ok: false, code: 'tool_not_allowlisted', message: evidence.summary, evidence }
    }
  }

  const evidence = buildEvidence({
    projectId: input.projectId,
    toolName,
    callerSurface: input.callerSurface,
    summary: `Mini-IA dispatch ALLOW — ${toolName} (Maestro remains orchestration choke)`,
    refs: ['mini-ia:allowlist-pass', toolName, 'maestro:orchestration-choke'],
    now: input.now,
  })

  return {
    ok: true,
    value: {
      allowed: true,
      toolName,
      callerSurface: input.callerSurface,
      evidence,
      maestroOwnsOrchestration: true,
      orchestratorProdShipped: false,
    },
  }
}

/**
 * Map governed agent Creative-mode tool ids into Mini-IA dispatch names.
 * Terminal / apply / git stay forbidden for Mini-IA surface.
 */
export function mapAgentToolToMiniIaName(toolId: string): string {
  const map: Record<string, string> = {
    'diff-proposal': 'fusion.scope.propose',
    'apply-write': 'host.pty', // not allowlisted — Mini-IA must not apply writes
    'git-commit': 'host.pty',
    'run_command': 'host.pty',
    'browser-research': 'scene.context.read',
    'vector-search': 'vector.index.search',
    'create-level': 'nexus.squad.hint',
  }
  return map[toolId] ?? toolId
}

export function probeMiniIaToolDispatchReadiness(): {
  id: 'mini-ia-tool-dispatch'
  status: 'PARTIAL'
  ready: boolean
  path: string
  orchestratorProdShipped: false
  j12Stopped: true
  note: string
} {
  const allow = evaluateMiniIaToolDispatch({
    projectId: 'probe',
    toolName: 'quality.tier.read',
    callerSurface: 'mini-ia',
    now: '2026-08-10T18:00:00.000Z',
  })
  const pty = evaluateMiniIaToolDispatch({
    projectId: 'probe',
    toolName: 'run_command',
    callerSurface: 'mini-ia',
    now: '2026-08-10T18:00:00.000Z',
  })
  const orch = evaluateMiniIaToolDispatch({
    projectId: 'probe',
    toolName: 'x',
    callerSurface: 'mini-ia',
    requestOrchestratorProd: true,
  })
  const ready =
    allow.ok &&
    !pty.ok &&
    pty.code === 'host_pty_forbidden' &&
    !orch.ok &&
    orch.code === 'orchestrator_prod_stopped' &&
    ORCHESTRATOR_PROD_STOPPED &&
    !J12_ORCHESTRATOR_PROD_SHIPPED &&
    MINI_IA_FORBIDDEN_TOOLS.includes('orchestrator.prod.dispatch')

  return {
    id: 'mini-ia-tool-dispatch',
    status: 'PARTIAL',
    ready,
    path: 'lib/production/mini-ia-tool-dispatch.ts',
    orchestratorProdShipped: false,
    j12Stopped: true,
    note:
      'Mini-IA allowlist enforced on creative dispatch; host PTY / OrchestratorProd fail-closed; Maestro remains orchestration choke',
  }
}
