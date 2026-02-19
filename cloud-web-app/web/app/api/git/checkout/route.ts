import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { assertWorkspacePath } from '@/lib/workspace';
import { apiErrorToResponse } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

const execFileAsync = promisify(execFile);

interface GitCheckoutRequest {
  cwd: string;
  branch: string;
  create?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'git-checkout-post',
      key: user.userId,
      max: 120,
      windowMs: 60 * 60 * 1000,
      message: 'Too many git checkout requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const body: GitCheckoutRequest = await request.json();
    const { cwd, branch, create = false } = body;
    const safeCwd = assertWorkspacePath(cwd, 'cwd');

    if (!branch || !branch.trim()) {
      return NextResponse.json(
        { success: false, error: 'Branch name is required' },
        { status: 400 }
      );
    }

    // Validate branch name (prevent command injection)
    const sanitizedBranch = branch.trim();
    if (!/^[\w\-./]+$/.test(sanitizedBranch)) {
      return NextResponse.json(
        { success: false, error: 'Invalid branch name' },
        { status: 400 }
      );
    }

    const args = ['checkout'];
    if (create) {
      args.push('-b');
    }
    args.push(sanitizedBranch);

    await execFileAsync('git', args, { cwd: safeCwd });

    return NextResponse.json({
      success: true,
      branch: sanitizedBranch,
      message: create ? `Created and switched to branch '${sanitizedBranch}'` : `Switched to branch '${sanitizedBranch}'`
    });
  } catch (error) {
    console.error('Git checkout failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    
    const errorMessage = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
