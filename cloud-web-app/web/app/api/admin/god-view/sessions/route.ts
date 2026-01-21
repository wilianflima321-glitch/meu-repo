import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';
import { requireAuth } from '@/lib/auth-server';

// =============================================================================
// GOD VIEW SESSIONS API
// =============================================================================

async function handler(req: NextRequest) {
  try {
    // Get all active live sessions
    const sessions = await prisma.liveSession.findMany({
      where: {
        isActive: true,
        lastPingAt: {
          // Sessions active in last 5 minutes
          gte: new Date(Date.now() - 5 * 60 * 1000),
        },
      },
      orderBy: { startedAt: 'desc' },
    });
    
    // Calculate stats
    const totalActive = sessions.length;
    const totalAICalls = sessions.reduce((sum, s) => sum + s.aiCallsCount, 0);
    const totalAICost = sessions.reduce((sum, s) => sum + s.aiCostIncurred, 0);
    const totalTokens = sessions.reduce((sum, s) => sum + s.aiTokensUsed, 0);
    
    // Group by country
    const byCountryMap = new Map<string, number>();
    for (const session of sessions) {
      const country = session.country || 'Unknown';
      byCountryMap.set(country, (byCountryMap.get(country) || 0) + 1);
    }
    const byCountry = Array.from(byCountryMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
    
    // Group by device (parse from userAgent)
    const byDeviceMap = new Map<string, number>();
    for (const session of sessions) {
      const ua = session.userAgent || '';
      const isMobile = /Mobile|Android|iPhone|iPod/.test(ua);
      const isTablet = /iPad|Tablet/.test(ua);
      const device = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
      byDeviceMap.set(device, (byDeviceMap.get(device) || 0) + 1);
    }
    const byDevice = Array.from(byDeviceMap.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);
    
    // Get plan breakdown from users
    const userIds = [...new Set(sessions.map(s => s.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, plan: true },
    });
    
    const planMap = new Map<string, number>();
    for (const user of users) {
      const plan = user.plan.replace('_trial', '');
      planMap.set(plan, (planMap.get(plan) || 0) + 1);
    }
    const byPlan = Array.from(planMap.entries())
      .map(([plan, count]) => ({ plan, count }))
      .sort((a, b) => b.count - a.count);
    
    return NextResponse.json({
      sessions,
      stats: {
        totalActive,
        totalAICalls,
        totalAICost,
        totalTokens,
        byCountry,
        byDevice,
        byPlan,
      },
    });
    
  } catch (error) {
    console.error('[God View] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live sessions' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler, 'ops:users:view');

// =============================================================================
// SESSION TRACKING (called by client)
// =============================================================================

async function updateSessionHandler(req: NextRequest) {
  let authUser;
  try {
    authUser = requireAuth(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { 
    sessionId,
    projectId,
    projectName,
    currentPage,
    currentTool,
    lastAction,
    aiCallIncrement,
    aiTokensIncrement,
    aiCostIncrement,
  } = body;

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }
  
  try {
    // Get IP and user agent from request
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = req.headers.get('user-agent') || '';
    
    // GeoIP lookup would go here in production
    const country = undefined; // Would use MaxMind or similar
    const city = undefined;
    
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, email: true, name: true },
    });

    let resolvedProjectId: string | undefined;
    let resolvedProjectName: string | undefined;
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { userId: authUser.userId },
            { members: { some: { userId: authUser.userId } } },
          ],
        },
        select: { id: true, name: true },
      });
      if (project) {
        resolvedProjectId = project.id;
        resolvedProjectName = project.name;
      }
    }

    await prisma.liveSession.upsert({
      where: { id: sessionId },
      create: {
        id: sessionId,
        userId: authUser.userId,
        userEmail: dbUser?.email || authUser.email,
        userName: dbUser?.name || undefined,
        projectId: resolvedProjectId,
        projectName: resolvedProjectName || projectName,
        ipAddress: ip,
        userAgent,
        country,
        city,
        currentPage,
        currentTool,
        lastAction,
        aiCallsCount: typeof aiCallIncrement === 'number' ? aiCallIncrement : 0,
        aiTokensUsed: typeof aiTokensIncrement === 'number' ? aiTokensIncrement : 0,
        aiCostIncurred: typeof aiCostIncrement === 'number' ? aiCostIncrement : 0,
        startedAt: new Date(),
        lastPingAt: new Date(),
        isActive: true,
      },
      update: {
        projectId: resolvedProjectId,
        projectName: resolvedProjectName || projectName,
        currentPage,
        currentTool,
        lastAction,
        lastPingAt: new Date(),
        ...(typeof aiCallIncrement === 'number' && aiCallIncrement !== 0
          ? { aiCallsCount: { increment: aiCallIncrement } }
          : {}),
        ...(typeof aiTokensIncrement === 'number' && aiTokensIncrement !== 0
          ? { aiTokensUsed: { increment: aiTokensIncrement } }
          : {}),
        ...(typeof aiCostIncrement === 'number' && aiCostIncrement !== 0
          ? { aiCostIncurred: { increment: aiCostIncrement } }
          : {}),
      },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Session Update] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

export const POST = updateSessionHandler;

// End session
async function endSessionHandler(req: NextRequest) {
  try {
    requireAuth(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('id');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }
  
  try {
    await prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Session End] Error:', error);
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}

export const DELETE = endSessionHandler;
