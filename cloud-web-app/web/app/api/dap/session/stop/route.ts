import { NextRequest, NextResponse } from 'next/server';

interface StopSessionRequest {
  sessionId: string;
}

// Access the same session storage (would be shared module in production)
declare global {
  var activeSessions: Map<string, any> | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body: StopSessionRequest = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log(`Debug session stopped: ${sessionId}`);

    return NextResponse.json({
      success: true,
      message: 'Debug session stopped'
    });
  } catch (error) {
    console.error('Failed to stop debug session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop session' },
      { status: 500 }
    );
  }
}
