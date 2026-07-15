import path from 'node:path';

/**
 * Resolve a user-provided workspaceRoot into an absolute path.
 *
 * Security model:
 * - Base root defaults to the current app root (process.cwd())
 * - You can override with AETHEL_WORKSPACE_ROOT
 * - Only paths inside base root are allowed
 */
export function resolveWorkspaceRoot(workspaceRoot: string | undefined | null): string {
  const baseRoot = process.env.AETHEL_WORKSPACE_ROOT
    ? path.resolve(process.env.AETHEL_WORKSPACE_ROOT)
    : path.resolve(process.cwd());

  const requested = String(workspaceRoot || '').trim();

  // Common client values
  if (!requested || requested === '/' || requested === '/workspace') {
    return baseRoot;
  }

  // Strip file:// if present
  const normalized = requested.startsWith('file://') ? requested.replace(/^file:\/\//, '') : requested;

  const candidate = path.isAbsolute(normalized)
    ? path.resolve(normalized)
    : path.resolve(baseRoot, normalized);

  const rel = path.relative(baseRoot, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw Object.assign(new Error('WORKSPACE_ROOT_OUT_OF_BOUNDS'), { code: 'WORKSPACE_ROOT_OUT_OF_BOUNDS' });
  }

  return candidate;
}
