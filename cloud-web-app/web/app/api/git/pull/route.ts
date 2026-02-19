import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { assertWorkspacePath } from '@/lib/workspace';
import { apiErrorToResponse } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

const execFileAsync = promisify(execFile);

interface GitPullRequest {
  cwd: string;
  remote?: string;
  branch?: string;
  rebase?: boolean;
}

export async function POST(request: NextRequest) {
  try {
		const user = requireAuth(request);
		const rateLimitResponse = await enforceRateLimit({
			scope: 'git-pull-post',
			key: user.userId,
			max: 120,
			windowMs: 60 * 60 * 1000,
			message: 'Too many git pull requests. Please wait before retrying.',
		});
		if (rateLimitResponse) return rateLimitResponse;
		await requireEntitlementsForUser(user.userId);

    const body: GitPullRequest = await request.json();
    const { cwd, remote = 'origin', branch, rebase = false } = body;
		const safeCwd = assertWorkspacePath(cwd, 'cwd');

		const args = ['pull'];
		if (rebase) args.push('--rebase');
		args.push(remote);
		if (branch) args.push(branch);

		const { stdout } = await execFileAsync('git', args, { cwd: safeCwd, timeout: 60000 });

    return NextResponse.json({
      success: true,
      message: 'Pull completed successfully',
      output: stdout
    });
  } catch (error: any) {
    console.error('Git pull failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to pull',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
