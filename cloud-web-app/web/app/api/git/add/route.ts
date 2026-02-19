import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { assertWorkspacePath } from '@/lib/workspace';
import { apiErrorToResponse } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

const execFileAsync = promisify(execFile);

interface GitAddRequest {
  cwd: string;
  paths: string[];
}

export async function POST(request: NextRequest) {
  try {
		const user = requireAuth(request);
		const rateLimitResponse = await enforceRateLimit({
			scope: 'git-add-post',
			key: user.userId,
			max: 240,
			windowMs: 60 * 60 * 1000,
			message: 'Too many git add requests. Please wait before retrying.',
		});
		if (rateLimitResponse) return rateLimitResponse;
		await requireEntitlementsForUser(user.userId);

    const body: GitAddRequest = await request.json();
    const { cwd, paths } = body;
		const safeCwd = assertWorkspacePath(cwd, 'cwd');

    if (!paths || paths.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No paths provided' },
        { status: 400 }
      );
    }

		await execFileAsync('git', ['add', '--', ...paths], { cwd: safeCwd });

    return NextResponse.json({
      success: true,
      message: `Staged ${paths.length} file(s)`
    });
  } catch (error) {
    console.error('Git add failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return NextResponse.json(
      { success: false, error: 'Failed to stage files' },
      { status: 500 }
    );
  }
}
