import { logger } from '@/lib/observability/logger'

import type { Plugin, PluginConfigSchema, PluginLoaderConfig, PluginManifest, PluginPermission } from './plugin-system.types'

export function createPluginLoaderConfig(config: Partial<PluginLoaderConfig> = {}): PluginLoaderConfig {
  return {
    pluginDirectory: '/plugins',
    enableHotReload: true,
    sandbox: true,
    maxLoadTime: 5000,
    allowedPermissions: ['storage', 'input', 'entities', 'ui'],
    ...config,
  }
}

export function assertPluginPermissions(
  permissions: PluginPermission[],
  allowedPermissions: PluginLoaderConfig['allowedPermissions'],
): void {
  for (const permission of permissions) {
    if (!allowedPermissions.includes(permission)) {
      throw new Error(`Permission not allowed: ${permission}`)
    }
  }
}

export function assertPluginConflicts(
  manifest: PluginManifest,
  plugins: Map<string, Plugin>,
): void {
  for (const conflictId of manifest.conflicts || []) {
    if (plugins.has(conflictId)) {
      throw new Error(`Plugin ${manifest.id} conflicts with ${conflictId}`)
    }
  }
}

export function satisfiesPluginVersion(actual: string, required: string): boolean {
  const [actualMajor, actualMinor] = actual.split('.').map(Number)
  const [requiredMajor, requiredMinor] = required.replace(/[^0-9.]/g, '').split('.').map(Number)

  if (required.startsWith('^')) {
    return actualMajor === requiredMajor && actualMinor >= requiredMinor
  }

  if (required.startsWith('~')) {
    return actualMajor === requiredMajor && actualMinor === requiredMinor
  }

  return actualMajor === requiredMajor && actualMinor >= requiredMinor
}

export async function assertPluginDependencies(
  manifest: PluginManifest,
  plugins: Map<string, Plugin>,
): Promise<void> {
  for (const dep of manifest.dependencies || []) {
    const plugin = plugins.get(dep.id)

    if (!plugin) {
      if (dep.optional) {
        logger.warn(`Optional dependency ${dep.id} not found for ${manifest.id}`)
        continue
      }
      throw new Error(`Missing dependency: ${dep.id}`)
    }

    if (!satisfiesPluginVersion(plugin.manifest.version, dep.version)) {
      throw new Error(
        `Dependency version mismatch: ${dep.id} requires ${dep.version}, found ${plugin.manifest.version}`,
      )
    }
  }
}

export function initializePluginConfig(schema?: PluginConfigSchema): Record<string, unknown> {
  if (!schema) return {}

  const config: Record<string, unknown> = {}
  for (const [key, def] of Object.entries(schema)) {
    config[key] = def.default
  }
  return config
}
