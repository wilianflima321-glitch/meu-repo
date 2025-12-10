import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GitPushRequest {
  cwd: string;
  remote?: string;
  branch?: string;
  force?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: GitPushRequest = await request.json();
    const { cwd, remote = 'origin', branch, force = false } = body;

    const forceFlag = force ? '--force' : '';
    const branchArg = branch ? branch : '';
    
    await execAsync(
      `git push ${forceFlag} ${remote} ${branchArg}`,
      { cwd, timeout: 60000 }
    );

    return NextResponse.json({
      success: true,
      message: 'Push completed successfully'
    });
  } catch (error: any) {
    console.error('Git push failed:', error);
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
