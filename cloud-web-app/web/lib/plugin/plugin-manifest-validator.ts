export type PluginPermission = 'network' | 'fs' | 'dialog' | 'terminal' | 'physics'

export interface PluginManifest {
  id: string
  name: string
  version: string
  entrypoint: string
  author: string
  description?: string
  permissions?: PluginPermission[]
  minEngineVersion?: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  manifest?: PluginManifest
}

/**
 * Validates a plugin manifest JSON string for structural correctness and safety.
 */
export function validatePluginManifest(manifestJson: string): ValidationResult {
  const errors: string[] = []

  try {
    const data = JSON.parse(manifestJson) as Record<string, unknown>

    if (typeof data !== 'object' || data === null) {
      return { valid: false, errors: ['Manifest is not a valid JSON object.'] }
    }

    // Required fields check
    if (typeof data.id !== 'string' || !data.id.trim()) {
      errors.push("Missing or invalid field: 'id' must be a non-empty string.")
    } else if (!/^[a-z0-9-_]+$/.test(data.id)) {
      errors.push("Invalid field: 'id' must be lowercase and contain only alphanumeric, dash, or underscore characters.")
    }

    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.push("Missing or invalid field: 'name' must be a non-empty string.")
    }

    if (typeof data.version !== 'string' || !data.version.trim()) {
      errors.push("Missing or invalid field: 'version' must be a non-empty string.")
    } else if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(data.version)) {
      errors.push("Invalid field: 'version' must follow semantic versioning syntax (e.g. 1.0.0).")
    }

    if (typeof data.entrypoint !== 'string' || !data.entrypoint.trim()) {
      errors.push("Missing or invalid field: 'entrypoint' must be a non-empty string.")
    }

    if (typeof data.author !== 'string' || !data.author.trim()) {
      errors.push("Missing or invalid field: 'author' must be a non-empty string.")
    }

    // Optional fields check
    if (data.permissions !== undefined) {
      if (!Array.isArray(data.permissions)) {
        errors.push("Invalid field: 'permissions' must be an array of strings.")
      } else {
        const allowedPermissions: PluginPermission[] = ['network', 'fs', 'dialog', 'terminal', 'physics']
        data.permissions.forEach((perm, index) => {
          if (typeof perm !== 'string' || !allowedPermissions.includes(perm as PluginPermission)) {
            errors.push(`Invalid permission entry at index ${index}: '${perm}' is not a recognized sandbox permission.`)
          }
        })
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors }
    }

    return {
      valid: true,
      errors: [],
      manifest: {
        id: data.id as string,
        name: data.name as string,
        version: data.version as string,
        entrypoint: data.entrypoint as string,
        author: data.author as string,
        description: typeof data.description === 'string' ? data.description : undefined,
        permissions: Array.isArray(data.permissions) ? (data.permissions as PluginPermission[]) : [],
        minEngineVersion: typeof data.minEngineVersion === 'string' ? data.minEngineVersion : undefined,
      },
    }
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? `JSON parsing failed: ${error.message}` : 'Invalid JSON format.'],
    }
  }
}

/**
 * Checks if a plugin's manifest permissions exceed security boundary rules.
 */
export function checkManifestSecurity(manifest: PluginManifest, allowedPermissions: PluginPermission[]): boolean {
  if (!manifest.permissions || manifest.permissions.length === 0) {
    return true
  }

  return manifest.permissions.every((perm) => allowedPermissions.includes(perm))
}
