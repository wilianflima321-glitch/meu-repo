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
    name: 'Architect',
    type: 'architect',
    description: 'Designs system architecture, plans implementation strategies, and creates technical specifications.',
    status: 'idle',
    icon: '🏗️',
    color: 'indigo',
    capabilities: ['System Design', 'API Planning', 'Database Schema', 'Component Structure'],
  },
  {
    name: 'Coder',
    type: 'coder',
    description: 'Implements features, writes clean code, and follows best practices for the chosen language.',
    status: 'idle',
    icon: '💻',
    color: 'emerald',
    capabilities: ['Code Generation', 'Refactoring', 'Optimization', 'Documentation'],
  },
  {
    name: 'Researcher',
    type: 'researcher',
    description: 'Searches documentation, finds solutions, and gathers relevant information for tasks.',
    status: 'idle',
    icon: '🔬',
    color: 'purple',
    capabilities: ['Web Search', 'Doc Analysis', 'API Research', 'Dependency Check'],
  },
  {
    name: 'Debugger',
    type: 'debugger',
    description: 'Identifies and fixes bugs, analyzes error logs, and improves code reliability.',
    status: 'idle',
    icon: '🐛',
    color: 'red',
    capabilities: ['Error Analysis', 'Stack Trace', 'Memory Profiling', 'Performance'],
  },
  {
    name: 'Reviewer',
    type: 'reviewer',
    description: 'Reviews code quality, suggests improvements, and ensures best practices are followed.',
    status: 'idle',
    icon: '👁️',
    color: 'amber',
    capabilities: ['Code Review', 'Security Audit', 'Style Check', 'Type Safety'],
  },
  {
    name: 'Tester',
    type: 'tester',
    description: 'Creates and runs tests, ensures code coverage, and validates functionality.',
    status: 'idle',
    icon: '🧪',
    color: 'cyan',
    capabilities: ['Unit Tests', 'Integration Tests', 'E2E Tests', 'Coverage'],
  },
  {
    name: 'Orchestrator',
    type: 'orchestrator',
    description: 'Coordinates multiple agents, manages workflows, and ensures task completion.',
    status: 'idle',
    icon: '🎭',
    color: 'pink',
    capabilities: ['Task Routing', 'Agent Coordination', 'Priority Management', 'Workflow'],
  },
  {
    name: 'AI Dream',
    type: 'dreamer',
    description: 'Creative ideation agent that explores innovative solutions and generates new concepts.',
    status: 'idle',
    icon: '✨',
    color: 'violet',
    capabilities: ['Creative Ideas', 'UI/UX Concepts', 'Innovation', 'Brainstorming'],
  },
]

// ============= Utility Functions =============

