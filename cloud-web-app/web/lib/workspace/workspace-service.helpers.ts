export function normalizeWorkspaceUri(uri: string): string {
  return uri.replace(/\\/g, '/').replace(/\/+$/, '')
}

export function extractWorkspaceFolderName(uri: string): string {
  const parts = uri.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || 'workspace'
}

export function extractWorkspaceFileName(uri: string): string {
  const parts = uri.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

export function matchesWorkspacePattern(uri: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')

  return new RegExp(`^${regexPattern}$`, 'i').test(uri)
}

export function createDefaultWorkspaceConfiguration(): Map<string, unknown> {
  return new Map<string, unknown>([
    ['editor.tabSize', 2],
    ['editor.insertSpaces', true],
    ['editor.formatOnSave', true],
    ['files.autoSave', 'afterDelay'],
    ['files.autoSaveDelay', 1000],
    ['files.exclude', { '**/node_modules': true, '**/.git': true }],
    ['search.exclude', { '**/node_modules': true, '**/dist': true }],
  ])
}
