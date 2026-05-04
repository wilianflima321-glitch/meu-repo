import { prisma } from '@/lib/db'
import type { Message } from '@/lib/ai-service'

import { buildAgentHandoffPacket, type AgentHandoffPacket } from './agent-handoff-packet'
import {
  buildDefaultAgenticProductionState,
  readAgenticProductionStateFromSettings,
} from './agentic-production-state'
import {
  readRepositoryContextBudgetExecutionStateFromSettings,
  type RepositoryContextBudgetExecutionState,
} from './repository-context-budget-execution'
import { readRepositoryCartographyManifestFromSettings } from './repository-cartography'

export type AiAgentRouteKind = 'chat' | 'completion' | 'inline-edit'

export type AgentHandoffContextResult = {
  agent: string
  context: string
  packet: AgentHandoffPacket | null
  hasManifest: boolean
  projectFound: boolean
}

type LoadAgentHandoffContextInput = {
  userId: string
  projectId?: string
  routeKind: AiAgentRouteKind
  requestedAgent?: string
  promptText?: string
  filePath?: string
  maxContextChars?: number
}

type ProjectForHandoffContext = {
  id: string
  name: string
  template: string | null
  settings: unknown
}

const DEFAULT_MAX_CONTEXT_CHARS = 6_000

function compactList(items: string[], limit: number): string[] {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit)
}

function looksLikeFilm(text: string): boolean {
  return /\b(film|shot|cinematic|camera|timeline|render|subtitle|storyboard|premiere|animation)\b/i.test(text)
}

function looksLikeGame(text: string): boolean {
  return /\b(game|level|scene|combat|physics|enemy|quest|gltf|fbx|unreal|unity|viewport|asset|lod)\b/i.test(text)
}

function looksLikeRelease(text: string): boolean {
  return /\b(deploy|release|vercel|build|rollback|domain|cloud|production)\b/i.test(text)
}

function looksLikeValidation(text: string): boolean {
  return /\b(test|qa|playtest|validate|evidence|regression|benchmark|lighthouse|coverage)\b/i.test(text)
}

function looksLikeAssetWork(text: string): boolean {
  return /\.(glb|gltf|fbx|obj|png|jpg|jpeg|webp|wav|mp3|mp4|mov|otio|psd)$/i.test(text) ||
    /\b(asset|texture|material|audio|music|sound|license|provenance|thumbnail)\b/i.test(text)
}

export function inferAgentForAiRequest(input: {
  routeKind: AiAgentRouteKind
  requestedAgent?: string
  promptText?: string
  filePath?: string
}): string {
  const requestedAgent = input.requestedAgent?.trim()
  if (requestedAgent) return requestedAgent

  const text = `${input.filePath ?? ''}\n${input.promptText ?? ''}`
  if (looksLikeValidation(text)) return 'QA Agent'
  if (looksLikeRelease(text)) return 'Release Agent'
  if (looksLikeAssetWork(text)) return 'Asset Librarian Agent'
  if (looksLikeFilm(text)) return 'Cinematic Editor Agent'
  if (looksLikeGame(text)) return 'Gameplay Engineer Agent'
  if (input.routeKind === 'inline-edit' || input.routeKind === 'completion') return 'Software Engineer Agent'
  return 'Producer Agent'
}

