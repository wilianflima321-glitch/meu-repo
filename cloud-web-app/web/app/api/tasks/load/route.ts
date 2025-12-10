import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface LoadTasksRequest {
  workspaceRoot: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoadTasksRequest = await request.json();
    const { workspaceRoot } = body;

    // Try to load .vscode/tasks.json
    const tasksPath = join(workspaceRoot, '.vscode', 'tasks.json');
    
    try {
      const content = await readFile(tasksPath, 'utf-8');
      const tasksConfig = JSON.parse(content);
      
      return NextResponse.json({
        success: true,
        tasks: tasksConfig.tasks || []
      });
    } catch (error) {
      // File doesn't exist or invalid JSON, return empty
      return NextResponse.json({
        success: true,
        tasks: []
      });
    }
  } catch (error) {
    console.error('Failed to load tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load tasks' },
      { status: 500 }
    );
  }
}
