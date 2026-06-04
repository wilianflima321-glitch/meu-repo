import type { ReactNode } from 'react';

// ============================================================================
// TIPOS
// ============================================================================

export type AgentRole = 'architect' | 'engineer' | 'qa' | 'orchestrator';
export type TaskPhase = 'planning' | 'building' | 'validating' | 'complete' | 'error';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface AgentConfig {
  id: AgentRole;
  name: string;
  title: string;
  icon: ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  ringColor: string;
  description: string;
}

export interface TaskStep {
  id: string;
  agentId: AgentRole;
  phase: TaskPhase;
  message: string;
  detail?: string;
  code?: string;
  diff?: { before: string; after: string };
  timestamp: Date;
  duration?: number;
}

export interface SquadMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  task?: SquadTask;
}

export interface SquadTask {
  id: string;
  prompt: string;
  status: TaskPhase;
  steps: TaskStep[];
  result?: string;
  files?: string[];
  creditsUsed: number;
  startTime: Date;
  endTime?: Date;
}

export interface SquadChatProps {
  projectId: string;
  onFileChange?: (path: string, content: string) => void;
  onApplyDiff?: (path: string, diff: { before: string; after: string }) => void;
  className?: string;
}