function statusLine(packet: AgentHandoffPacket, hasManifest: boolean): string {
  if (!hasManifest) {
    return 'status=needs-review; reason=Repository Cartography manifest missing; ask for a scan before broad edits.'
  }
  return `status=${packet.status}; manifest=${packet.cartography.manifestId ?? 'missing'}; files=${packet.cartography.totalFiles}; bytes=${packet.cartography.totalBytes}`
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`
}

function formatExecutionLine(
  execution: RepositoryContextBudgetExecutionState | null,
  manifestId: string | null
): string {
  if (!execution || execution.manifestId !== manifestId) return 'not-started'
  return execution.batches
    .slice(0, 5)
    .map((batch) => `${batch.id}:${batch.status}:${batch.completedSurfaceCount}/${batch.surfaceCount}`)
    .join('; ')
}

function formatHandoffContext(
  packet: AgentHandoffPacket,
  hasManifest: boolean,
  maxChars: number,
  execution: RepositoryContextBudgetExecutionState | null
): string {
  const ownedSurfaces = packet.cartography.ownedSurfaces
    .slice(0, 12)
    .map(
      (surface) =>
        `- ${surface.path} [${surface.domain}/${surface.layer}; ${surface.strategy}; ${surface.priority}]`
    )
  const gaps = packet.cartography.criticalGaps
    .slice(0, 8)
    .map((gap) => `- ${gap.severity.toUpperCase()}: ${gap.title} -> ${gap.recommendation}`)
  const duplicateGroups = packet.cartography.duplicateGroups
    .slice(0, 5)
    .map((group) => `- ${group.reason}: ${group.paths.join(', ')}`)
  const workContract = packet.workContract
  const budget = packet.cartography.contextBudget
  const retrievalBatches = budget.retrievalBatches
    .slice(0, 4)
    .map(
      (batch) =>
        `- ${batch.id} [${batch.strategy}]: ${batch.purpose} (${batch.surfaces.slice(0, 4).join(', ') || 'no surfaces'})`
    )
  const contextRisks = budget.largestContextRisks
    .slice(0, 5)
    .map((surface) => `- ${surface.path} [${surface.domain}; ${surface.strategy}; ${formatBytes(surface.sizeBytes)}]`)

  const context = [
    `Aethel Agent Handoff Packet (agent=${packet.agent}; ${statusLine(packet, hasManifest)}):`,
    `Mission: ${packet.mission.objective}`,
    `Domain: ${packet.mission.domain}; Audience: ${packet.mission.audience}`,
    `Latest ledger: ${packet.latestLedger.phase} / ${packet.latestLedger.state} - ${packet.latestLedger.summary}`,
    `Next ledger action: ${packet.latestLedger.nextAction}`,
    `Runtime: preferred=${packet.runtimePolicy.preferredTarget}; fallback=${packet.runtimePolicy.fallbackTarget}; acceleration=${packet.runtimePolicy.localAcceleration}; maxHeavyJobs=${packet.runtimePolicy.maxConcurrentHeavyJobs}`,
    `Parallel work lane: ${workContract.lane}; scope=${workContract.scopeLock.mode}`,
    `Scope rule: ${workContract.scopeLock.rule}`,
    '',
    'Allowed toolbelt:',
    ...workContract.allowedTools.slice(0, 16).map((tool) => `- ${tool}`),
    '',
    'Parallel safety rules:',
    ...workContract.parallelRules.slice(0, 8).map((rule) => `- ${rule}`),
    '',
    'Approval required for:',
    ...workContract.approvalRequiredFor.slice(0, 8).map((rule) => `- ${rule}`),
    '',
    'Owned surfaces for this agent:',
    ...(ownedSurfaces.length ? ownedSurfaces : ['- None assigned yet; stay in planning/classification mode.']),
    '',
    'Research policy:',
    ...workContract.researchPolicy.slice(0, 6).map((rule) => `- ${rule}`),
    '',
    `Repository context budget: direct=${formatBytes(budget.directReadBytes)}; summarize=${formatBytes(
      budget.summarizeFirstBytes
    )}; index=${formatBytes(budget.indexOnlyBytes)}; external=${formatBytes(
      budget.externalMirrorBytes
    )}; manual=${formatBytes(budget.manualReviewBytes)}; estimatedChunks=${budget.estimatedChunkCount}`,
    `Context budget execution: ${formatExecutionLine(execution, packet.cartography.manifestId)}`,
    'Retrieval batches:',
    ...(retrievalBatches.length ? retrievalBatches : ['- None; request a fresh Repository Cartography scan before broad work.']),
    'Context risk surfaces:',
    ...(contextRisks.length ? contextRisks : ['- None recorded in the current packet.']),
    'Context budget guardrails:',
    ...budget.guardrails.slice(0, 6).map((rule) => `- ${rule}`),
    '',
    'Browser Operator policy:',
    ...workContract.browserOperatorPolicy.slice(0, 6).map((rule) => `- ${rule}`),
    '',
    'Repository must-read first:',
    ...compactList(packet.cartography.mustReadFirst, 12).map((item) => `- ${item}`),
    '',
    'Do-not-invent guardrails:',
    ...compactList(packet.cartography.doNotInvent, 12).map((item) => `- ${item}`),
    '- Do not claim file, asset, route, benchmark, render, playtest, or build evidence unless it is in the prompt, Project Brain, Mission Ledger, or Repository Cartography.',
    '- For GB-scale repos/assets, request indexes, manifests, hashes, thumbnails, and summaries instead of reading/downloading blindly.',
    '- If the manifest is missing or stale, make a scoped plan and ask for Repository Cartography before broad edits.',
    '',
    'Critical gaps:',
    ...(gaps.length ? gaps : ['- None recorded in the current packet.']),
    '',
    'Duplicate risk groups:',
    ...(duplicateGroups.length ? duplicateGroups : ['- None recorded in the current packet.']),
    '',
    'Acceptance evidence required:',
    ...compactList(packet.acceptance, 10).map((item) => `- ${item}`),
    '',
    'Next actions:',
    ...compactList(packet.nextActions, 5).map((item) => `- ${item}`),
  ].join('\n')

  return context.length <= maxChars ? context : `${context.slice(0, maxChars)}\n... [agent handoff context truncated]`
}

async function loadProjectForHandoffContext(
  projectId: string,
  userId: string
): Promise<ProjectForHandoffContext | null> {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      template: true,
      settings: true,
    },
  })
}

export async function loadAgentHandoffContext({
  userId,
  projectId,
  routeKind,
  requestedAgent,
  promptText,
  filePath,
  maxContextChars = DEFAULT_MAX_CONTEXT_CHARS,
}: LoadAgentHandoffContextInput): Promise<AgentHandoffContextResult> {
  const agent = inferAgentForAiRequest({ routeKind, requestedAgent, promptText, filePath })
  if (!projectId?.trim()) {
    return { agent, context: '', packet: null, hasManifest: false, projectFound: false }
  }

  const project = await loadProjectForHandoffContext(projectId, userId)
  if (!project) {
    return { agent, context: '', packet: null, hasManifest: false, projectFound: false }
  }

  const state =
    readAgenticProductionStateFromSettings(project.settings) ??
    buildDefaultAgenticProductionState({
      projectName: project.name,
      projectType: project.template,
    })
  const manifest = readRepositoryCartographyManifestFromSettings(project.settings)
  const contextBudgetExecution = readRepositoryContextBudgetExecutionStateFromSettings(project.settings)
  const packet = buildAgentHandoffPacket({
    projectId: project.id,
    agent,
    state,
    manifest,
  })

  return {
    agent,
    context: formatHandoffContext(packet, Boolean(manifest), maxContextChars, contextBudgetExecution),
    packet,
    hasManifest: Boolean(manifest),
    projectFound: true,
  }
}

export function applyAgentHandoffContextToMessages<T extends Message>(
  messages: T[],
  handoffContext: string
): T[] {
  if (!handoffContext.trim()) return messages
  if (messages.length === 0) return [{ role: 'system', content: handoffContext } as T]

  const [first, ...rest] = messages
  if (first.role === 'system') {
    return [{ ...first, content: `${first.content}\n\n${handoffContext}` }, ...rest]
  }

  return [{ role: 'system', content: handoffContext } as T, ...messages]
}
