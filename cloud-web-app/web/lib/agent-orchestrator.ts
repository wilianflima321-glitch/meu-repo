/**
 * Agent Orchestrator for Aethel Engine
 * Streams parallel agent messages with explicit cancellation semantics.
 *
 * AETHEL FUSION: All roles now route through agentLlmChat → intelligent-model-router
 * instead of generating static guidance strings.
 */

import { aiService } from '@/lib/ai-service'
import { resolveTaskKindForRole } from '@/lib/ai/fusion-role-map'

export const AGENT_ROLE_PROFILES = {
  architect: {
    name: 'Architect',
    role: 'System decomposition and risk mapping',
    scope: 'Defines decomposition, contracts, and sequencing only.',
    guidance: (taskHint: string) => `Plan: decompose "${taskHint}" into small steps, define contracts first, then sequence implementation with rollback points.`,
  },
  designer: {
    name: 'Designer',
    role: 'UX, interaction, and visual consistency',
    scope: 'Owns UX states, accessibility, and interaction consistency only.',
    guidance: () => 'UX: enforce explicit loading/error/empty states, keyboard-first behavior, and remove misleading CTAs from partial capabilities.',
  },
  engineer: {
    name: 'Engineer',
    role: 'Implementation, runtime, and performance',
    scope: 'Implements scoped code changes only (no autonomous apply).',
    guidance: () => 'Execution: implement minimal diff with stable interfaces, add runtime guards, and keep performance impact measurable.',
  },
  qa: {
    name: 'QA',
    role: 'Validation strategy and regression prevention',
    scope: 'Validates deterministic checks and regression risk only.',
    guidance: () => 'Validation: check route contracts, no-fake-success behavior, and edge cases (invalid input, cancellation, rate limits).',
  },
  researcher: {
    name: 'Researcher',
    role: 'Evidence, assumptions, and gap analysis',
    scope: 'Verifies evidence/assumptions and flags unsupported claims only.',
    guidance: () => 'Evidence: mark assumptions explicitly, separate verified facts from hypotheses, and avoid unsupported production claims.',
  },
  'browser-operator': {
    name: 'Browser Operator',
    role: 'Safe browser navigation with replay and approvals',
    scope: 'Navigates allowed web surfaces with replay evidence; never handles login, purchase, deploy, or account changes without approval.',
    guidance: () => 'Browser: collect DOM snapshots, screenshots, and replay notes; pause for login/payment/deploy/destructive actions.',
  },
  'fact-checker': {
    name: 'Fact Checker',
    role: 'Citation verification and contradiction detection',
    scope: 'Checks claims against cited sources and repository evidence only.',
    guidance: () => 'Fact-check: separate confirmed claims, stale claims, conflicts, and claims that need primary-source citation.',
  },
  summarizer: {
    name: 'Summarizer',
    role: 'Compression of large evidence packs',
    scope: 'Compresses read receipts into concise summaries without losing blockers or uncertainty.',
    guidance: () => 'Summary: preserve blockers, decisions, source IDs, and next actions while reducing context footprint.',
  },
  'competitor-tracker': {
    name: 'Competitor Tracker',
    role: 'Market comparison and product gap tracking',
    scope: 'Compares public capabilities and explicitly avoids copying unverified technical claims.',
    guidance: () => 'Market: compare experience patterns separately from technical parity claims and flag red lines.',
  },
  'paper-reader': {
    name: 'Paper Reader',
    role: 'Research paper and technical document review',
    scope: 'Reads papers/docs and extracts methods, limits, datasets, and reproducibility concerns.',
    guidance: () => 'Paper: extract method, assumptions, benchmark setup, licenses, and what is safe to implement.',
  },
  'dataset-scout': {
    name: 'Dataset Scout',
    role: 'Dataset discovery and licensing triage',
    scope: 'Finds datasets and records license, size, splits, safety notes, and metadata-first download plans.',
    guidance: () => 'Dataset: never download blindly; record license, size, splits, card metadata, and cache plan first.',
  },
  'huggingface-curator': {
    name: 'Hugging Face Curator',
    role: 'HF model/dataset metadata and license review',
    scope: 'Mirrors Hugging Face metadata before any large model, dataset, or Space download.',
    guidance: () => 'HF: inspect model card, dataset card, files, revisions, license, size, and local/cloud cache requirements.',
  },
  'github-cartographer': {
    name: 'GitHub Cartographer',
    role: 'Repository topology and ownership mapping',
    scope: 'Builds repository maps, manifests, ownership, entrypoints, and risk areas before edits.',
    guidance: () => 'Repo: map tree, manifests, owners, tests, generated files, large folders, and read receipts before applying changes.',
  },
  'security-auditor': {
    name: 'Security Auditor',
    role: 'Threat modeling and sensitive action review',
    scope: 'Reviews auth, secrets, browser actions, high-risk workflows, and abuse paths only.',
    guidance: () => 'Security: identify trust boundaries, sensitive actions, missing approvals, abuse paths, and audit evidence.',
  },
  'performance-engineer': {
    name: 'Performance Engineer',
    role: 'Runtime, memory, bundle, and latency optimization',
    scope: 'Optimizes measurable performance with before/after evidence and no UX regressions.',
    guidance: () => 'Performance: measure first, reduce main-thread work, preserve cancellation, and document before/after metrics.',
  },
  'release-manager': {
    name: 'Release Manager',
    role: 'Launch readiness and rollback planning',
    scope: 'Coordinates release gates, rollout notes, rollback plan, and customer-facing risk language.',
    guidance: () => 'Release: require tests, build, observability, rollback, known risks, and support notes before ship.',
  },
  'devops-operator': {
    name: 'DevOps Operator',
    role: 'CI/CD, infrastructure, and deployment safety',
    scope: 'Works on CI, deployment, environment, and observability changes with approval for production actions.',
    guidance: () => 'DevOps: validate config, secrets boundaries, deployment gates, and never deploy production without explicit approval.',
  },
  'game-designer': {
    name: 'Game Designer',
    role: 'Gameplay loops, feel, and player experience',
    scope: 'Designs mechanics, loops, progression, and playtest evidence without touching unrelated app surfaces.',
    guidance: () => 'Game: define core loop, constraints, player feedback, failure states, and playtest evidence before done.',
  },
  'gameplay-engineer': {
    name: 'Gameplay Engineer',
    role: 'Physics, controls, entities, and simulation logic',
    scope: 'Implements scoped gameplay/runtime systems with deterministic validation and rollback.',
    guidance: () => 'Gameplay: wire physics/controls/entities in small slices with testable behavior and performance limits.',
  },
  'cinematic-director': {
    name: 'Cinematic Director',
    role: 'Shots, continuity, timeline, and render evidence',
    scope: 'Plans film/story sequences, continuity, shots, render checks, and evidence gates.',
    guidance: () => 'Film: map shots, continuity, audio/visual beats, review gates, and render evidence before final.',
  },
  'audio-composer': {
    name: 'Audio Composer',
    role: 'Music, voice, spatial audio, and sound cues',
    scope: 'Works on sound/music/voice plans and audio pipeline evidence only.',
    guidance: () => 'Audio: define mood, cues, stems, licensing, loudness, spatial needs, and preview/export evidence.',
  },
  'asset-pipeline': {
    name: 'Asset Pipeline',
    role: 'Import, thumbnails, proxies, licenses, and optimization',
    scope: 'Handles asset metadata, proxy generation, license status, and optimization plans.',
    guidance: () => 'Assets: require file metadata, license, thumbnail/proxy, size budget, and validation before release use.',
  },
  'ux-researcher': {
    name: 'UX Researcher',
    role: 'User workflow diagnosis and usability risks',
    scope: 'Reviews journeys, friction, discoverability, and user trust without adding visual noise.',
    guidance: () => 'UX research: identify user intent, friction, trust breaks, task time, and compact evidence surfaces.',
  },
  translator: {
    name: 'Translator',
    role: 'Localization quality and terminology consistency',
    scope: 'Reviews i18n coverage, terminology, mojibake, locale tone, and accessibility labels.',
    guidance: () => 'Localization: keep terms consistent, avoid mojibake, preserve UI space, and flag untranslated hardcoded copy.',
  },
  'documentation-writer': {
    name: 'Documentation Writer',
    role: 'Docs, changelog, acceptance criteria, and operator notes',
    scope: 'Writes accurate docs from implemented evidence and explicitly marks partial capabilities.',
    guidance: () => 'Docs: document what exists, what is partial, tests run, limitations, and next operator steps.',
  },
  'cost-governor': {
    name: 'Cost Governor',
    role: 'Token, runtime, provider, and margin control',
    scope: 'Tracks cost budgets, provider usage, quotas, and safe degradation paths.',
    guidance: () => 'Cost: estimate tokens/runtime/storage, enforce caps, and propose local/cloud fallback by budget.',
  },
  'legal-reviewer': {
    name: 'Legal Reviewer',
    role: 'Licensing, policy, and compliance wording review',
    scope: 'Flags legal/compliance risk and never gives final legal advice without human review.',
    guidance: () => 'Legal: flag license, privacy, procurement, safety, and compliance risks; require human counsel for final decisions.',
  },
} as const

