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
  SearchCheck,
  ScrollText,
  Terminal,
  Wand2,
  Zap,
} from 'lucide-react'

export type AIChatConsoleMode = 'ask' | 'plan' | 'execute' | 'review' | 'live'
export type AIChatOpsTab = 'memory' | 'rules' | 'evidence' | 'approval' | 'diff' | 'execution'

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
  { id: 'rules', label: 'Rules', icon: ScrollText },
  { id: 'evidence', label: 'Evidence', icon: SearchCheck },
  { id: 'approval', label: 'Aprovacao', icon: Check },
  { id: 'diff', label: 'Diff', icon: Code },
  { id: 'execution', label: 'Execucao', icon: ClipboardList },
]

export const MODE_PRESETS: Record<AIChatConsoleMode, AIChatModePreset> = {
  ask: {
    placeholder: 'Pergunte para a IA sobre o seu codigo, erro ou arquitetura...',
    helper: 'Melhor para perguntas rápidas, explicações e desbloqueios pontuais.',
    submitLabel: 'Enviar pergunta',
    emptyStateTitle: 'Pergunte e destrave rapido',
    emptyStateDescription:
      'Use perguntas diretas para explicar código, investigar um erro ou entender o próximo passo sem sair do artefato.',
    quickPrompts: QUICK_PROMPTS,
    quickMentions: QUICK_MENTIONS,
  },
  plan: {
    placeholder: 'Descreva o objetivo e eu monto um plano claro com etapas, riscos e ordem de execução...',
    helper: 'Melhor para transformar uma meta em etapas, riscos, dependências e ordem de ataque.',
    submitLabel: 'Gerar plano',
    emptyStateTitle: 'Monte um plano antes de agir',
    emptyStateDescription:
      'Peça uma sequência de execução, riscos e prioridades para evitar retrabalho antes de começar a editar.',
    quickPrompts: [
      { icon: Layers, label: 'Quebrar em etapas', prompt: 'Quebre este objetivo em etapas executáveis com prioridades:' },
      { icon: ClipboardList, label: 'Mapear riscos', prompt: 'Mapeie riscos, dependências e mitigação para:' },
      { icon: Brain, label: 'Plano técnico', prompt: 'Proponha um plano técnico enxuto para:' },
      { icon: Lightbulb, label: 'Próximos passos', prompt: 'Liste os próximos passos mais valiosos para:' },
    ],
    quickMentions: [
      { label: '@codebase', value: '@codebase ' },
      { label: '@docs:api', value: '@docs:api ' },
      { label: '@git:status', value: '@git:status ' },
      { label: '@diagnostics', value: '@diagnostics ' },
    ],
  },
  execute: {
    placeholder: 'Descreva a mudança e eu foco em passos acionáveis, diff/apply e execução...',
    helper: 'Melhor para transformar um plano em ações concretas no editor e no runtime.',
    submitLabel: 'Executar',
    emptyStateTitle: 'Saia do plano e entre em execução',
    emptyStateDescription:
      'Use este modo quando quiser instruções acionáveis, snippets, diffs ou apply orientado ao artefato atual.',
    quickPrompts: [
      { icon: Play, label: 'Executar plano', prompt: 'Execute este plano em passos concretos e indique o primeiro diff:' },
      { icon: Terminal, label: 'Preparar diff', prompt: 'Prepare a mudança com foco em diff/apply para:' },
      { icon: Wand2, label: 'Implementar', prompt: 'Implemente esta melhoria com passos claros e objetivos:' },
      { icon: Zap, label: 'Destravar agora', prompt: 'Qual é a ação mais imediata para destravar isto agora?' },
    ],
    quickMentions: [
      { label: '@git:diff', value: '@git:diff ' },
      { label: '@selection', value: '@selection ' },
      { label: '@terminal', value: '@terminal ' },
      { label: '@diagnostics', value: '@diagnostics ' },
    ],
  },
  review: {
    placeholder: 'Cole o diff, erro ou arquivo e eu reviso riscos, regressões e testes faltando...',
    helper: 'Melhor para revisar mudanças com foco em risco, regressão e qualidade final.',
    submitLabel: 'Revisar',
    emptyStateTitle: 'Revisão crítica sem perder o contexto',
    emptyStateDescription:
      'Peça uma revisão objetiva de mudanças, cobertura, regressões e sinais de risco antes de seguir.',
    quickPrompts: [
      { icon: Check, label: 'Revisar diff', prompt: 'Revise criticamente este diff e aponte riscos concretos:' },
      { icon: Bug, label: 'Caçar regressões', prompt: 'Quais regressões ou efeitos colaterais devo esperar em:' },
      { icon: Layers, label: 'Validar testes', prompt: 'Quais testes estão faltando para blindar esta mudança?' },
      { icon: Code, label: 'Revisão técnica', prompt: 'Faça uma revisão técnica honesta deste código:' },
    ],
    quickMentions: [
      { label: '@git:diff', value: '@git:diff ' },
      { label: '@selection', value: '@selection ' },
      { label: '@codebase', value: '@codebase ' },
      { label: '@diagnostics', value: '@diagnostics ' },
    ],
  },
  live: {
    placeholder: 'Converse enquanto a IA trabalha, peça interrupções ou redirecione o próximo passo...',
    helper: 'Melhor para acompanhamento em tempo real, redirecionamentos rápidos e iteração curta.',
    submitLabel: 'Enviar ao vivo',
    emptyStateTitle: 'Acompanhe a execução em tempo real',
    emptyStateDescription:
      'Use este modo para intervir no fluxo, mudar direção rápido e manter a IA sincronizada com o momento atual.',
    quickPrompts: [
      { icon: Radio, label: 'Resumir status', prompt: 'Resuma o status atual em uma linha e proponha o próximo passo:' },
      { icon: Play, label: 'Continuar', prompt: 'Continue a partir daqui sem repetir contexto já resolvido:' },
      { icon: Wand2, label: 'Refinar resposta', prompt: 'Refine a resposta anterior de forma mais objetiva:' },
      { icon: Terminal, label: 'Destravar runtime', prompt: 'Que verificação rápida eu devo fazer agora neste runtime?' },
    ],
    quickMentions: [
      { label: '@terminal', value: '@terminal ' },
      { label: '@selection', value: '@selection ' },
      { label: '@git:status', value: '@git:status ' },
      { label: '@codebase', value: '@codebase ' },
    ],
  },
}
