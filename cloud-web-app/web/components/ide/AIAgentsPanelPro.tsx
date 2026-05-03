'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Bot,
  Play,
  Pause,
  Square,
  RefreshCw,
  Settings,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  MessageSquare,
  Code,
  Search,
  FileText,
  Terminal,
  Workflow,
  Brain,
  Sparkles,
  Layers,
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Zap,
  Network,
  GitBranch,
  Bug,
  Lightbulb,
  Boxes,
  Target,
  Cpu,
  Activity,
  AlertCircle,
  Info,
  X,
} from 'lucide-react'
import { OPENROUTER_MODEL_OPTIONS } from '@/lib/ai/openrouter-models'

// ============= Types =============

type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'waiting'

interface AgentTask {
  id: string
  description: string
  status: AgentStatus
  startedAt?: Date
  completedAt?: Date
  result?: string
  error?: string
  progress?: number
  subTasks?: AgentSubTask[]
}

interface AgentSubTask {
  id: string
  name: string
  status: AgentStatus
  duration?: number
  toolUsed?: string
}

interface Agent {
  id: string
  name: string
  type: AgentType
  description: string
  status: AgentStatus
  icon: string
  color: string
  capabilities: string[]
  currentTask?: AgentTask
  taskHistory: AgentTask[]
  metrics: AgentMetrics
}

interface AgentMetrics {
  tasksCompleted: number
  successRate: number
  avgDuration: number
  tokensUsed: number
}

type AgentType =
  | 'architect'
  | 'coder'
  | 'researcher'
  | 'debugger'
  | 'reviewer'
  | 'tester'
  | 'orchestrator'
  | 'dreamer'

interface AgentSession {
  id: string
  name: string
  agents: string[]
  createdAt: Date
  status: 'active' | 'completed' | 'paused'
  objective: string
}

// ============= Constants =============

const AGENT_TEMPLATES: Omit<Agent, 'id' | 'taskHistory' | 'metrics'>[] = [
  {
    name: 'Arquiteto',
    type: 'architect',
    description: 'Desenha arquitetura do sistema, planeja a implementacao e cria especificacoes tecnicas.',
    status: 'idle',
    icon: '🏗️',
    color: 'blue',
    capabilities: ['Design de sistema', 'Planejamento de API', 'Esquema de dados', 'Estrutura de componentes'],
  },
  {
    name: 'Dev',
    type: 'coder',
    description: 'Implementa features, escreve codigo limpo e segue boas praticas.',
    status: 'idle',
    icon: '💻',
    color: 'emerald',
    capabilities: ['Geracao de codigo', 'Refatoracao', 'Otimizacao', 'Documentacao'],
  },
  {
    name: 'Pesquisador',
    type: 'researcher',
    description: 'Pesquisa documentacao, encontra solucoes e coleta informacoes relevantes.',
    status: 'idle',
    icon: '🔬',
    color: 'cyan',
    capabilities: ['Busca web', 'Analise de docs', 'Pesquisa de API', 'Checagem de dependencias'],
  },
  {
    name: 'Depurador',
    type: 'debugger',
    description: 'Identifica e corrige bugs, analisa logs de erro e melhora a confiabilidade.',
    status: 'idle',
    icon: '🐛',
    color: 'red',
    capabilities: ['Analise de erros', 'Stack trace', 'Profiling de memoria', 'Performance'],
  },
  {
    name: 'Revisor',
    type: 'reviewer',
    description: 'Revisa a qualidade do codigo, sugere melhorias e garante boas praticas.',
    status: 'idle',
    icon: '👁️',
    color: 'amber',
    capabilities: ['Revisao de codigo', 'Auditoria de seguranca', 'Checagem de estilo', 'Seguranca de tipos'],
  },
  {
    name: 'QA',
    type: 'tester',
    description: 'Cria e executa testes, garante cobertura e valida a funcionalidade.',
    status: 'idle',
    icon: '🧪',
    color: 'cyan',
    capabilities: ['Testes unitarios', 'Testes de integracao', 'Testes E2E', 'Cobertura'],
  },
  {
    name: 'Orquestrador',
    type: 'orchestrator',
    description: 'Coordena varios agentes, gerencia fluxos e garante conclusao de tarefas.',
    status: 'idle',
    icon: '🎭',
    color: 'cyan',
    capabilities: ['Roteamento de tarefas', 'Coordenacao de agentes', 'Priorizacao', 'Workflow'],
  },
  {
    name: 'Visionario',
    type: 'dreamer',
    description: 'Agente criativo que explora solucoes inovadoras e gera novos conceitos.',
    status: 'idle',
    icon: '✨',
    color: 'blue',
    capabilities: ['Ideias criativas', 'Conceitos de UI/UX', 'Inovacao', 'Brainstorm'],
  },
]

