import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import {
  getScopedProjectId,
  resolveScopedWorkspacePath,
  toVirtualWorkspacePath,
} from '@/lib/server/workspace-scope';

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
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'files-fs',
      key: user.userId,
      max: 180,
      windowMs: 60 * 1000,
      message: 'Too many file operations. Please retry shortly.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const body = await request.json();
    const { action, path: filePath, content, destination, options } = body;
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
        return NextResponse.json({
          success: true,
          path: toVirtualWorkspacePath(resolvedPath, scopedRoot),
          projectId,
          ...canonical,
        });
      }

      case 'delete': {
        await fsRuntime.delete(resolvedPath, options);
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
    console.error('File system operation failed:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { error: 'Operation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
