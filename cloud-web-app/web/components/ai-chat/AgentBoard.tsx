'use client';

import { Activity, AlertTriangle, Check, DollarSign, Users } from 'lucide-react';

export interface AgentInfo {
  id: string;
  role: string;
  name: string;
  currentTask: string;
  dependency?: string;
  progress: number;
  output?: string;
  confidence: number;
  cost: number;
  status: 'idle' | 'working' | 'completed' | 'blocked';
}

export interface AgentBoardProps {
  agents: AgentInfo[];
  onAgentClick: (agentId: string) => void;
}

/**
 * Multi-agent progress board — shows per-agent status, progress bar,
 * cost & confidence. Extracted from AIChatPanelPro.tsx.
 */
export function AgentBoard({ agents, onAgentClick }: AgentBoardProps) {
  if (agents.length === 0) return null;

  const statusConfig = {
    idle: {
      color: 'text-[var(--aethel-text-quaternary)]',
      bgColor: 'bg-[var(--aethel-surface-tertiary)]',
      icon: Users,
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
  } as const;

  return (
    <div className="mx-4 mb-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--aethel-info-light)]" />
          <span className="text-xs font-semibold text-[var(--aethel-text-primary)]">Operacao multiagente</span>
          <span className="text-xs text-[var(--aethel-text-tertiary)]">{agents.length} agentes</span>
        </div>
      </div>
      <div className="space-y-2">
        {agents.map((agent) => {
          const config = statusConfig[agent.status];
          const StatusIcon = config.icon;
          return (
            <div
              key={agent.id}
              onClick={() => onAgentClick?.(agent.id)}
              className={`p-2 rounded-lg border border-[var(--aethel-border-secondary)] ${config.bgColor} transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
                  <div>
                    <div className="text-xs font-medium text-[var(--aethel-text-primary)]">{agent.name}</div>
                    <div className="text-[10px] text-[var(--aethel-text-tertiary)]">{agent.role}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[10px] text-[var(--aethel-text-tertiary)]">
                    <DollarSign className="w-3 h-3" />
                    ${agent.cost.toFixed(4)}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[var(--aethel-text-tertiary)]">
                    <Activity className="w-3 h-3" />
                    {agent.confidence.toFixed(0)}%
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-[var(--aethel-text-secondary)] mb-2">{agent.currentTask}</div>
              {agent.dependency && (
                <div className="text-[10px] text-[var(--aethel-text-quaternary)] mb-2">
                  Depende de: {agent.dependency}
                </div>
              )}
              <div className="relative h-1.5 bg-[var(--aethel-surface-quaternary)] rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)] transition-all duration-300"
                  style={{ width: `${agent.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-[var(--aethel-text-quaternary)]">{agent.progress}%</span>
                {agent.output && (
                  <span className="text-[10px] text-[var(--aethel-info-light)] truncate max-w-[120px]">
                    {agent.output}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AgentBoard;
