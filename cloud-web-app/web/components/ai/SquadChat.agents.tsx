import { Brain, Code2, Shield, Sparkles } from 'lucide-react';

import type { AgentConfig, AgentRole } from './SquadChat.types';

// ============================================================================
// AGENTES CONFIGURACAO
// ============================================================================

export const AGENTS: Record<AgentRole, AgentConfig> = {
  architect: {
    id: 'architect',
    name: 'Arquiteto',
    title: 'Arquiteto de IA',
    icon: <Brain className="w-5 h-5" />,
    color: 'text-[var(--aethel-primary-light)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]',
    borderColor: 'border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)]',
    ringColor: 'ring-[color-mix(in_srgb,var(--aethel-primary)_45%,transparent)]',
    description: 'Planeja a estrutura e arquitetura da solucao',
  },
  engineer: {
    id: 'engineer',
    name: 'Engenheiro',
    title: 'Engenheiro de IA',
    icon: <Code2 className="w-5 h-5" />,
    color: 'text-[var(--aethel-info-light)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]',
    borderColor: 'border-[color-mix(in_srgb,var(--aethel-info)_50%,transparent)]',
    ringColor: 'ring-[color-mix(in_srgb,var(--aethel-info)_45%,transparent)]',
    description: 'Implementa o codigo e cria os files',
  },
  qa: {
    id: 'qa',
    name: 'QA',
    title: 'QA de IA',
    icon: <Shield className="w-5 h-5" />,
    color: 'text-[var(--aethel-success-light)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)]',
    borderColor: 'border-[color-mix(in_srgb,var(--aethel-success)_50%,transparent)]',
    ringColor: 'ring-[color-mix(in_srgb,var(--aethel-success)_45%,transparent)]',
    description: 'Validates, tests, and protects quality',
  },
  orchestrator: {
    id: 'orchestrator',
    name: 'Orquestrador',
    title: 'Orquestrador de IA',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-[var(--aethel-warning-light)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]',
    borderColor: 'border-[color-mix(in_srgb,var(--aethel-warning)_50%,transparent)]',
    ringColor: 'ring-[color-mix(in_srgb,var(--aethel-warning)_45%,transparent)]',
    description: 'Coordena o trabalho dos agentes',
  },
};
