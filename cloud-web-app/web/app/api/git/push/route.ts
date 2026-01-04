import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { assertWorkspacePath } from '@/lib/workspace';
import { apiErrorToResponse } from '@/lib/api-errors';

const execFileAsync = promisify(execFile);

interface GitPushRequest {
  cwd: string;
  remote?: string;
  branch?: string;
  force?: boolean;
}

export async function POST(request: NextRequest) {
  try {
		const user = requireAuth(request);
		await requireEntitlementsForUser(user.userId);

    const body: GitPushRequest = await request.json();
    const { cwd, remote = 'origin', branch, force = false } = body;
		const safeCwd = assertWorkspacePath(cwd, 'cwd');

		const args = ['push'];
		if (force) args.push('--force');
		args.push(remote);
		if (branch) args.push(branch);

		await execFileAsync('git', args, { cwd: safeCwd, timeout: 60000 });

    return NextResponse.json({
      success: true,
      message: 'Push completed successfully'
    });
  } catch (error: any) {
    console.error('Git push failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to push',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
