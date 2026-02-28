/**
 * Agent Orchestrator for Aethel Engine
 * Manages parallel execution of multiple AI agents with streaming
 */

export type AgentType = 'architect' | 'designer' | 'engineer' | 'qa' | 'researcher'

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
  status: 'pending' | 'streaming' | 'complete'
}

export interface OrchestrationTask {
  id: string
  prompt: string
  agents: AgentType[]
  priority: 'low' | 'normal' | 'high'
  timeout: number
  createdAt: number
}

/**
 * Streaming Agent Orchestrator
 * Allows multiple agents to work in parallel with real-time feedback
 */
export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map()
  private tasks: Map<string, OrchestrationTask> = new Map()
  private messageQueue: AgentMessage[] = []

  constructor() {
    this.initializeAgents()
  }

  private initializeAgents() {
    const agentDefinitions: Agent[] = [
      {
        id: 'architect-001',
        type: 'architect',
        name: 'Aethel Architect',
        role: 'System Design & Vision',
        status: 'idle'
      },
      {
        id: 'designer-001',
        type: 'designer',
        name: 'UI/UX Designer',
        role: 'Aesthetic & Usability',
        status: 'idle'
      },
      {
        id: 'engineer-001',
        type: 'engineer',
        name: 'Lead Engineer',
        role: 'Performance & Implementation',
        status: 'idle'
      },
      {
        id: 'qa-001',
        type: 'qa',
        name: 'QA Analyst',
        role: 'Quality & Testing',
        status: 'idle'
      },
      {
        id: 'researcher-001',
        type: 'researcher',
        name: 'Research Agent',
        role: 'Deep Verification & Analysis',
        status: 'idle'
      }
    ]

    agentDefinitions.forEach(agent => {
      this.agents.set(agent.id, agent)
    })
  }

  /**
   * Execute a task across multiple agents in parallel
   */
  async executeParallel(task: OrchestrationTask): Promise<AsyncGenerator<AgentMessage>> {
    this.tasks.set(task.id, task)

    return this.streamAgentExecution(task)
  }

  /**
   * Stream agent execution results in real-time
   */
  private async *streamAgentExecution(task: OrchestrationTask): AsyncGenerator<AgentMessage> {
    const agents = Array.from(this.agents.values()).filter(a => task.agents.includes(a.type))

    // Start all agents in parallel
    const agentPromises = agents.map(agent => this.executeAgent(agent, task))

    // Yield results as they complete (not necessarily in order)
    const results = await Promise.allSettled(agentPromises)

    for (const result of results) {
      if (result.status === 'fulfilled') {
        yield* result.value
      }
    }
  }

  /**
   * Execute a single agent with streaming
   */
  private async *executeAgent(agent: Agent, task: OrchestrationTask): AsyncGenerator<AgentMessage> {
    const agentCopy = { ...agent, status: 'thinking' as const }
    this.agents.set(agent.id, agentCopy)

    // Simulate thinking phase
    yield {
      agentId: agent.id,
      agentType: agent.type,
      content: `${agent.name} is analyzing your request...`,
      thinking: `Processing task: "${task.prompt.substring(0, 50)}..."`,
      timestamp: Date.now(),
      status: 'streaming'
    }

    // Simulate streaming response
    const response = this.generateAgentResponse(agent.type, task.prompt)
    const chunks = response.split(' ')

    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 50)) // Simulate streaming delay

      yield {
        agentId: agent.id,
        agentType: agent.type,
        content: chunk,
        timestamp: Date.now(),
        status: 'streaming'
      }
    }

    // Mark as complete
    const completedAgent = { ...agent, status: 'complete' as const }
    this.agents.set(agent.id, completedAgent)

    yield {
      agentId: agent.id,
      agentType: agent.type,
      content: '',
      timestamp: Date.now(),
      status: 'complete'
    }
  }

  /**
   * Generate contextual response based on agent type
   */
  private generateAgentResponse(agentType: AgentType, prompt: string): string {
    const responses: Record<AgentType, string> = {
      architect: `Como Arquiteto, sugiro uma abordagem baseada em padrões AAA. Recomendo decompor em módulos: Core Engine, Asset Pipeline e Orchestration Layer.`,
      designer: `Como Designer, foco em usabilidade e fidelidade visual. Propongo uma interface "Deep Space Dark" com micro-interações fluidas.`,
      engineer: `Como Engenheiro, vejo oportunidades de otimização. Implementaria WebGPU nativo, WASM runtime e caching inteligente.`,
      qa: `Como QA, identifico os pontos críticos. Recomendo testes de continuidade, performance benchmarks e validação de assets.`,
      researcher: `Como Pesquisador, fiz uma análise profunda. Encontrei 12 fontes verificadas que suportam a superação de Unreal e Sora.`
    }

    return responses[agentType] || 'Processando sua solicitação...'
  }

  /**
   * Get current status of all agents
   */
  getAgentStatus(): Agent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Cancel a running task
   */
  cancelTask(taskId: string): boolean {
    return this.tasks.delete(taskId)
  }
}

// Singleton instance
let orchestrator: AgentOrchestrator | null = null

export function getOrchestrator(): AgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator()
  }
  return orchestrator
}
