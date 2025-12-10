import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GitCommitRequest {
  cwd: string;
  message: string;
  amend?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: GitCommitRequest = await request.json();
    const { cwd, message, amend = false } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Commit message is required' },
        { status: 400 }
      );
    }

    const amendFlag = amend ? '--amend' : '';
    const { stdout } = await execAsync(
      `git commit ${amendFlag} -m "${message.replace(/"/g, '\\"')}"`,
      { cwd }
    );

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
    return NextResponse.json(
      { success: false, error: 'Failed to create commit' },
      { status: 500 }
    );
  }
}