export type AgentType = keyof typeof AGENT_ROLE_PROFILES
export const SUPPORTED_AGENT_TYPES = Object.keys(AGENT_ROLE_PROFILES) as AgentType[]
export const DEFAULT_AGENT_SET: AgentType[] = ['architect', 'designer', 'engineer']
// Gate out heuristic orchestrator in production (DEBT-AI-003)
export const ORCHESTRATOR_EXECUTION_MODE = process.env.NODE_ENV === 'production' ? 'disabled' : 'heuristic'
export const ORCHESTRATOR_CAPABILITY_STATUS = 'PARTIAL'
export const ORCHESTRATOR_DISCLAIMER =
  'Heuristic advisory mode: role outputs are policy-driven guidance and still require deterministic validation before apply.'

export type CoordinationPolicy = {
  nonOverlappingScopes: boolean
  applyGate: 'reviewer_required'
  executionOrder: AgentType[]
}

export const ORCHESTRATOR_COORDINATION_POLICY: CoordinationPolicy = {
  nonOverlappingScopes: true,
  applyGate: 'reviewer_required',
  executionOrder: SUPPORTED_AGENT_TYPES,
}

export function buildRoleScope(agent: AgentType): string {
  return AGENT_ROLE_PROFILES[agent]?.scope ?? 'Scoped execution role.'
}

