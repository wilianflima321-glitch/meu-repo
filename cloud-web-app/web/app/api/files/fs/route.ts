import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime';
import { resolveWorkspaceRoot } from '@/lib/server/workspace-path';

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
    await requireEntitlementsForUser(user.userId);

    const body = await request.json();
    const { action, path: filePath, content, destination, options } = body;

    if (!action || !filePath) {
      return NextResponse.json(
        { error: 'action and path are required' },
        { status: 400 }
      );
    }

    const fsRuntime = getFileSystemRuntime();
    const resolvedPath = resolveWorkspaceRoot(filePath);

    switch (action) {
      case 'list': {
        const result = await fsRuntime.listDirectory(resolvedPath, options);
        return NextResponse.json(result);
      }

      case 'read': {
        const result = await fsRuntime.readFile(resolvedPath, options);
        return NextResponse.json(result);
      }

      case 'write': {
        if (content === undefined) {
          return NextResponse.json(
            { error: 'content is required for write action' },
            { status: 400 }
          );
        }
        await fsRuntime.writeFile(resolvedPath, content, options);
        return NextResponse.json({ success: true, path: resolvedPath });
      }

      case 'delete': {
        await fsRuntime.delete(resolvedPath, options);
        return NextResponse.json({ success: true, path: resolvedPath });
      }

      case 'copy': {
        if (!destination) {
          return NextResponse.json(
            { error: 'destination is required for copy action' },
            { status: 400 }
          );
        }
        await fsRuntime.copy(resolvedPath, destination, options);
        return NextResponse.json({ success: true, source: resolvedPath, destination });
      }

      case 'move': {
        if (!destination) {
          return NextResponse.json(
            { error: 'destination is required for move action' },
            { status: 400 }
          );
        }
        await fsRuntime.move(resolvedPath, destination, options);
        return NextResponse.json({ success: true, source: resolvedPath, destination });
      }

      case 'mkdir': {
        await fsRuntime.createDirectory(resolvedPath, options);
        return NextResponse.json({ success: true, path: resolvedPath });
      }

      case 'info': {
        const result = await fsRuntime.getFileInfo(resolvedPath);
        return NextResponse.json(result);
      }

      case 'exists': {
        const exists = await fsRuntime.exists(resolvedPath);
        return NextResponse.json({ exists, path: resolvedPath });
      }

      case 'hash': {
        const hash = await fsRuntime.getFileHash(resolvedPath, options?.algorithm);
        return NextResponse.json({ hash, path: resolvedPath, algorithm: options?.algorithm || 'sha256' });
      }

      case 'compress': {
        const outputPath = await fsRuntime.compress(resolvedPath, destination);
        return NextResponse.json({ success: true, output: outputPath });
      }

      case 'decompress': {
        const outputPath = await fsRuntime.decompress(resolvedPath, destination);
        return NextResponse.json({ success: true, output: outputPath });
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
