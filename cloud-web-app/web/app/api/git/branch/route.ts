import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { assertWorkspacePath } from '@/lib/workspace';
import { apiErrorToResponse } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

const execFileAsync = promisify(execFile);

interface GitBranchRequest {
  cwd: string;
  name?: string;
  delete?: string;
  rename?: { oldName: string; newName: string };
}

/**
 * Git Branch API
 * 
 * POST: Create a new branch
 * GET: List all branches
 * DELETE: Delete a branch
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'git-branch-post',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many git branch mutation requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const body: GitBranchRequest = await request.json();
    const { cwd, name, rename } = body;
    const safeCwd = assertWorkspacePath(cwd, 'cwd');

    if (rename) {
      // Rename branch
      const { oldName, newName } = rename;
      if (!oldName || !newName) {
        return NextResponse.json(
          { success: false, error: 'Both oldName and newName are required for rename' },
          { status: 400 }
        );
      }

      // Validate branch names
      if (!/^[\w\-./]+$/.test(oldName) || !/^[\w\-./]+$/.test(newName)) {
        return NextResponse.json(
          { success: false, error: 'Invalid branch name' },
          { status: 400 }
        );
      }

      await execFileAsync('git', ['branch', '-m', oldName, newName], { cwd: safeCwd });

      return NextResponse.json({
        success: true,
        message: `Renamed branch '${oldName}' to '${newName}'`
      });
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Branch name is required' },
        { status: 400 }
      );
    }

    // Validate branch name (prevent command injection)
    const sanitizedName = name.trim();
    if (!/^[\w\-./]+$/.test(sanitizedName)) {
      return NextResponse.json(
        { success: false, error: 'Invalid branch name' },
        { status: 400 }
      );
    }

    await execFileAsync('git', ['branch', sanitizedName], { cwd: safeCwd });

    return NextResponse.json({
      success: true,
      branch: sanitizedName,
      message: `Created branch '${sanitizedName}'`
    });
  } catch (error) {
    console.error('Git branch create failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create branch';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'git-branch-get',
      key: user.userId,
      max: 600,
      windowMs: 60 * 60 * 1000,
      message: 'Too many git branch list requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const { searchParams } = new URL(request.url);
    const cwd = searchParams.get('cwd');
    
    if (!cwd) {
      return NextResponse.json(
        { success: false, error: 'cwd parameter is required' },
        { status: 400 }
      );
    }

    const safeCwd = assertWorkspacePath(cwd, 'cwd');

    // Get all branches
    const { stdout: localBranches } = await execFileAsync(
      'git', ['branch', '--format=%(refname:short)'], 
      { cwd: safeCwd }
    );

    // Get current branch
    const { stdout: currentBranch } = await execFileAsync(
      'git', ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd: safeCwd }
    );

    const branches = localBranches
      .split('\n')
      .map(b => b.trim())
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      branches,
      current: currentBranch.trim()
    });
  } catch (error) {
    console.error('Git branch list failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    
    return NextResponse.json(
      { success: false, error: 'Failed to list branches' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'git-branch-delete',
      key: user.userId,
      max: 120,
      windowMs: 60 * 60 * 1000,
      message: 'Too many git branch delete requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const body: GitBranchRequest = await request.json();
    const { cwd, name } = body;
    const safeCwd = assertWorkspacePath(cwd, 'cwd');

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Branch name is required' },
        { status: 400 }
      );
    }

    // Validate branch name
    const sanitizedName = name.trim();
    if (!/^[\w\-./]+$/.test(sanitizedName)) {
      return NextResponse.json(
        { success: false, error: 'Invalid branch name' },
        { status: 400 }
      );
    }

    // Use -d for safe delete (requires branch to be merged)
    // Use -D for force delete
    await execFileAsync('git', ['branch', '-d', sanitizedName], { cwd: safeCwd });

    return NextResponse.json({
      success: true,
      message: `Deleted branch '${sanitizedName}'`
    });
  } catch (error) {
    console.error('Git branch delete failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete branch';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