export interface Agent {
  id: string
  type: AgentType
  name: string
  role: string
  status: 'idle' | 'thinking' | 'executing' | 'complete' | 'error'
}

export interface AgentMessage {
  agentId: string
  agentType: AgentType
  content: string
  thinking?: string
  timestamp: number
  status: 'pending' | 'streaming' | 'complete' | 'error'
}

export interface OrchestrationTask {
  id: string
  prompt: string
  agents: AgentType[]
  priority: 'low' | 'normal' | 'high'
  timeout: number
  createdAt: number
}

type TaskState = {
  cancelled: boolean
}

class AsyncQueue<T> {
  private items: T[] = []
  private waiters: Array<(result: IteratorResult<T>) => void> = []
  private closed = false

  push(item: T): void {
    if (this.closed) return
    const waiter = this.waiters.shift()
    if (waiter) {
      waiter({ value: item, done: false })
      return
    }
    this.items.push(item)
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift()
      waiter?.({ value: undefined as T, done: true })
    }
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.items.length > 0) {
      const value = this.items.shift() as T
      return { value, done: false }
    }
    if (this.closed) {
      return { value: undefined as T, done: true }
    }
    return await new Promise<IteratorResult<T>>((resolve) => {
      this.waiters.push(resolve)
    })
  }
}

/**
 * Streaming Agent Orchestrator
 * Multiple roles stream in parallel and interleave naturally.
 */
