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
      // File doesn't exist or invalid JSON, return empty
      return NextResponse.json({
        success: true,
        tasks: []
      });
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
