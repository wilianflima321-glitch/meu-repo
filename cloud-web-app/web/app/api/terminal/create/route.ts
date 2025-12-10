import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

interface CreateTerminalRequest {
  name: string;
  cwd?: string;
  shellPath?: string;
  env?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateTerminalRequest = await request.json();
    const { name, cwd = '/workspace', shellPath = '/bin/bash', env = {} } = body;

    const sessionId = randomUUID();

    console.log(`Terminal session created: ${sessionId} (${name})`);

    return NextResponse.json({
      success: true,
      sessionId,
      name,
      cwd,
      shellPath,
      env: {
        ...process.env,
        ...env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      }
    });
  } catch (error) {
    console.error('Failed to create terminal session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
