'use client'

import { Activity, AlertTriangle, Check, Clock3, DollarSign, Users } from 'lucide-react'

export interface AgentInfo {
  id: string
  role: string
  name: string
  currentTask: string
  dependency?: string
  progress?: number
  output?: string
  confidence?: number
  cost?: number
  status: 'idle' | 'queued' | 'working' | 'completed' | 'blocked'
  telemetry?: 'live' | 'estimated' | 'unavailable'
}

export interface AgentBoardProps {
  agents: AgentInfo[]
  onAgentClick: (agentId: string) => void
}

/**
 * Multi-agent progress board - renders only the telemetry we actually have.
 */
export function AgentBoard({ agents, onAgentClick }: AgentBoardProps) {
  if (agents.length === 0) return null

  const hasPartialTelemetry = agents.some((agent) => agent.telemetry !== 'live')

  const statusConfig = {
    idle: {
      color: 'text-[var(--aethel-text-quaternary)]',
      bgColor: 'bg-[var(--aethel-surface-tertiary)]',
      icon: Users,
    },
    queued: {
      color: 'text-[var(--aethel-warning-light)]',
      bgColor: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]',
      icon: Clock3,
    },
    working: {
      color: 'text-[var(--aethel-info-light)]',
      bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]',
      icon: Activity,
    },
    completed: {
      color: 'text-[var(--aethel-success-light)]',
      bgColor: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]',
      icon: Check,
    },
    blocked: {
      color: 'text-[var(--aethel-error-light)]',
      bgColor: 'bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)]',
      icon: AlertTriangle,
    },
  } as const

  return (
    <div className="mx-4 mb-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--aethel-info-light)]" />
          <span className="text-xs font-semibold text-[var(--aethel-text-primary)]">Operacao multiagente</span>
          <span className="text-xs text-[var(--aethel-text-tertiary)]">{agents.length} agentes</span>
        </div>
        {hasPartialTelemetry && (
          <span className="rounded-full border border-[var(--aethel-border-secondary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)]">
            Telemetria parcial
          </span>
        )}
      </div>

      <div className="space-y-2">
        {agents.map((agent) => {
          const config = statusConfig[agent.status]
          const StatusIcon = config.icon
          const hasDetailedTelemetry =
            typeof agent.cost === 'number' ||
            typeof agent.confidence === 'number' ||
            typeof agent.progress === 'number'

          return (
            <div
              key={agent.id}
              onClick={() => onAgentClick(agent.id)}
              className={`cursor-pointer rounded-lg border border-[var(--aethel-border-secondary)] p-2 transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] ${config.bgColor}`}
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-3.5 w-3.5 ${config.color}`} />
                  <div>
                    <div className="text-xs font-medium text-[var(--aethel-text-primary)]">{agent.name}</div>
                    <div className="text-[10px] text-[var(--aethel-text-tertiary)]">{agent.role}</div>
                  </div>
                </div>

                <div className="text-right">
                  {hasDetailedTelemetry ? (
                    <>
                      {typeof agent.cost === 'number' && (
                        <div className="flex items-center gap-1 text-[10px] text-[var(--aethel-text-tertiary)]">
                          <DollarSign className="h-3 w-3" />
                          <span>${agent.cost.toFixed(4)}</span>
                        </div>
                      )}
                      {typeof agent.confidence === 'number' && (
                        <div className="flex items-center gap-1 text-[10px] text-[var(--aethel-text-tertiary)]">
                          <Activity className="h-3 w-3" />
                          <span>{agent.confidence.toFixed(0)}%</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-[10px] text-[var(--aethel-text-tertiary)]">Sem telemetria detalhada</div>
                  )}
                </div>
              </div>

              <div className="mb-2 text-[11px] text-[var(--aethel-text-secondary)]">{agent.currentTask}</div>

              {agent.dependency && (
                <div className="mb-2 text-[10px] text-[var(--aethel-text-quaternary)]">
                  Depende de: {agent.dependency}
                </div>
              )}

              {typeof agent.progress === 'number' ? (
                <>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--aethel-surface-quaternary)]">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)] transition-all duration-300"
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-[var(--aethel-text-quaternary)]">{agent.progress}%</span>
                    {agent.output && (
                      <span className="max-w-[120px] truncate text-[10px] text-[var(--aethel-info-light)]">
                        {agent.output}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-[var(--aethel-text-quaternary)]">
                  Telemetria por agente ainda nao disponivel nesta execucao.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AgentBoard
