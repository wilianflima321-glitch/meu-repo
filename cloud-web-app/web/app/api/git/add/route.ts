import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GitAddRequest {
  cwd: string;
  paths: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GitAddRequest = await request.json();
    const { cwd, paths } = body;

    if (!paths || paths.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No paths provided' },
        { status: 400 }
      );
    }

    // Escape paths and add to staging
    const escapedPaths = paths.map(p => `"${p}"`).join(' ');
    await execAsync(`git add ${escapedPaths}`, { cwd });

    return NextResponse.json({
      success: true,
      message: `Staged ${paths.length} file(s)`
    });
  } catch (error) {
    console.error('Git add failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stage files' },
      { status: 500 }
    );
  }
}