// ============= Utility Functions =============

function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case 'running': return 'text-[var(--aethel-success)]'
    case 'paused': return 'text-[var(--aethel-warning)]'
    case 'completed': return 'text-[var(--aethel-info-light)]'
    case 'failed': return 'text-[var(--aethel-error)]'
    case 'waiting': return 'text-[var(--aethel-info-light)]'
    default: return 'text-[var(--aethel-text-tertiary)]'
  }
}

function formatStatusLabel(status: AgentStatus): string {
  switch (status) {
    case 'idle':
      return 'ocioso'
    case 'running':
      return 'executando'
    case 'paused':
      return 'pausado'
    case 'completed':
      return 'concluido'
    case 'failed':
      return 'falhou'
    case 'waiting':
      return 'aguardando'
    default:
      return status
  }
}

function getStatusIcon(status: AgentStatus) {
  switch (status) {
    case 'running': return <Loader2 className="w-4 h-4 animate-spin" />
    case 'paused': return <Pause className="w-4 h-4" />
    case 'completed': return <CheckCircle className="w-4 h-4" />
    case 'failed': return <XCircle className="w-4 h-4" />
    case 'waiting': return <Clock className="w-4 h-4" />
    default: return <Activity className="w-4 h-4" />
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function getAgentColorClasses(color: string): { bg: string; border: string; text: string } {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: 'bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)]', border: 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]', text: 'text-[var(--aethel-primary-light)]' },
    emerald: { bg: 'bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]', border: 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]', text: 'text-[var(--aethel-success)]' },
    cyan: { bg: 'bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]', border: 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]', text: 'text-[var(--aethel-info-light)]' },
    red: { bg: 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]', border: 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]', text: 'text-[var(--aethel-error)]' },
    amber: { bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]', border: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]', text: 'text-[var(--aethel-warning-light)]' },
  }
  return colors[color] || colors.blue
}

// ============= Sub-Components =============

interface AgentCardProps {
  agent: Agent
  isExpanded: boolean
  onToggleExpand: () => void
  onStart: () => void
  onPause: () => void
  onStop: () => void
  onConfigure: () => void
}

