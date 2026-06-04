/**
 * Aspirational and duplicate routes stay out of primary navigation by default
 * and converge duplicate work into the IDE workbench.
 *
 * Enable labs: `NEXT_PUBLIC_SHOW_ASPIRATIONAL_ROUTES=true`
 */

export const ASPIRATIONAL_LAB_EXACT_PATHS = new Set([
  '/animation-blueprint',
  '/blueprint-editor',
  '/landscape-editor',
  '/level-editor',
  '/niagara-editor',
  '/vr-preview',
])

/** Destination when labs are disabled. */
export const ASPIRATIONAL_LABS_FALLBACK = '/dashboard?notice=labs-hidden'

/**
 * Routes that should open inside the IDE. The value points to the `entry`
 * understood by `FullscreenIDE`.
 */
export const IDE_CONVERGENCE_REDIRECTS: Record<string, string> = {
  '/ai-command': '/ide?entry=ai-command',
  '/chat': '/ide?entry=chat',
  '/editor-hub': '/ide',
  '/explorer': '/ide?entry=explorer',
  '/git': '/ide?entry=git',
  '/search': '/ide?entry=search',
  '/terminal': '/ide?entry=terminal',
  '/preview': '/ide?entry=preview',
  '/live-preview': '/ide?entry=preview',
  '/debugger': '/ide?entry=debug',
  '/playground': '/ide?entry=playground',
  '/testing': '/ide?entry=testing',
}

/**
 * Labs are visible only when explicitly enabled. This avoids leaking
 * aspirational shells through inherited dev/staging environment values.
 */
export function shouldShowAspirationalRoutes(): boolean {
  const value = process.env.NEXT_PUBLIC_SHOW_ASPIRATIONAL_ROUTES
  return value === 'true'
}

export function resolveWorkbenchConvergenceRedirect(
  pathname: string
): { target: string; reason: 'lab' | 'ide' | 'design-demo' | 'settings' } | null {
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname

  if (process.env.NODE_ENV === 'production' && normalized === '/design-system-demo') {
    return { target: '/dashboard?notice=design-demo-dev-only', reason: 'design-demo' }
  }

  if (normalized === '/project-settings') {
    return { target: '/settings?tab=editor&source=project-settings', reason: 'settings' }
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