export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map()
  private tasks: Map<string, OrchestrationTask> = new Map()
  private taskStates: Map<string, TaskState> = new Map()

  constructor() {
    this.initializeAgents()
  }

  private initializeAgents(): void {
    for (const type of SUPPORTED_AGENT_TYPES) {
      const profile = AGENT_ROLE_PROFILES[type]
      this.agents.set(`${type}-001`, {
        id: `${type}-001`,
        type,
        name: profile.name,
        role: profile.role,
        status: 'idle',
      })
    }
  }

  executeParallel(task: OrchestrationTask): AsyncGenerator<AgentMessage> {
    this.tasks.set(task.id, task)
    this.taskStates.set(task.id, { cancelled: false })
    return this.streamAgentExecution(task)
  }

  private async *streamAgentExecution(task: OrchestrationTask): AsyncGenerator<AgentMessage> {
    const selectedAgents = Array.from(this.agents.values()).filter((agent) => task.agents.includes(agent.type))
    const queue = new AsyncQueue<AgentMessage>()
    const state = this.taskStates.get(task.id)

    if (!state || selectedAgents.length === 0) {
      queue.push({
        agentId: 'system',
        agentType: 'qa',
        content: 'No valid agents selected for this run.',
        timestamp: Date.now(),
        status: 'error',
      })
      queue.close()
    } else {
      Promise.allSettled(
        selectedAgents.map((agent) =>
          this.executeAgent(agent, task, state, queue).catch((error) => {
            this.agents.set(agent.id, { ...agent, status: 'error' })
            queue.push({
              agentId: agent.id,
              agentType: agent.type,
              content: error instanceof Error ? error.message : 'Agent execution failed.',
              timestamp: Date.now(),
              status: 'error',
            })
          })
        )
      ).finally(() => {
        this.tasks.delete(task.id)
        this.taskStates.delete(task.id)
        queue.close()
      })
    }

    while (true) {
      const result = await queue.next()
      if (result.done) break
      yield result.value
    }
  }

  private async executeAgent(
    agent: Agent,
    task: OrchestrationTask,
    state: TaskState,
    queue: AsyncQueue<AgentMessage>
  ): Promise<void> {
    if (state.cancelled) return

    this.agents.set(agent.id, { ...agent, status: 'thinking' })
    queue.push({
      agentId: agent.id,
      agentType: agent.type,
      content: `${agent.name} analyzing...`,
      thinking: `Task snippet: "${truncate(task.prompt, 96)}"`,
      timestamp: Date.now(),
      status: 'streaming',
    })

    this.agents.set(agent.id, { ...agent, status: 'executing' })

    try {
      const response = await this.callLlmForRole(agent.type, task.prompt, task.priority)

      if (state.cancelled) {
        this.agents.set(agent.id, { ...agent, status: 'idle' })
        return
      }

      const chunks = splitForStreaming(response)
      for (const chunk of chunks) {
        if (state.cancelled) {
          this.agents.set(agent.id, { ...agent, status: 'idle' })
          return
        }
        queue.push({
          agentId: agent.id,
          agentType: agent.type,
          content: chunk,
          timestamp: Date.now(),
          status: 'streaming',
        })
      }

      this.agents.set(agent.id, { ...agent, status: 'complete' })
      queue.push({
        agentId: agent.id,
        agentType: agent.type,
        content: 'Completed.',
        timestamp: Date.now(),
        status: 'complete',
      })
    } catch (error) {
      this.agents.set(agent.id, { ...agent, status: 'error' })
      queue.push({
        agentId: agent.id,
        agentType: agent.type,
        content: error instanceof Error ? error.message : 'LLM call failed.',
        timestamp: Date.now(),
        status: 'error',
      })
    }
  }

  /**
   * AETHEL FUSION: Real LLM call routed through the intelligent model router.
   * Replaces the old static `generateAgentResponse()` placebo.
   */
  private async callLlmForRole(
    agentType: AgentType,
    prompt: string,
    priority: OrchestrationTask['priority']
  ): Promise<string> {
    const profile = AGENT_ROLE_PROFILES[agentType]
    const taskHint = truncate(prompt, 120)
    const roleGuidance = profile.guidance(taskHint)

    const priorityHint =
      priority === 'high'
        ? 'Priority=high: start with P0 reliability and user-facing regressions.'
        : priority === 'low'
          ? 'Priority=low: focus on safe incremental closure.'
          : 'Priority=normal: balance reliability and speed.'

    const fusionConfig = resolveTaskKindForRole(agentType)

    const systemPrompt = [
      `You are the ${profile.name} role in a multi-agent orchestration.`,
      `Your role: ${profile.role}`,
      `Your scope: ${profile.scope}`,
      roleGuidance,
      priorityHint,
      ORCHESTRATOR_DISCLAIMER,
    ].join('\n')

    const result = await aiService.chat({
      taskKind: fusionConfig.taskKind,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      maxTokens: 2000,
      temperature: 0.3,
    })

    return result.content
  }

  getAgentStatus(): Agent[] {
    return Array.from(this.agents.values())
  }

  cancelTask(taskId: string): boolean {
    const state = this.taskStates.get(taskId)
    if (state) {
      state.cancelled = true
      this.taskStates.set(taskId, state)
    }
    const hadTask = this.tasks.delete(taskId)
    return Boolean(hadTask || state)
  }
}

function splitForStreaming(input: string): string[] {
  const segments = input.split(/(?<=[.?!])\s+/).map((segment) => segment.trim()).filter(Boolean)
  if (segments.length > 0) return segments
  return [input]
}

function truncate(input: string, limit: number): string {
  if (input.length <= limit) return input
  return `${input.slice(0, Math.max(0, limit - 3))}...`
}

let orchestrator: AgentOrchestrator | null = null

export function getOrchestrator(): AgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator()
  }
  return orchestrator
}
