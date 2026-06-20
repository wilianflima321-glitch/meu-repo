/**
 * @deprecated Use the unified AutonomousAgent in `agent-mode.ts` (DEBT-AI-002, DEBT-AI-011).
 * Contrato do modo agente: leitura/escrita de arquivos, shell e revisao.
 * A execucao real vira em camadas sobre a ponte `ai-apply-bridge` e as APIs `/api/files/*`.
 */

export type AgentToolKind = 'read_file' | 'write_file' | 'run_terminal' | 'list_dir' | 'think'

export type AgentStepStatus = 'pending' | 'running' | 'ok' | 'error' | 'skipped'

export interface AgentStep {
  id: string
  kind: AgentToolKind
  label: string
  status: AgentStepStatus
  detail?: string
}

export type AgentSessionState = 'idle' | 'planning' | 'executing' | 'awaiting_approval' | 'done' | 'error'

export interface AgentSession {
  id: string
  projectId: string
  state: AgentSessionState
  goal: string
  steps: AgentStep[]
  startedAt: string
  updatedAt: string
}

export type AgentModeContext = {
  projectId: string
}

export function createAgentSession(ctx: AgentModeContext, goal: string): AgentSession {
  const now = new Date().toISOString()
  return {
    id: `agent-${Date.now()}`,
    projectId: ctx.projectId,
    state: 'idle',
    goal,
    steps: [],
    startedAt: now,
    updatedAt: now,
  }
}

export function appendAgentStep(session: AgentSession, step: Omit<AgentStep, 'id'>): AgentSession {
  const id = `step-${session.steps.length + 1}`
  return {
    ...session,
    steps: [...session.steps, { ...step, id }],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Quando `/api/studio/tasks/*` falha, mostramos a sequencia esperada do agente
 * sem simular sucesso operacional.
 */
export function buildLocalAgentPlanPreview(ctx: AgentModeContext, goal: string): AgentSession {
  let session = createAgentSession(ctx, goal.trim())
  session.state = 'planning'

  session = appendAgentStep(session, {
    kind: 'think',
    label: 'Analisar objetivo e delimitar escopo',
    status: 'ok',
    detail: 'Pre-visualizacao local. Ative a API de tarefas para execucao real.',
  })

  session = appendAgentStep(session, {
    kind: 'list_dir',
    label: 'Mapear arquivos do projeto',
    status: 'pending',
  })

  session = appendAgentStep(session, {
    kind: 'read_file',
    label: 'Ler contexto nos arquivos relevantes',
    status: 'pending',
  })

  session = appendAgentStep(session, {
    kind: 'write_file',
    label: 'Propor alteracoes e revisar diff antes de gravar',
    status: 'pending',
  })

  session = appendAgentStep(session, {
    kind: 'run_terminal',
    label: 'Validar com comandos quando suportado',
    status: 'skipped',
    detail: 'Opcional; depende de sandbox ou terminal no produto.',
  })

  session.state = 'awaiting_approval'
  return session
}
