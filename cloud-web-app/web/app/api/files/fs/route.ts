import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime';
import { invalidateSemanticCodeSearchCache } from '@/lib/server/semantic-code-search'
import { indexFileIntoVectorStore } from '@/lib/server/vector-index';
import {
  getScopedProjectId,
  resolveScopedWorkspacePath,
  toVirtualWorkspacePath,
} from '@/lib/server/workspace-scope';
import { createComponentLogger } from '@/lib/observability/logger';
import { localEvidenceJson, shouldUseLocalEvidenceFallback } from '@/lib/server/local-evidence-fallback';

const routeLogger = createComponentLogger('api/files/fs/route');

function isClientAbortError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  return code === 'ECONNRESET' || error.message.toLowerCase() === 'aborted';
}

/**
 * POST /api/files/fs - File System Operations
 *
 * Body:
 * - action: 'list' | 'read' | 'write' | 'delete' | 'copy' | 'move' | 'mkdir' | 'info' | 'exists'
 * - path: string (required)
 * - content: string (for write)
 * - destination: string (for copy/move)
 * - options: object (action-specific options)
 */
export async function POST(request: NextRequest) {
  let attemptedAction = 'unknown';
  let attemptedPath = '/';
  try {
    const user = requireAuth(request);
    await requireEntitlementsForUser(user.userId);

    const rawBody = await request.text();
    let body: any = { action: 'list', path: '/' };
    if (rawBody.trim()) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: 'valid JSON body is required' },
          { status: 400 }
        );
      }
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'valid JSON body is required' },
        { status: 400 }
      );
    }

    const { action, path: filePath, content, destination, options } = body;
    attemptedAction = String(action || 'unknown');
    attemptedPath = String(filePath || '/');
    const projectId = getScopedProjectId(request, body);

    if (!action || !filePath) {
      return NextResponse.json(
        { error: 'action and path are required' },
        { status: 400 }
      );
    }

    const fsRuntime = getFileSystemRuntime();
    const { absolutePath: resolvedPath, root: scopedRoot } = resolveScopedWorkspacePath({
      userId: user.userId,
      projectId,
      requestedPath: filePath,
    });
    const canonical = { runtime: 'filesystem-runtime', authority: 'canonical' as const };
    const invalidateSemanticCache = () => {
      invalidateSemanticCodeSearchCache({
        rootPath: scopedRoot,
        scope: 'project',
      })
      // J.4 — keep VectorIndex warm on workspace writes (best-effort)
      void indexFileIntoVectorStore({
        projectId,
        rootPath: scopedRoot,
        absoluteFilePath: resolvedPath,
      }).catch(() => {})
    }

    switch (action) {
      case 'list': {
        const result = await fsRuntime.listDirectory(resolvedPath, options);
        return NextResponse.json({
          path: toVirtualWorkspacePath(result.path, scopedRoot),
          entries: result.entries.map((entry) => ({
            ...entry,
            path: toVirtualWorkspacePath(entry.path, scopedRoot),
          })),
          total: result.total,
          projectId,
          ...canonical,
        });
      }

      case 'read': {
        const result = await fsRuntime.readFile(resolvedPath, options);
        return NextResponse.json({
          ...result,
          path: toVirtualWorkspacePath(result.path, scopedRoot),
          projectId,
          ...canonical,
        });
      }

      case 'write': {
        if (content === undefined) {
          return NextResponse.json(
            { error: 'content is required for write action' },
            { status: 400 }
          );
        }
        await fsRuntime.writeFile(resolvedPath, content, options);
        invalidateSemanticCache()
        return NextResponse.json({
          success: true,
          path: toVirtualWorkspacePath(resolvedPath, scopedRoot),
          projectId,
          ...canonical,
        });
      }

      case 'delete': {
        await fsRuntime.delete(resolvedPath, options);
        invalidateSemanticCache()
        return NextResponse.json({
          success: true,
          path: toVirtualWorkspacePath(resolvedPath, scopedRoot),
          projectId,
          ...canonical,
        });
      }

      case 'copy': {
        if (!destination) {
          return NextResponse.json(
            { error: 'destination is required for copy action' },
            { status: 400 }
          );
        }
        const { absolutePath: resolvedDestination } = resolveScopedWorkspacePath({
          userId: user.userId,
          projectId,
          requestedPath: destination,
        });
        await fsRuntime.copy(resolvedPath, resolvedDestination, options);
        invalidateSemanticCache()
        return NextResponse.json({
          success: true,
          source: toVirtualWorkspacePath(resolvedPath, scopedRoot),
          destination: toVirtualWorkspacePath(resolvedDestination, scopedRoot),
          projectId,
          ...canonical,
        });
      }

      case 'move': {
        if (!destination) {
          return NextResponse.json(
            { error: 'destination is required for move action' },
            { status: 400 }
          );
        }
        const { absolutePath: resolvedDestination } = resolveScopedWorkspacePath({
          userId: user.userId,
          projectId,
          requestedPath: destination,
        });
        await fsRuntime.move(resolvedPath, resolvedDestination, options);
        invalidateSemanticCache()
        return NextResponse.json({
          success: true,
          source: toVirtualWorkspacePath(resolvedPath, scopedRoot),
          destination: toVirtualWorkspacePath(resolvedDestination, scopedRoot),
          projectId,
          ...canonical,
        });
      }

      case 'mkdir': {
        await fsRuntime.createDirectory(resolvedPath, options);
        invalidateSemanticCache()
        return NextResponse.json({
          success: true,
          path: toVirtualWorkspacePath(resolvedPath, scopedRoot),
          projectId,
          ...canonical,
        });
      }

      case 'info': {
        const result = await fsRuntime.getFileInfo(resolvedPath);
        return NextResponse.json({
          ...result,
          path: toVirtualWorkspacePath(result.path, scopedRoot),
          projectId,
          ...canonical,
        });
      }

      case 'exists': {
        const exists = await fsRuntime.exists(resolvedPath);
        return NextResponse.json({
          exists,
          path: toVirtualWorkspacePath(resolvedPath, scopedRoot),
          projectId,
          ...canonical,
        });
      }

      case 'hash': {
        const hash = await fsRuntime.getFileHash(resolvedPath, options?.algorithm);
        return NextResponse.json({
          hash,
          path: toVirtualWorkspacePath(resolvedPath, scopedRoot),
          algorithm: options?.algorithm || 'sha256',
          projectId,
          ...canonical,
        });
      }

      case 'compress': {
        const { absolutePath: resolvedDestination } = resolveScopedWorkspacePath({
          userId: user.userId,
          projectId,
          requestedPath: destination || `${filePath}.gz`,
        });
        const outputPath = await fsRuntime.compress(resolvedPath, resolvedDestination);
        return NextResponse.json({
          success: true,
          output: toVirtualWorkspacePath(outputPath, scopedRoot),
          projectId,
          ...canonical,
        });
      }

      case 'decompress': {
        const resolvedDestination = destination
          ? resolveScopedWorkspacePath({
              userId: user.userId,
              projectId,
              requestedPath: destination,
            }).absolutePath
          : undefined;
        const outputPath = await fsRuntime.decompress(resolvedPath, resolvedDestination);
        return NextResponse.json({
          success: true,
          output: toVirtualWorkspacePath(outputPath, scopedRoot),
          projectId,
          ...canonical,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    if (isClientAbortError(error)) {
      routeLogger.warn('File system operation aborted by client.', {
        action: attemptedAction,
        path: attemptedPath,
      });
      return NextResponse.json(
        { error: 'REQUEST_ABORTED', action: attemptedAction, path: attemptedPath },
        { status: 499 }
      );
    }

    routeLogger.error('File system operation failed:', error);

    if (shouldUseLocalEvidenceFallback(request, error)) {
      const status = attemptedAction === 'list' || attemptedAction === 'exists' ? 200 : 503;
      const payload =
        attemptedAction === 'list'
          ? {
              path: attemptedPath,
              entries: [],
              total: 0,
              projectId: request.nextUrl.searchParams.get('projectId') ?? 'local-evidence',
              runtime: 'filesystem-runtime',
              authority: 'canonical',
              status: 'held',
            }
          : attemptedAction === 'exists'
            ? {
                exists: false,
                path: attemptedPath,
                projectId: request.nextUrl.searchParams.get('projectId') ?? 'local-evidence',
                runtime: 'filesystem-runtime',
                authority: 'canonical',
                status: 'held',
              }
            : {
                error: 'FILESYSTEM_RUNTIME_HELD',
                message: 'File operation is held until local filesystem runtime and entitlements are available.',
                action: attemptedAction,
                path: attemptedPath,
              };

      return localEvidenceJson(request, error, payload, {
        surface: 'files.fs',
        state: 'held',
        status,
      });
    }

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { error: 'Operation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
