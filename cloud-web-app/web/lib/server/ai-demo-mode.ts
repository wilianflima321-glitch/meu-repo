import { buildAiProviderSetupMetadata } from '@/lib/capability-constants'
import { getAiProviderSetupSummary } from '@/lib/ai-provider-config'

const DEMO_PROVIDER = 'demo'
const DEMO_MODEL = 'aethel-demo-v1'
export const AI_DEMO_PROVIDER = DEMO_PROVIDER
export const AI_DEMO_MODEL = DEMO_MODEL

type DemoRoute =
  | '/api/ai/chat'
  | '/api/ai/chat-advanced'
  | '/api/ai/complete'
  | '/api/ai/action'
  | '/api/ai/inline-edit'
  | '/api/ai/inline-completion'
  | '/api/ai/provider-status'

type DemoMetadataParams = {
  route: DemoRoute
  capability: string
}

type DemoResponseMeta = {
  demoMode: true
  capability: string
  capabilityStatus: 'PARTIAL'
  milestone: 'P0'
  warning: string
  setupUrl?: string
  setupAction?: string
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function sanitizeText(value: string, maxChars = 240): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxChars)
}

function lastContentMessage(messages: Array<{ content?: string }> | undefined): string {
  if (!Array.isArray(messages) || messages.length === 0) return ''
  for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
    const candidate = messages[idx]
    if (typeof candidate?.content !== 'string') continue
    const text = sanitizeText(candidate.content)
    if (!text) continue
    return text
  }
  return ''
}

export function isAiDemoModeEnabled(): boolean {
  return parseBoolean(process.env.AETHEL_AI_DEMO_MODE) || parseBoolean(process.env.NEXT_PUBLIC_AETHEL_AI_DEMO_MODE)
}

export function demoRouteMetadata(params: DemoMetadataParams): DemoResponseMeta {
  const setup = buildAiProviderSetupMetadata({ route: params.route })
  return {
    demoMode: true,
    capability: params.capability,
    capabilityStatus: 'PARTIAL',
    milestone: 'P0',
    warning:
      'DEMO_MODE_ACTIVE: configure a real AI provider to unlock production responses, real token accounting and provider-grade quality.',
    setupUrl: setup.setupUrl,
    setupAction: setup.setupAction,
  }
}

export function buildDemoChatContent(args: {
  message?: string
  messages?: Array<{ content?: string }>
}): string {
  const seed = sanitizeText(args.message || lastContentMessage(args.messages) || 'Sem contexto recebido.')
  const providerSummary = getAiProviderSetupSummary()
  return [
    'DEMO MODE (provider real nao configurado).',
    '',
    `Resumo do pedido: ${seed}`,
    '',
    'Plano sugerido:',
    '1. Definir objetivo e criterio de aceite em uma frase.',
    '2. Aplicar mudanca pequena e validavel no arquivo-alvo.',
    '3. Executar validacao local (lint/typecheck/build) antes de promover.',
    '4. Registrar feedback no core loop (accepted/rejected/needs_work).',
    '',
    `Acao recomendada agora: configure ${providerSummary} em /settings?tab=api para trocar do modo demo para execucao real.`,
  ].join('\n')
}

export function buildDemoCompletion(args: {
  prompt?: string
  prefix?: string
  language?: string
}): string {
  const language = sanitizeText(args.language || 'text', 40) || 'text'
  const context = sanitizeText(args.prefix || args.prompt || '')
  if (context.endsWith('{')) {
    return '\n  // TODO: configure provider real para obter completion contextual\n'
  }
  if (context.includes('return')) {
    return ' /* demo: configure provider real para completion contextual */'
  }
  return `\n// demo(${language}): configure provider real em /settings?tab=api\n`
}

export function buildDemoActionContent(args: {
  action?: string
  instruction?: string
  code?: string
  language?: string
}): string {
  const action = sanitizeText(args.action || 'explain', 40) || 'explain'
  const language = sanitizeText(args.language || 'text', 40) || 'text'
  const instruction = sanitizeText(args.instruction || '')
  const snippet = sanitizeText(args.code || '', 180)
  return [
    `DEMO MODE (${action}).`,
    '',
    instruction ? `Instrucao: ${instruction}` : `Linguagem detectada: ${language}`,
    snippet ? `Trecho alvo: ${snippet}` : 'Trecho alvo: nao informado',
    '',
    'Resposta demo: execute a acao em ambiente real apos configurar provider.',
    `- Primeiro passo: validar escopo da mudanca (${action}).`,
    '- Segundo passo: gerar patch pequeno com validacao deterministica.',
    '- Terceiro passo: aplicar/rollback com auditoria de runId.',
  ].join('\n')
}

export function buildDemoInlineEdit(args: { code?: string; instruction?: string }) {
  const inputCode = typeof args.code === 'string' ? args.code : ''
  const instruction = sanitizeText(args.instruction || '')

  if (inputCode.trim().length === 0) {
    return {
      code: `// demo mode\n// Instrucao recebida: ${instruction || 'sem instrucao detalhada'}\n`,
      explanation:
        'Modo demo ativo: nenhum provider real configurado. Este retorno demonstra o fluxo de inline edit sem inferencia real de modelo.',
      confidence: 0.25,
    }
  }

  return {
    code: inputCode,
    explanation:
      'Modo demo ativo: codigo mantido sem alteracoes para evitar apply enganoso. Configure provider real para gerar patch validavel.',
    confidence: 0.25,
  }
}