function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case 'running': return 'text-emerald-400'
    case 'paused': return 'text-amber-400'
    case 'completed': return 'text-blue-400'
    case 'failed': return 'text-red-400'
    case 'waiting': return 'text-purple-400'
    default: return 'text-slate-400'
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
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
  }
  return colors[color] || colors.indigo
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
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5"
        onClick={onToggleExpand}
      >
        <span className="text-2xl">{agent.icon}</span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{agent.name}</span>
            <span className={`flex items-center gap-1 text-xs ${getStatusColor(agent.status)}`}>
              {getStatusIcon(agent.status)}
              {agent.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate">{agent.description}</p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {agent.status === 'idle' && (
            <button
              onClick={(e) => { e.stopPropagation(); onStart() }}
              className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
              title="Start Agent"
            >
              <Play className="w-3 h-3" />
            </button>
          )}
          {agent.status === 'running' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onPause() }}
                className="p-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white"
                title="Pause Agent"
              >
                <Pause className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onStop() }}
                className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white"
                title="Stop Agent"
              >
                <Square className="w-3 h-3" />
              </button>
            </>
          )}
          {agent.status === 'paused' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onStart() }}
                className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                title="Resume Agent"
              >
                <Play className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onStop() }}
                className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white"
                title="Stop Agent"
              >
                <Square className="w-3 h-3" />
              </button>
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onConfigure() }}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400"
            title="Configure"
          >
            <Settings className="w-3 h-3" />
          </button>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/10">
          {/* Capabilities */}
          <div className="p-3 border-b border-white/5">
            <div className="text-xs text-slate-500 mb-2">Capabilities</div>
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
            <div className="p-3 border-b border-white/5">
              <div className="text-xs text-slate-500 mb-2">Current Task</div>
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-sm text-white mb-1">{agent.currentTask.description}</p>
                {agent.currentTask.progress !== undefined && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Progress</span>
                      <span>{agent.currentTask.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
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
                        <span className="text-slate-300">{sub.name}</span>
                        {sub.duration && (
                          <span className="text-slate-500 ml-auto">{formatDuration(sub.duration)}</span>
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
            <div className="text-xs text-slate-500 mb-2">Metrics</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-800/50 rounded text-center">
                <div className="text-lg font-semibold text-white">{agent.metrics.tasksCompleted}</div>
                <div className="text-xs text-slate-400">Tasks Done</div>
              </div>
              <div className="p-2 bg-slate-800/50 rounded text-center">
                <div className="text-lg font-semibold text-emerald-400">{agent.metrics.successRate}%</div>
                <div className="text-xs text-slate-400">Success Rate</div>
              </div>
              <div className="p-2 bg-slate-800/50 rounded text-center">
                <div className="text-lg font-semibold text-amber-400">{formatDuration(agent.metrics.avgDuration)}</div>
                <div className="text-xs text-slate-400">Avg Duration</div>
              </div>
              <div className="p-2 bg-slate-800/50 rounded text-center">
                <div className="text-lg font-semibold text-purple-400">{(agent.metrics.tokensUsed / 1000).toFixed(1)}k</div>
                <div className="text-xs text-slate-400">Tokens Used</div>
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
      <div className="p-4 text-center text-slate-500 text-sm">
        No tasks in history yet.
      </div>
    )
  }
  
  return (
    <div className="space-y-2 p-2">
      {tasks.map((task, index) => (
        <div key={task.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full ${
              task.status === 'completed' ? 'bg-emerald-500' :
              task.status === 'failed' ? 'bg-red-500' :
              'bg-slate-600'
            }`} />
            {index < tasks.length - 1 && (
              <div className="w-0.5 flex-1 bg-slate-700 my-1" />
            )}
          </div>
          <div className="flex-1 pb-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${
                task.status === 'completed' ? 'text-white' :
                task.status === 'failed' ? 'text-red-400' :
                'text-slate-400'
              }`}>
                {task.description}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {task.completedAt 
                ? `Completed ${formatDuration(task.completedAt.getTime() - (task.startedAt?.getTime() || 0))}`
                : task.startedAt 
                  ? 'In progress...'
                  : 'Pending'
              }
            </div>
            {task.error && (
              <div className="mt-1 text-xs text-red-400 bg-red-500/10 p-2 rounded">
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
        <label className="block text-xs text-slate-400 mb-1">Objective</label>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Describe what you want to accomplish..."
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 resize-none"
          rows={2}
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Workflow Steps</span>
          <button
            onClick={addStep}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded"
          >
            <Plus className="w-3 h-3" />
            Add Step
          </button>
        </div>
        
        {steps.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm border border-dashed border-slate-700 rounded">
            Add steps to build your workflow
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="p-3 bg-slate-800/50 border border-slate-700 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-500">Step {index + 1}</span>
                  <select
                    value={step.agent.id}
                    onChange={(e) => {
                      const agent = agents.find(a => a.id === e.target.value)
                      if (agent) updateStep(index, { agent })
                    }}
                    className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                  >
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeStep(index)}
                    className="p-1 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={step.prompt}
                  onChange={(e) => updateStep(index, { prompt: e.target.value })}
                  placeholder={`Instructions for ${step.agent.name}...`}
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white placeholder-slate-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button
        onClick={() => onCreateWorkflow(steps)}
        disabled={steps.length === 0 || !objective}
        className={`
          w-full py-2 rounded font-medium text-sm
          ${steps.length > 0 && objective
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }
        `}
      >
        Start Workflow
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
    console.log('Creating workflow with steps:', steps)
    // TODO: Implement actual workflow creation
  }, [])
  
  const runningAgents = agents.filter(a => a.status === 'running').length
  const allHistory = agents.flatMap(a => a.taskHistory)
  
  return (
    <div className={`h-full flex flex-col bg-slate-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-white">AI Agents</span>
          {runningAgents > 0 && (
            <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
              {runningAgents} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {runningAgents === 0 ? (
            <button
              onClick={startAllAgents}
              className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
              title="Start All"
            >
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={stopAllAgents}
              className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white"
              title="Stop All"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-slate-800">
        {(['agents', 'workflow', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize
              ${activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }
            `}
          >
            {tab === 'agents' && <Bot className="w-3 h-3 inline-block mr-1" />}
            {tab === 'workflow' && <Workflow className="w-3 h-3 inline-block mr-1" />}
            {tab === 'history' && <Clock className="w-3 h-3 inline-block mr-1" />}
            {tab}
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
      <div className="p-3 border-t border-slate-800">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSendToChat?.('Create a new feature using AI agents')}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300"
          >
            <MessageSquare className="w-4 h-4" />
            Chat with Agents
          </button>
          <button
            className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm text-white"
          >
            <Zap className="w-4 h-4" />
            Quick Task
          </button>
        </div>
      </div>
      
      {/* Agent Config Modal */}
      {showAgentConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">
                Configure {agents.find(a => a.id === showAgentConfig)?.name}
              </h3>
              <button
                onClick={() => setShowAgentConfig(null)}
                className="p-1 hover:bg-slate-800 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Model</label>
                <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white">
                  <option>GPT-4o (recommended)</option>
                  <option>GPT-4o mini</option>
                  <option>Claude Sonnet 4</option>
                  <option>Gemini 2.0 Flash</option>
                  <option>DeepSeek R1</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Temperature</label>
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
                <label className="block text-xs text-slate-400 mb-1">Max Tokens</label>
                <input
                  type="number"
                  defaultValue="4096"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">System Prompt</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white resize-none"
                  placeholder="Custom instructions for this agent..."
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAgentConfig(null)}
                className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAgentConfig(null)}
                className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
