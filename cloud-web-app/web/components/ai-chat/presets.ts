'use client'

import type { LucideIcon } from 'lucide-react'
import {
  Brain,
  DollarSign,
  Bug,
  Check,
  ClipboardList,
  Code,
  Layers,
  Lightbulb,
  MessageSquare,
  Play,
  Radio,
  SearchCheck,
  ScrollText,
  Terminal,
  Wand2,
  Zap,
} from 'lucide-react'

export type AIChatConsoleMode = 'ask' | 'plan' | 'execute' | 'review' | 'live'
export type AIChatOpsTab = 'memory' | 'rules' | 'evidence' | 'economics' | 'approval' | 'diff' | 'execution'

export interface QuickPromptDefinition {
  icon: LucideIcon
  label: string
  prompt: string
}

export interface QuickMentionDefinition {
  label: string
  value: string
}

export interface AIChatConsoleModeDefinition {
  id: AIChatConsoleMode
  label: string
  icon: LucideIcon
  description: string
}

export interface AIChatOpsTabDefinition {
  id: AIChatOpsTab
  label: string
  icon: LucideIcon
}

export interface AIChatModePreset {
  placeholder: string
  helper: string
  submitLabel: string
  emptyStateTitle: string
  emptyStateDescription: string
  quickPrompts: QuickPromptDefinition[]
  quickMentions: QuickMentionDefinition[]
}

export const QUICK_PROMPTS: QuickPromptDefinition[] = [
  { icon: Brain, label: 'Explain error', prompt: 'Explain this error and how to fix it:' },
  { icon: Bug, label: 'Fix file', prompt: 'Fix issues in this file:' },
  { icon: Zap, label: 'Optimize', prompt: 'Optimize this code for performance:' },
  { icon: Wand2, label: 'Refactor', prompt: 'Refactor this code:' },
  { icon: Layers, label: 'Generate tests', prompt: 'Generate unit tests for:' },
  { icon: Code, label: 'Explain code', prompt: 'Explain this code:' },
  { icon: Lightbulb, label: 'Improve UX', prompt: 'Suggest UX improvements for:' },
  { icon: Terminal, label: 'Generate module', prompt: 'Generate a module for:' },
]

export const QUICK_MENTIONS: QuickMentionDefinition[] = [
  { label: '@codebase', value: '@codebase ' },
  { label: '@docs:api', value: '@docs:api ' },
  { label: '@git:diff', value: '@git:diff ' },
  { label: '@diagnostics', value: '@diagnostics ' },
]

export const CONSOLE_MODES: AIChatConsoleModeDefinition[] = [
  { id: 'ask', label: 'Ask', icon: MessageSquare, description: 'Quick questions' },
  { id: 'plan', label: 'Plan', icon: Layers, description: 'Plan tasks' },
  { id: 'execute', label: 'Execute', icon: Play, description: 'Execute plan' },
  { id: 'review', label: 'Review', icon: Check, description: 'Review changes' },
  { id: 'live', label: 'Live', icon: Radio, description: 'Live conversation' },
]

export const OPS_TABS: AIChatOpsTabDefinition[] = [
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'rules', label: 'Rules', icon: ScrollText },
  { id: 'evidence', label: 'Evidence', icon: SearchCheck },
  { id: 'economics', label: 'Economics', icon: DollarSign },
  { id: 'approval', label: 'Approval', icon: Check },
  { id: 'diff', label: 'Diff', icon: Code },
  { id: 'execution', label: 'Execution', icon: ClipboardList },
]

