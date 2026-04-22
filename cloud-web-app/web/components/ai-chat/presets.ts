'use client'

import type { LucideIcon } from 'lucide-react'
import {
  Brain,
  Bug,
  Check,
  ClipboardList,
  Code,
  Layers,
  Lightbulb,
  MessageSquare,
  Play,
  Radio,
  Terminal,
  Wand2,
  Zap,
} from 'lucide-react'

export type AIChatConsoleMode = 'ask' | 'plan' | 'execute' | 'review' | 'live'
export type AIChatOpsTab = 'memory' | 'approval' | 'diff' | 'execution'

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

export const QUICK_PROMPTS: QuickPromptDefinition[] = [
  { icon: Brain, label: 'Explicar erro', prompt: 'Explique este erro e como corrigir:' },
  { icon: Bug, label: 'Corrigir arquivo', prompt: 'Corrija problemas neste arquivo:' },
  { icon: Zap, label: 'Otimizar', prompt: 'Otimize este codigo para desempenho:' },
  { icon: Wand2, label: 'Refatorar', prompt: 'Refatore este codigo:' },
  { icon: Layers, label: 'Gerar testes', prompt: 'Gere testes unitarios para:' },
  { icon: Code, label: 'Explicar codigo', prompt: 'Explique este codigo:' },
  { icon: Lightbulb, label: 'Melhorar UX', prompt: 'Sugira melhorias de UX para:' },
  { icon: Terminal, label: 'Gerar modulo', prompt: 'Gere um modulo para:' },
]

export const QUICK_MENTIONS: QuickMentionDefinition[] = [
  { label: '@codebase', value: '@codebase ' },
  { label: '@docs:api', value: '@docs:api ' },
  { label: '@git:diff', value: '@git:diff ' },
  { label: '@diagnostics', value: '@diagnostics ' },
]

export const CONSOLE_MODES: AIChatConsoleModeDefinition[] = [
  { id: 'ask', label: 'Perguntar', icon: MessageSquare, description: 'Perguntas rapidas' },
  { id: 'plan', label: 'Planejar', icon: Layers, description: 'Planejar tarefas' },
  { id: 'execute', label: 'Executar', icon: Play, description: 'Executar plano' },
  { id: 'review', label: 'Revisar', icon: Check, description: 'Revisar mudancas' },
  { id: 'live', label: 'Ao vivo', icon: Radio, description: 'Conversacao ao vivo' },
]

export const OPS_TABS: AIChatOpsTabDefinition[] = [
  { id: 'memory', label: 'Memoria', icon: Brain },
  { id: 'approval', label: 'Aprovacao', icon: Check },
  { id: 'diff', label: 'Diff', icon: Code },
  { id: 'execution', label: 'Execucao', icon: ClipboardList },
]
