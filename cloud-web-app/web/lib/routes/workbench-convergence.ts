/**
 * Rotas aspiracionais e duplicadas: em producao fechamos labs por padrao
 * e encaminhamos superficies duplicadas para o workbench (`/ide`).
 *
 * Ativar labs: `NEXT_PUBLIC_SHOW_ASPIRATIONAL_ROUTES=true`
 */

export const ASPIRATIONAL_LAB_EXACT_PATHS = new Set([
  '/animation-blueprint',
  '/blueprint-editor',
  '/landscape-editor',
  '/level-editor',
  '/niagara-editor',
  '/vr-preview',
])

/** Destino quando labs ficam desligados. */
export const ASPIRATIONAL_LABS_FALLBACK = '/dashboard?notice=labs-hidden'

/**
 * Rotas que devem abrir no IDE. O valor aponta para o `entry` entendido por `FullscreenIDE`.
 */
export const IDE_CONVERGENCE_REDIRECTS: Record<string, string> = {
  '/ai-command': '/ide?entry=ai-command',
  '/chat': '/ide?entry=chat',
  '/editor-hub': '/ide',
  '/explorer': '/ide?entry=explorer',
  '/git': '/ide?entry=git',
  '/search': '/ide?entry=search',
  '/terminal': '/ide?entry=terminal',
  '/live-preview': '/ide?entry=preview',
  '/debugger': '/ide?entry=debug',
  '/playground': '/ide?entry=playground',
  '/testing': '/ide?entry=testing',
}

/**
 * Labs ficam visiveis em desenvolvimento por padrao. Em producao, so aparecem se a variavel estiver ativa.
 */
export function shouldShowAspirationalRoutes(): boolean {
  const value = process.env.NEXT_PUBLIC_SHOW_ASPIRATIONAL_ROUTES
  if (value === 'true') return true
  if (value === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

export function resolveWorkbenchConvergenceRedirect(
  pathname: string
): { target: string; reason: 'lab' | 'ide' | 'design-demo' } | null {
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname

  if (process.env.NODE_ENV === 'production' && normalized === '/design-system-demo') {
    return { target: '/dashboard?notice=design-demo-dev-only', reason: 'design-demo' }
  }

  if (!shouldShowAspirationalRoutes() && ASPIRATIONAL_LAB_EXACT_PATHS.has(normalized)) {
    return { target: ASPIRATIONAL_LABS_FALLBACK, reason: 'lab' }
  }

  const ideTarget = IDE_CONVERGENCE_REDIRECTS[normalized]
  if (ideTarget) {
    return { target: ideTarget, reason: 'ide' }
  }

  return null
}
