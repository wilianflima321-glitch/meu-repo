import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { assertWorkspacePath } from '@/lib/workspace';
import { apiErrorToResponse } from '@/lib/api-errors';

const execAsync = promisify(exec);

interface GitStatusRequest {
  cwd: string;
}

interface GitStatusFile {
  path: string;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
		const user = requireAuth(request);
		await requireEntitlementsForUser(user.userId);

    const body: GitStatusRequest = await request.json();
    const { cwd } = body;
		const safeCwd = assertWorkspacePath(cwd, 'cwd');

    // Get current branch
    const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: safeCwd });
    const branch = branchOutput.trim();

    // Get ahead/behind counts
    let ahead = 0, behind = 0;
    try {
      const { stdout: revListOutput } = await execAsync(
        `git rev-list --left-right --count HEAD...@{upstream}`,
        { cwd: safeCwd }
      );
      const [aheadStr, behindStr] = revListOutput.trim().split('\t');
      ahead = parseInt(aheadStr) || 0;
      behind = parseInt(behindStr) || 0;
    } catch (error) {
      // No upstream configured
    }

    // Get status
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: safeCwd });
    
		const staged: GitStatusFile[] = [];
		const unstaged: GitStatusFile[] = [];
		const untracked: GitStatusFile[] = [];
		const conflicted: GitStatusFile[] = [];

    for (const line of statusOutput.split('\n')) {
      if (!line) continue;

      const status = line.substring(0, 2);
      const path = line.substring(3);

      if (status.includes('U') || status.includes('A') && status.includes('A')) {
        conflicted.push({ path, status: 'conflicted' });
      } else if (status[0] !== ' ' && status[0] !== '?') {
        const fileStatus = status[0] === 'M' ? 'modified' 
          : status[0] === 'A' ? 'added'
          : status[0] === 'D' ? 'deleted'
          : status[0] === 'R' ? 'renamed'
          : status[0] === 'C' ? 'copied'
          : 'modified';
        staged.push({ path, status: fileStatus });
      }
      
      if (status[1] !== ' ' && status[1] !== '?') {
        const fileStatus = status[1] === 'M' ? 'modified'
          : status[1] === 'D' ? 'deleted'
          : 'modified';
        unstaged.push({ path, status: fileStatus });
      }
      
      if (status === '??') {
        untracked.push({ path, status: 'untracked' });
      }
    }

    return NextResponse.json({
      success: true,
      status: {
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        conflicted
      }
    });
  } catch (error) {
    console.error('Git status failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return NextResponse.json(
      { success: false, error: 'Failed to get git status' },
      { status: 500 }
    );
  }
}
