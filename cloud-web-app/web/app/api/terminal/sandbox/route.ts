/**
 * API Route: Terminal Sandbox Session
 * 
 * Creates and manages isolated container sessions for terminal access.
 * Provides secure, ephemeral containers for each user session.
 * 
 * POST /api/terminal/sandbox - Create new sandbox session
 * DELETE /api/terminal/sandbox - Destroy sandbox session
 * GET /api/terminal/sandbox - Get sandbox session info
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthUser } from '@/lib/auth-server';
import { sandboxManager, SandboxSession } from '@/lib/server/sandbox-manager';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

// Track sandbox creation rate per user
const sandboxRateStore = new Map<string, { count: number; resetTime: number }>();
const SANDBOX_RATE_LIMIT = 10; // max per hour
const SANDBOX_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkSandboxRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = sandboxRateStore.get(userId);
  
  if (!record || record.resetTime <= now) {
    sandboxRateStore.set(userId, { count: 1, resetTime: now + SANDBOX_RATE_WINDOW });
    return true;
  }
  
  if (record.count >= SANDBOX_RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Get user tier for resource limits
 */
async function getUserTier(userId: string): Promise<'free' | 'pro' | 'enterprise'> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    const plan = user?.plan?.toLowerCase();
    if (plan === 'enterprise') return 'enterprise';
    if (plan === 'pro' || plan === 'premium') return 'pro';
    return 'free';
  } catch (error) {
    console.error('[Sandbox API] Error getting user tier:', error);
    return 'free';
  }
}

/**
 * POST /api/terminal/sandbox - Create new sandbox session
 */
export async function POST(req: NextRequest) {
  let user: AuthUser;
  try {
    user = requireAuth(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Rate limit check
  if (!checkSandboxRateLimit(user.userId)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Maximum 10 sandbox sessions per hour.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { workspaceId, workspacePath } = body;

    if (!workspaceId || !workspacePath) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, workspacePath' },
        { status: 400 }
      );
    }

    // Validate workspace ownership via project
    const project = await prisma.project.findFirst({
      where: {
        id: workspaceId,
        userId: user.userId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      );
    }

    // Check if sandbox mode is available
    if (!sandboxManager.isSandboxAvailable) {
      return NextResponse.json(
        { 
          error: 'Sandbox mode not available',
          fallback: 'direct',
          message: 'Container runtime not available. Using direct execution mode.',
        },
        { status: 503 }
      );
    }

    // Get user tier for resource limits
    const tier = await getUserTier(user.userId);

    // Create sandbox session
    const session = await sandboxManager.createSandbox({
      userId: user.userId,
      workspaceId,
      workspacePath,
    }, tier);

    // Log sandbox creation
    console.log(`[Sandbox API] Created sandbox for user ${user.userId}, workspace ${workspaceId}`);

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        containerName: session.containerName,
        createdAt: session.createdAt.toISOString(),
        tier,
      },
    });

  } catch (error) {
    console.error('[Sandbox API] Error creating sandbox:', error);
    
    if (error instanceof Error && error.message.includes('Maximum sessions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create sandbox session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/terminal/sandbox - Destroy sandbox session
 */
export async function DELETE(req: NextRequest) {
  let user: AuthUser;
  try {
    user = requireAuth(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }

    // Get session to verify ownership
    const session = sandboxManager.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (session.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Destroy sandbox
    await sandboxManager.destroySandbox(sessionId);

    console.log(`[Sandbox API] Destroyed sandbox ${sessionId} for user ${user.userId}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Sandbox API] Error destroying sandbox:', error);
    return NextResponse.json(
      { error: 'Failed to destroy sandbox session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/terminal/sandbox - Get sandbox session info
 */
export async function GET(req: NextRequest) {
  let user: AuthUser;
  try {
    user = requireAuth(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    // If sessionId provided, get specific session
    if (sessionId) {
      const session = sandboxManager.getSession(sessionId);
      
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      // Verify ownership
      if (session.userId !== user.userId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        session: {
          sessionId: session.sessionId,
          containerName: session.containerName,
          workspaceId: session.workspaceId,
          createdAt: session.createdAt.toISOString(),
          isActive: session.isActive,
        },
      });
    }

    // Otherwise, return all user sessions
    const sessions = sandboxManager.getUserSessions(user.userId);

    return NextResponse.json({
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        containerName: s.containerName,
        workspaceId: s.workspaceId,
        createdAt: s.createdAt.toISOString(),
        isActive: s.isActive,
      })),
      sandboxAvailable: sandboxManager.isSandboxAvailable,
    });

  } catch (error) {
    console.error('[Sandbox API] Error getting sandbox info:', error);
    return NextResponse.json(
      { error: 'Failed to get sandbox info' },
      { status: 500 }
    );
  }
}
