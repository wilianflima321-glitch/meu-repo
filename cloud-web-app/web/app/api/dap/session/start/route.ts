import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

interface StartSessionRequest {
  type: string;
  request: 'launch' | 'attach';
  name: string;
  program?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  port?: number;
  host?: string;
}

// In-memory session storage (in production, use Redis or database)
const activeSessions = new Map<string, {
  config: StartSessionRequest;
  events: any[];
  createdAt: Date;
}>();

export async function POST(request: NextRequest) {
  try {
    const config: StartSessionRequest = await request.json();

    if (!config.type || !config.request) {
      return NextResponse.json(
        { success: false, error: 'Type and request are required' },
        { status: 400 }
      );
    }

    const sessionId = randomUUID();

    activeSessions.set(sessionId, {
      config,
      events: [],
      createdAt: new Date()
    });

    console.log(`Debug session started: ${sessionId} (${config.type})`);

    // Simulate initialization event
    setTimeout(() => {
      const session = activeSessions.get(sessionId);
      if (session) {
        session.events.push({
          type: 'initialized',
          timestamp: new Date().toISOString()
        });
      }
    }, 100);

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Debug session started'
    });
  } catch (error) {
    console.error('Failed to start debug session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start session' },
      { status: 500 }
    );
  }
}
