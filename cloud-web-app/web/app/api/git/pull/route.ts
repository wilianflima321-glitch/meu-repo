import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GitPullRequest {
  cwd: string;
  remote?: string;
  branch?: string;
  rebase?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: GitPullRequest = await request.json();
    const { cwd, remote = 'origin', branch, rebase = false } = body;

    const rebaseFlag = rebase ? '--rebase' : '';
    const branchArg = branch ? branch : '';
    
    const { stdout } = await execAsync(
      `git pull ${rebaseFlag} ${remote} ${branchArg}`,
      { cwd, timeout: 60000 }
    );

    return NextResponse.json({
      success: true,
      message: 'Pull completed successfully',
      output: stdout
    });
  } catch (error: any) {
    console.error('Git pull failed:', error);
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