function AgentCard({ agent, isExpanded, onToggleExpand, onStart, onPause, onStop, onConfigure }: AgentCardProps) {
  const colors = getAgentColorClasses(agent.color)

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]"
        onClick={onToggleExpand}
      >
        <span className="text-2xl">{agent.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--aethel-text-primary)]">{agent.name}</span>
            <span className={`flex items-center gap-1 text-xs ${getStatusColor(agent.status)}`}>
              {getStatusIcon(agent.status)}
              {formatStatusLabel(agent.status)}
            </span>
          </div>
          <p className="text-xs text-[var(--aethel-text-tertiary)] truncate">{agent.description}</p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {agent.status === 'idle' && (
            <button type="button" aria-label={`Start agent ${agent.name}`}
              onClick={(e) => { e.stopPropagation(); onStart() }}
              className="p-1.5 rounded bg-[var(--aethel-success)] hover:brightness-110 text-[var(--aethel-text-primary)]"
              title="Iniciar agente"
            >
              <Play className="w-3 h-3" />
            </button>
          )}
          {agent.status === 'running' && (
            <>
              <button type="button" aria-label={`Pause agent ${agent.name}`}
                onClick={(e) => { e.stopPropagation(); onPause() }}
                className="p-1.5 rounded bg-[var(--aethel-warning)] hover:brightness-110 text-[var(--aethel-text-primary)]"
                title="Pausar agente"
              >
                <Pause className="w-3 h-3" />
              </button>
              <button type="button" aria-label={`Stop agent ${agent.name}`}
                onClick={(e) => { e.stopPropagation(); onStop() }}
                className="p-1.5 rounded bg-[var(--aethel-error)] hover:brightness-110 text-[var(--aethel-text-primary)]"
                title="Parar agente"
              >
                <Square className="w-3 h-3" />
              </button>
            </>
          )}
          {agent.status === 'paused' && (
            <>
              <button type="button" aria-label={`Resume agent ${agent.name}`}
                onClick={(e) => { e.stopPropagation(); onStart() }}
                className="p-1.5 rounded bg-[var(--aethel-success)] hover:brightness-110 text-[var(--aethel-text-primary)]"
                title="Retomar agente"
              >
                <Play className="w-3 h-3" />
              </button>
              <button type="button" aria-label={`Stop agent ${agent.name}`}
                onClick={(e) => { e.stopPropagation(); onStop() }}
                className="p-1.5 rounded bg-[var(--aethel-error)] hover:brightness-110 text-[var(--aethel-text-primary)]"
                title="Parar agente"
              >
                <Square className="w-3 h-3" />
              </button>
            </>
          )}
          <button type="button" aria-label={`Configure agent ${agent.name}`}
            onClick={(e) => { e.stopPropagation(); onConfigure() }}
            className="p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-tertiary)]"
            title="Configure"
          >
            <Settings className="w-3 h-3" />
          </button>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--aethel-text-tertiary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--aethel-border-primary)]">
          {/* Capabilities */}
          <div className="p-3 border-b border-[var(--aethel-border-primary)]">
            <div className="text-xs text-[var(--aethel-text-tertiary)] mb-2">Capacidades</div>
            <div className="flex flex-wrap gap-1">
              {agent.capabilities.map(cap => (
                <span
                  key={cap}
                  className={`px-2 py-0.5 text-xs rounded ${colors.bg} ${colors.text} border ${colors.border}`}
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Current Task */}
          {agent.currentTask && (
            <div className="p-3 border-b border-[var(--aethel-border-primary)]">
              <div className="text-xs text-[var(--aethel-text-tertiary)] mb-2">Tarefa atual</div>
              <div className="p-2 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] rounded">
                <p className="text-sm text-[var(--aethel-text-primary)] mb-1">{agent.currentTask.description}</p>
                {agent.currentTask.progress !== undefined && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-[var(--aethel-text-tertiary)] mb-1">
                      <span>Progresso</span>
                      <span>{agent.currentTask.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--aethel-surface-quaternary)] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bg.replace('/10', '')} transition-all`}
                        style={{ width: `${agent.currentTask.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                {agent.currentTask.subTasks && agent.currentTask.subTasks.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {agent.currentTask.subTasks.map(sub => (
                      <div key={sub.id} className="flex items-center gap-2 text-xs">
                        <span className={getStatusColor(sub.status)}>
                          {getStatusIcon(sub.status)}
                        </span>
                        <span className="text-[var(--aethel-text-secondary)]">{sub.name}</span>
                        {sub.duration && (
                          <span className="text-[var(--aethel-text-tertiary)] ml-auto">{formatDuration(sub.duration)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="p-3">
            <div className="text-xs text-[var(--aethel-text-tertiary)] mb-2">Metricas</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] rounded text-center">
                <div className="text-lg font-semibold text-[var(--aethel-text-primary)]">{agent.metrics.tasksCompleted}</div>
                <div className="text-xs text-[var(--aethel-text-tertiary)]">Tarefas concluidas</div>
              </div>
              <div className="p-2 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] rounded text-center">
                <div className="text-lg font-semibold text-[var(--aethel-success)]">{agent.metrics.successRate}%</div>
                <div className="text-xs text-[var(--aethel-text-tertiary)]">Taxa de sucesso</div>
              </div>
              <div className="p-2 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] rounded text-center">
                <div className="text-lg font-semibold text-[var(--aethel-warning-light)]">{formatDuration(agent.metrics.avgDuration)}</div>
                <div className="text-xs text-[var(--aethel-text-tertiary)]">Duracao media</div>
              </div>
              <div className="p-2 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] rounded text-center">
                <div className="text-lg font-semibold text-[var(--aethel-info-light)]">{(agent.metrics.tokensUsed / 1000).toFixed(1)}k</div>
                <div className="text-xs text-[var(--aethel-text-tertiary)]">Tokens usados</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============= Task Timeline Component =============

interface TaskTimelineProps {
  tasks: AgentTask[]
}

function TaskTimeline({ tasks }: TaskTimelineProps) {
  if (tasks.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--aethel-text-tertiary)] text-sm">
        Nenhuma tarefa no historico ainda.
      </div>
    )
  }

  return (
    <div className="space-y-2 p-2">
      {tasks.map((task, index) => (
        <div key={task.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full ${
              task.status === 'completed' ? 'bg-[var(--aethel-success)]' :
              task.status === 'failed' ? 'bg-[var(--aethel-error)]' :
              'bg-[var(--aethel-surface-quaternary)]'
            }`} />
            {index < tasks.length - 1 && (
              <div className="w-0.5 flex-1 bg-[var(--aethel-surface-quaternary)] my-1" />
            )}
          </div>
          <div className="flex-1 pb-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${
                task.status === 'completed' ? 'text-[var(--aethel-text-primary)]' :
                task.status === 'failed' ? 'text-[var(--aethel-error)]' :
                'text-[var(--aethel-text-tertiary)]'
              }`}>
                {task.description}
              </span>
            </div>
            <div className="text-xs text-[var(--aethel-text-tertiary)] mt-0.5">
              {task.completedAt
                ? `Concluida em ${formatDuration(task.completedAt.getTime() - (task.startedAt?.getTime() || 0))}`
                : task.startedAt
                  ? 'Em andamento...'
                  : 'Pendente'
              }
            </div>
            {task.error && (
              <div className="mt-1 text-xs text-[var(--aethel-error)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] p-2 rounded">
                {task.error}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============= Workflow Builder =============

interface WorkflowStepConfig {
  agent: Agent
  prompt: string
  dependsOn?: string[]
}

function WorkflowBuilder({
  agents,
  onCreateWorkflow,
}: {
  agents: Agent[]
  onCreateWorkflow: (steps: WorkflowStepConfig[]) => void
}) {
  const [steps, setSteps] = useState<WorkflowStepConfig[]>([])
  const [objective, setObjective] = useState('')

  const addStep = () => {
    if (agents.length === 0) return
    setSteps([...steps, { agent: agents[0], prompt: '' }])
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const updateStep = (index: number, updates: Partial<WorkflowStepConfig>) => {
    setSteps(steps.map((s, i) => i === index ? { ...s, ...updates } : s))
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-[var(--aethel-text-tertiary)] mb-1">Objetivo</label>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Descreva o que voce quer concluir..."
          className="w-full px-3 py-2 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] resize-none"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">Etapas do workflow</span>
          <button type="button" aria-label="Add workflow step"
            onClick={addStep}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--aethel-primary)] hover:brightness-110 text-[var(--aethel-text-primary)] rounded"
          >
            <Plus className="w-3 h-3" />
            Adicionar etapa
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="p-4 text-center text-[var(--aethel-text-tertiary)] text-sm border border-dashed border-[var(--aethel-border-secondary)] rounded">
            Adicione etapas para montar o workflow
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="p-3 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] border border-[var(--aethel-border-secondary)] rounded">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[var(--aethel-text-tertiary)]">Etapa {index + 1}</span>
                  <select
                    value={step.agent.id}
                    onChange={(e) => {
                      const agent = agents.find(a => a.id === e.target.value)
                      if (agent) updateStep(index, { agent })
                    }}
                    className="flex-1 px-2 py-1 bg-[var(--aethel-surface-quaternary)] border border-[var(--aethel-border-secondary)] rounded text-xs text-[var(--aethel-text-primary)]"
                  >
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                    ))}
                  </select>
                  <button type="button" aria-label={`Remove workflow step ${index + 1}`}
                    onClick={() => removeStep(index)}
                    className="p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error)]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={step.prompt}
                  onChange={(e) => updateStep(index, { prompt: e.target.value })}
                  placeholder={`Instrucoes para ${step.agent.name}...`}
                  className="w-full px-2 py-1 bg-[var(--aethel-surface-quaternary)] border border-[var(--aethel-border-secondary)] rounded text-xs text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)]"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <button type="button" aria-label="Start AI workflow"
        onClick={() => onCreateWorkflow(steps)}
        disabled={steps.length === 0 || !objective}
        className={`
          w-full py-2 rounded font-medium text-sm
          ${steps.length > 0 && objective
            ? 'bg-[var(--aethel-primary)] hover:brightness-110 text-[var(--aethel-text-primary)]'
            : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)] cursor-not-allowed'
          }
        `}
      >
        Iniciar workflow
      </button>
    </div>
  )
}

// ============= Main Component =============

interface AIAgentsPanelProProps {
  onSendToChat?: (message: string) => void
  className?: string
}

export default function AIAgentsPanelPro({ onSendToChat, className = '' }: AIAgentsPanelProProps) {
  const [agents, setAgents] = useState<Agent[]>(() =>
    AGENT_TEMPLATES.map((template, i) => ({
      ...template,
      id: `agent-${i}`,
      taskHistory: [],
      metrics: {
        tasksCompleted: Math.floor(Math.random() * 50),
        successRate: 85 + Math.floor(Math.random() * 15),
        avgDuration: 5000 + Math.floor(Math.random() * 25000),
        tokensUsed: Math.floor(Math.random() * 100000),
      },
    }))
  )

  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'agents' | 'workflow' | 'history'>('agents')
  const [sessions, setSessions] = useState<AgentSession[]>([])
  const [showAgentConfig, setShowAgentConfig] = useState<string | null>(null)

  // Toggle agent expansion
  const toggleAgentExpand = useCallback((id: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Agent controls
  const startAgent = useCallback((id: string) => {
    setAgents(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'running' as const } : a
    ))
  }, [])

  const pauseAgent = useCallback((id: string) => {
    setAgents(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'paused' as const } : a
    ))
  }, [])

  const stopAgent = useCallback((id: string) => {
    setAgents(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'idle' as const, currentTask: undefined } : a
    ))
  }, [])

  const configureAgent = useCallback((id: string) => {
    setShowAgentConfig(id)
  }, [])

  // Start all agents
  const startAllAgents = useCallback(() => {
    setAgents(prev => prev.map(a => ({ ...a, status: 'running' as const })))
  }, [])

  // Stop all agents
  const stopAllAgents = useCallback(() => {
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle' as const, currentTask: undefined })))
  }, [])

  // Create workflow
  const handleCreateWorkflow = useCallback((steps: WorkflowStepConfig[]) => {
    const workflowSummary = steps
      .map((step, index) => `${index + 1}. ${step.agent.name}: ${step.prompt}`)
      .join('\n')
    onSendToChat?.(
      `Workflow solicitado (${steps.length} etapas).\n${workflowSummary}\n\nStatus: WORKFLOW_EXECUTION_GATED (P1).`
    )
  }, [onSendToChat])

  const runningAgents = agents.filter(a => a.status === 'running').length
  const allHistory = agents.flatMap(a => a.taskHistory)

  return (
    <div className={`h-full flex flex-col bg-[var(--aethel-surface-secondary)] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[var(--aethel-info-light)]" />
          <span className="font-semibold text-[var(--aethel-text-primary)]">Agentes de IA</span>
          {runningAgents > 0 && (
            <span className="px-2 py-0.5 text-xs bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] text-[var(--aethel-success)] rounded-full">
              {runningAgents} ativos
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {runningAgents === 0 ? (
            <button type="button" aria-label="Start all agents"
              onClick={startAllAgents}
              className="p-1.5 rounded bg-[var(--aethel-success)] hover:brightness-110 text-[var(--aethel-text-primary)]"
              title="Iniciar todos"
            >
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" aria-label="Stop all agents"
              onClick={stopAllAgents}
              className="p-1.5 rounded bg-[var(--aethel-error)] hover:brightness-110 text-[var(--aethel-text-primary)]"
              title="Parar todos"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-[var(--aethel-border-primary)]">
        {(['agents', 'workflow', 'history'] as const).map(tab => (
          <button type="button" aria-label={`Open ${tab} agents tab`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize
              ${activeTab === tab
                ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)]'
              }
            `}
          >
            {tab === 'agents' && <Bot className="w-3 h-3 inline-block mr-1" />}
            {tab === 'workflow' && <Workflow className="w-3 h-3 inline-block mr-1" />}
            {tab === 'history' && <Clock className="w-3 h-3 inline-block mr-1" />}
            {tab === 'agents' ? 'Agentes' : tab === 'workflow' ? 'Workflow' : 'Historico'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'agents' && (
          <div className="p-3 space-y-2">
            {agents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isExpanded={expandedAgents.has(agent.id)}
                onToggleExpand={() => toggleAgentExpand(agent.id)}
                onStart={() => startAgent(agent.id)}
                onPause={() => pauseAgent(agent.id)}
                onStop={() => stopAgent(agent.id)}
                onConfigure={() => configureAgent(agent.id)}
              />
            ))}
          </div>
        )}

        {activeTab === 'workflow' && (
          <div className="p-3">
            <WorkflowBuilder
              agents={agents}
              onCreateWorkflow={handleCreateWorkflow}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <TaskTimeline tasks={allHistory} />
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="p-3 border-t border-[var(--aethel-border-primary)]">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-label="Send agents prompt to chat"
            onClick={() => onSendToChat?.('Criar uma nova feature usando agentes de IA')}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] rounded text-sm text-[var(--aethel-text-secondary)]"
          >
            <MessageSquare className="w-4 h-4" />
            Conversar com agentes
          </button>
          <button type="button" aria-label="Create quick AI agent task"
            className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--aethel-primary)] hover:brightness-110 rounded text-sm text-[var(--aethel-text-primary)]"
          >
            <Zap className="w-4 h-4" />
            Tarefa rapida
          </button>
        </div>
      </div>

      {/* Agent Config Modal */}
      {showAgentConfig && (
        <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] flex items-center justify-center z-50">
          <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-secondary)] rounded-lg w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--aethel-text-primary)]">
                Configure {agents.find(a => a.id === showAgentConfig)?.name}
              </h3>
              <button type="button" aria-label="Close agent configuration modal"
                onClick={() => setShowAgentConfig(null)}
                className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded"
              >
                <X className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--aethel-text-tertiary)] mb-1">Modelo</label>
                <select className="w-full px-3 py-2 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-sm text-[var(--aethel-text-primary)]">
                  {OPENROUTER_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--aethel-text-tertiary)] mb-1">Temperatura</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue="0.7"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--aethel-text-tertiary)] mb-1">Maximo de tokens</label>
                <input
                  type="number"
                  defaultValue="4096"
                  className="w-full px-3 py-2 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-sm text-[var(--aethel-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--aethel-text-tertiary)] mb-1">Prompt do sistema</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-sm text-[var(--aethel-text-primary)] resize-none"
                  placeholder="Instrucoes personalizadas para este agente..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button type="button" aria-label="Cancel agent configuration changes"
                onClick={() => setShowAgentConfig(null)}
                className="flex-1 px-3 py-2 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] rounded text-sm text-[var(--aethel-text-secondary)]"
              >
                Cancel
              </button>
              <button type="button" aria-label="Save agent configuration changes"
                onClick={() => setShowAgentConfig(null)}
                className="flex-1 px-3 py-2 bg-[var(--aethel-primary)] hover:brightness-110 rounded text-sm text-[var(--aethel-text-primary)]"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