export const MODE_PRESETS: Record<AIChatConsoleMode, AIChatModePreset> = {
  ask: {
    placeholder: 'Ask AI about your code, error, or architecture...',
    helper: 'Best for quick questions, explanations, and focused unblocking.',
    submitLabel: 'Send question',
    emptyStateTitle: 'Ask and unblock quickly',
    emptyStateDescription:
      'Use direct questions to explain code, investigate an error, or understand the next step without leaving the artifact.',
    quickPrompts: QUICK_PROMPTS,
    quickMentions: QUICK_MENTIONS,
  },
  plan: {
    placeholder: 'Describe the goal and I will build a clear plan with steps, risks, and execution order...',
    helper: 'Best for turning a goal into steps, risks, dependencies, and attack order.',
    submitLabel: 'Generate plan',
    emptyStateTitle: 'Build a plan before acting',
    emptyStateDescription:
      'Ask for execution sequence, risks, and priorities to avoid rework before editing.',
    quickPrompts: [
      { icon: Layers, label: 'Break into steps', prompt: 'Break this goal into executable steps with priorities:' },
      { icon: ClipboardList, label: 'Map risks', prompt: 'Map risks, dependencies, and mitigations for:' },
      { icon: Brain, label: 'Technical plan', prompt: 'Propose a lean technical plan for:' },
      { icon: Lightbulb, label: 'Next steps', prompt: 'List the most valuable next steps for:' },
    ],
    quickMentions: [
      { label: '@codebase', value: '@codebase ' },
      { label: '@docs:api', value: '@docs:api ' },
      { label: '@git:status', value: '@git:status ' },
      { label: '@diagnostics', value: '@diagnostics ' },
    ],
  },
  execute: {
    placeholder: 'Describe the change and I will focus on actionable steps, diff/apply, and execution...',
    helper: 'Best for turning a plan into concrete editor and runtime actions.',
    submitLabel: 'Execute',
    emptyStateTitle: 'Move from plan to execution',
    emptyStateDescription:
      'Use this mode when you want actionable instructions, snippets, diffs, or apply steps oriented to the current artifact.',
    quickPrompts: [
      { icon: Play, label: 'Execute plan', prompt: 'Execute this plan in concrete steps and identify the first diff:' },
      { icon: Terminal, label: 'Prepare diff', prompt: 'Prepare the change with diff/apply focus for:' },
      { icon: Wand2, label: 'Implement', prompt: 'Implement this improvement with clear, focused steps:' },
      { icon: Zap, label: 'Unblock now', prompt: 'What is the most immediate action to unblock this now?' },
    ],
    quickMentions: [
      { label: '@git:diff', value: '@git:diff ' },
      { label: '@selection', value: '@selection ' },
      { label: '@terminal', value: '@terminal ' },
      { label: '@diagnostics', value: '@diagnostics ' },
    ],
  },
  review: {
    placeholder: 'Paste the diff, error, or file and I will review risks, regressions, and missing tests...',
    helper: 'Best for reviewing changes with focus on risk, regressions, and final quality.',
    submitLabel: 'Review',
    emptyStateTitle: 'Critical review without losing context',
    emptyStateDescription:
      'Ask for an objective review of changes, coverage, regressions, and risk signals before moving on.',
    quickPrompts: [
      { icon: Check, label: 'Review diff', prompt: 'Critically review this diff and identify concrete risks:' },
      { icon: Bug, label: 'Hunt regressions', prompt: 'Which regressions or side effects should I expect in:' },
      { icon: Layers, label: 'Validate tests', prompt: 'Which tests are missing to protect this change?' },
      { icon: Code, label: 'Technical review', prompt: 'Give an honest technical review of this code:' },
    ],
    quickMentions: [
      { label: '@git:diff', value: '@git:diff ' },
      { label: '@selection', value: '@selection ' },
      { label: '@codebase', value: '@codebase ' },
      { label: '@diagnostics', value: '@diagnostics ' },
    ],
  },
  live: {
    placeholder: 'Chat while AI works, request interruptions, or redirect the next step...',
    helper: 'Best for real-time follow-up, quick redirects, and short iteration.',
    submitLabel: 'Send live',
    emptyStateTitle: 'Follow execution in real time',
    emptyStateDescription:
      'Use this mode to intervene in the flow, change direction quickly, and keep AI synced with the current moment.',
    quickPrompts: [
      { icon: Radio, label: 'Summarize status', prompt: 'Summarize current status in one line and propose the next step:' },
      { icon: Play, label: 'Continue', prompt: 'Continue from here without repeating already resolved context:' },
      { icon: Wand2, label: 'Refine answer', prompt: 'Refine the previous answer more objectively:' },
      { icon: Terminal, label: 'Unblock runtime', prompt: 'Which quick check should I run now in this runtime?' },
    ],
    quickMentions: [
      { label: '@terminal', value: '@terminal ' },
      { label: '@selection', value: '@selection ' },
      { label: '@git:status', value: '@git:status ' },
      { label: '@codebase', value: '@codebase ' },
    ],
  },
}
