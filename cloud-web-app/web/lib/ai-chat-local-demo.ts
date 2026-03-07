export const AI_LOCAL_DEMO_USAGE_KEY = 'aethel.ai.local-demo.v1'

type LocalDemoUsageSnapshot = {
  day: string
  used: number
}

export type LocalDemoUsageDecision = {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  resetAt: string
}

type BuildLocalDemoChatContentParams = {
  message: string
  limit: number
  remaining: number
  qualityMode: 'standard' | 'delivery' | 'studio'
  agentCount: 1 | 2 | 3
  enableWebResearch: boolean
}

function toUtcDay(now = new Date()): string {
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function resetAtForDay(day: string): string {
  return `${day}T23:59:59.999Z`
}

function sanitizeText(raw: string, maxChars = 240): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, maxChars)
}

function readSnapshot(day: string): LocalDemoUsageSnapshot {
  if (typeof window === 'undefined') {
    return { day, used: 0 }
  }

  try {
    const raw = window.localStorage.getItem(AI_LOCAL_DEMO_USAGE_KEY)
    if (!raw) return { day, used: 0 }
    const parsed = JSON.parse(raw) as Partial<LocalDemoUsageSnapshot>
    if (typeof parsed?.day !== 'string' || typeof parsed?.used !== 'number') {
      return { day, used: 0 }
    }
    if (parsed.day !== day) return { day, used: 0 }
    return {
      day,
      used: Number.isFinite(parsed.used) ? Math.max(0, Math.floor(parsed.used)) : 0,
    }
  } catch {
    return { day, used: 0 }
  }
}

function writeSnapshot(snapshot: LocalDemoUsageSnapshot): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AI_LOCAL_DEMO_USAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // best effort
  }
}

function sanitizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return 5
  return Math.max(1, Math.min(50, Math.floor(Number(limit))))
}

export function consumeLocalDemoUsage(limit?: number): LocalDemoUsageDecision {
  const now = new Date()
  const day = toUtcDay(now)
  const normalizedLimit = sanitizeLimit(limit)
  const snapshot = readSnapshot(day)

  if (snapshot.used >= normalizedLimit) {
    return {
      allowed: false,
      used: snapshot.used,
      limit: normalizedLimit,
      remaining: 0,
      resetAt: resetAtForDay(day),
    }
  }

  const used = snapshot.used + 1
  writeSnapshot({ day, used })
  return {
    allowed: true,
    used,
    limit: normalizedLimit,
    remaining: Math.max(0, normalizedLimit - used),
    resetAt: resetAtForDay(day),
  }
}

export function buildLocalDemoChatContent(params: BuildLocalDemoChatContentParams): string {
  const normalizedMessage = sanitizeText(params.message || 'sem mensagem')
  return [
    'DEMO LOCAL (provider de IA nao configurado).',
    '',
    `Resumo do pedido: ${normalizedMessage}`,
    '',
    'Plano sugerido para avancar sem bloquear o onboarding:',
    `1. Definir objetivo testavel em modo ${params.qualityMode}.`,
    `2. Executar com ${params.agentCount} agente(s) e validar riscos antes do apply.`,
    `3. ${params.enableWebResearch ? 'Incluir pesquisa web apenas para evidencias verificaveis.' : 'Seguir com execucao local para reduzir custo e latencia.'}`,
    '4. Configurar provider real para sair do demo local e receber respostas com contexto completo.',
    '',
    `Demo local restante hoje: ${params.remaining}/${params.limit}.`,
    'Setup recomendado: abra /settings?tab=api e configure OpenAI, Anthropic, Google ou Groq.',
  ].join('\n')
}
