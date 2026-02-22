import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { assertWorkspacePath } from '@/lib/workspace';
import { apiErrorToResponse } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

interface LoadTasksRequest {
  workspaceRoot: string;
}
const MAX_WORKSPACE_ROOT_LENGTH = 2048;

export async function POST(request: NextRequest) {
  try {
		const user = requireAuth(request);
		await requireEntitlementsForUser(user.userId);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'tasks-load-post',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many task load requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body: LoadTasksRequest = await request.json();
    const { workspaceRoot } = body;
    if (!workspaceRoot || workspaceRoot.length > MAX_WORKSPACE_ROOT_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'INVALID_WORKSPACE_ROOT', message: 'workspaceRoot is required and must be under 2048 characters.' },
        { status: 400 }
      );
    }
		const safeRoot = assertWorkspacePath(workspaceRoot, 'workspaceRoot');

    // Try to load .vscode/tasks.json
    const tasksPath = join(safeRoot, '.vscode', 'tasks.json');
    
    try {
      const content = await readFile(tasksPath, 'utf-8');
      const tasksConfig = JSON.parse(content);
      
      return NextResponse.json({
        success: true,
        tasks: tasksConfig.tasks || []
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return NextResponse.json({
          success: true,
          tasks: [],
          warning: 'TASKS_FILE_NOT_FOUND',
        });
      }
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_TASKS_FILE',
            message: 'tasks.json is not valid JSON.',
          },
          { status: 422 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to load tasks:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { success: false, error: 'Failed to load tasks' },
      { status: 500 }
    );
  }
}
