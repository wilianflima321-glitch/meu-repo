/**
 * Agent Orchestrator for Aethel Engine
 * Streams parallel agent messages with explicit cancellation semantics.
 */

export const SUPPORTED_AGENT_TYPES = ['architect', 'designer', 'engineer', 'qa', 'researcher'] as const
export type AgentType = (typeof SUPPORTED_AGENT_TYPES)[number]
export const DEFAULT_AGENT_SET: AgentType[] = ['architect', 'designer', 'engineer']

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
    const agentDefinitions: Agent[] = [
      { id: 'architect-001', type: 'architect', name: 'Architect', role: 'System decomposition and risk mapping', status: 'idle' },
      { id: 'designer-001', type: 'designer', name: 'Designer', role: 'UX, interaction, and visual consistency', status: 'idle' },
      { id: 'engineer-001', type: 'engineer', name: 'Engineer', role: 'Implementation, runtime, and performance', status: 'idle' },
      { id: 'qa-001', type: 'qa', name: 'QA', role: 'Validation strategy and regression prevention', status: 'idle' },
      { id: 'researcher-001', type: 'researcher', name: 'Researcher', role: 'Evidence, assumptions, and gap analysis', status: 'idle' },
    ]

    for (const agent of agentDefinitions) {
      this.agents.set(agent.id, agent)
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
      content: `${agent.name} started.`,
      thinking: `Task snippet: "${truncate(task.prompt, 96)}"`,
      timestamp: Date.now(),
      status: 'streaming',
    })

    this.agents.set(agent.id, { ...agent, status: 'executing' })
    const response = this.generateAgentResponse(agent.type, task.prompt, task.priority)
    const chunks = splitForStreaming(response)

    for (const chunk of chunks) {
      if (state.cancelled) {
        this.agents.set(agent.id, { ...agent, status: 'idle' })
        return
      }

      await delay(randomInt(35, 90))
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
  }

  private generateAgentResponse(agentType: AgentType, prompt: string, priority: OrchestrationTask['priority']): string {
    const taskHint = truncate(prompt, 120)

    const baseByRole: Record<AgentType, string> = {
      architect:
        `Plan: decompose "${taskHint}" into small steps, define contracts first, then sequence implementation with rollback points.`,
      designer:
        'UX: enforce explicit loading/error/empty states, keyboard-first behavior, and remove misleading CTAs from partial capabilities.',
      engineer:
        'Execution: implement minimal diff with stable interfaces, add runtime guards, and keep performance impact measurable.',
      qa:
        'Validation: check route contracts, no-fake-success behavior, and edge cases (invalid input, cancellation, rate limits).',
      researcher:
        'Evidence: mark assumptions explicitly, separate verified facts from hypotheses, and avoid unsupported production claims.',
    }

    const priorityHint =
      priority === 'high'
        ? 'Priority=high: start with P0 reliability and user-facing regressions.'
        : priority === 'low'
          ? 'Priority=low: focus on safe incremental closure.'
          : 'Priority=normal: balance reliability and speed.'

    return `${baseByRole[agentType]} ${priorityHint} Output is advisory and requires repository validation before apply.`
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

let orchestrator: AgentOrchestrator | null = null

export function getOrchestrator(): AgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator()
  }
  return orchestrator
}
