export type ToolExecutionContext = {
  userId: string
  projectId?: string
  agent?: string
  enforceAgentScope?: boolean
}

export function getContext(params: Record<string, unknown>): ToolExecutionContext {
  const ctx = params.__aethelContext
  if (!ctx || typeof ctx !== 'object') {
    throw Object.assign(new Error('MISSING_CONTEXT'), { code: 'MISSING_CONTEXT' })
  }
  const contextRecord = ctx as Record<string, unknown>
  const userId = String(contextRecord.userId || '').trim()
  const projectId = typeof contextRecord.projectId === 'string' ? contextRecord.projectId.trim() : undefined
  const agent = typeof contextRecord.agent === 'string' ? contextRecord.agent.trim() : undefined
  const enforceAgentScope = contextRecord.enforceAgentScope === true
  if (!userId) {
    throw Object.assign(new Error('MISSING_USER'), { code: 'MISSING_USER' })
  }
  return { userId, projectId, agent, enforceAgentScope }
}

export function getStringParam(params: Record<string, unknown>, key: string, fallback = ''): string {
  const value = params[key]
  return typeof value === 'string' ? value : fallback
}

export function getNumberParam(params: Record<string, unknown>, key: string, fallback: number): number {
  const value = params[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function getBooleanParam(params: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = params[key]
  return typeof value === 'boolean' ? value : fallback
}

export function normalizePath(path: string): string {
  const raw = String(path || '').trim()
  if (!raw) return '/'
  const p = raw.startsWith('/') ? raw : `/${raw}`
  const cleaned = p.replace(/\\/g, '/')
  if (cleaned.includes('\u0000') || cleaned.split('/').includes('..')) {
    throw Object.assign(new Error('INVALID_PATH'), { code: 'INVALID_PATH' })
  }
  return cleaned
}

export function inferLanguageFromPath(path: string): string | undefined {
  const p = String(path || '').toLowerCase()
  if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'typescript'
  if (p.endsWith('.js') || p.endsWith('.jsx') || p.endsWith('.mjs') || p.endsWith('.cjs')) return 'javascript'
  if (p.endsWith('.json')) return 'json'
  if (p.endsWith('.css')) return 'css'
  if (p.endsWith('.html')) return 'html'
  if (p.endsWith('.py')) return 'python'
  if (p.endsWith('.rs')) return 'rust'
  if (p.endsWith('.go')) return 'go'
  if (p.endsWith('.md')) return 'markdown'
  return undefined
}

export function clampContent(content: string, maxChars: number): string {
  const s = String(content ?? '')
  return s.length <= maxChars ? s : s.slice(0, maxChars)
}

export function shouldEnforceAgentScope(params: Record<string, unknown>, context: ToolExecutionContext): boolean {
  return params.__aethelAgentScope === true || params.enforceAgentScope === true || context.enforceAgentScope === true
}

export function requestedAgentForTool(params: Record<string, unknown>, context: ToolExecutionContext): string | undefined {
  if (typeof params.__aethelAgent === 'string' && params.__aethelAgent.trim()) {
    return params.__aethelAgent.trim()
  }
  if (typeof params.agent === 'string' && params.agent.trim()) {
    return params.agent.trim()
  }
  return context.agent
}

export function pathsForScopedTool(toolName: string, params: Record<string, unknown>): string[] {
  if (toolName === 'create_file' || toolName === 'edit_file') {
    const path = getStringParam(params, 'path').trim()
    return path ? [path] : []
  }
  return []
}
