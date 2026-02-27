/**
 * Aethel Engine - Project Duplicate API
 *
 * This endpoint is explicitly gated until real duplicate workflow exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { notImplementedCapability } from '@/lib/server/capability-response';

const MAX_PROJECT_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();
type RouteContext = { params: Promise<{ id: string }> };

async function resolveProjectId(ctx: RouteContext) {
  const resolved = await ctx.params;
  return normalizeProjectId(resolved?.id);
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-duplicate-post',
      key: user.userId,
      max: 30,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project duplication attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = await resolveProjectId(ctx);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        {
          error: 'INVALID_PROJECT_ID',
          message: 'projectId is required and must be under 120 characters.',
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedName = typeof body?.newName === 'string' ? body.newName.trim() : null;

    return notImplementedCapability({
      message: 'Project duplication is not implemented yet. Use export/import workflow in Workbench.',
      capability: 'PROJECT_DUPLICATION',
      milestone: 'P1',
      metadata: {
        projectId,
        requestedName,
      },
    });
  } catch (error) {
    console.error('Project duplicate endpoint error:', error);
    return NextResponse.json(
      { error: 'PROJECT_DUPLICATE_FAILED', message: 'Failed to process project duplication request.' },
      { status: 500 }
    );
  }
}
