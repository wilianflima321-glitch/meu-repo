import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { assertWorkspacePath } from '@/lib/workspace';
import { apiErrorToResponse } from '@/lib/api-errors';

const execFileAsync = promisify(execFile);

interface GitCommitRequest {
  cwd: string;
  message: string;
  amend?: boolean;
}

export async function POST(request: NextRequest) {
  try {
		const user = requireAuth(request);
		await requireEntitlementsForUser(user.userId);

    const body: GitCommitRequest = await request.json();
    const { cwd, message, amend = false } = body;
		const safeCwd = assertWorkspacePath(cwd, 'cwd');

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Commit message is required' },
        { status: 400 }
      );
    }

		const args = ['commit'];
		if (amend) args.push('--amend');
		args.push('-m', message);
		const { stdout } = await execFileAsync('git', args, { cwd: safeCwd });

    // Extract commit hash
    const hashMatch = stdout.match(/\[[\w-]+ ([a-f0-9]+)\]/);
    const hash = hashMatch ? hashMatch[1] : '';

    return NextResponse.json({
      success: true,
      hash,
      message: 'Commit created successfully'
    });
  } catch (error) {
    console.error('Git commit failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return NextResponse.json(
      { success: false, error: 'Failed to create commit' },
      { status: 500 }
    );
  }
}
