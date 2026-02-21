/**
 * Director Actions API
 * POST /api/ai/director/[projectId]/action
 *
 * Supported actions:
 * - analyze (not implemented)
 * - apply (not implemented)
 * - dismiss (feedback only)
 * - acknowledge (feedback only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { capabilityResponse, notImplementedCapability } from '@/lib/server/capability-response';

export const dynamic = 'force-dynamic';

interface ActionPayload {
  action: 'analyze' | 'dismiss' | 'apply' | 'acknowledge';
  noteId?: string;
}

const MAX_PROJECT_ID_LENGTH = 120;
const MAX_NOTE_ID_LENGTH = 120;
const normalizeRouteId = (value?: string) => String(value ?? '').trim();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-director-action-post',
      key: user.userId,
      max: 90,
      windowMs: 60 * 60 * 1000,
      message: 'Too many director action requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const resolved = await params;
    const projectId = normalizeRouteId(resolved?.projectId);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        {
          error: 'INVALID_PROJECT_ID',
          message: 'projectId is required and must be under 120 characters.',
        },
        { status: 400 }
      );
    }

    const body: ActionPayload = await req.json();
    const action = body?.action;
    const noteId = normalizeRouteId(body?.noteId);

    if (!action || !['analyze', 'dismiss', 'apply', 'acknowledge'].includes(action)) {
      return NextResponse.json({ error: 'INVALID_ACTION', message: 'Invalid action.' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'PROJECT_NOT_FOUND', message: 'Project not found.' }, { status: 404 });
    }

    if (action === 'analyze' || action === 'apply') {
      return notImplementedCapability({
        message: 'Director automation is not implemented yet. Use manual workflow in Workbench.',
        capability: 'AI_DIRECTOR_AUTOMATION',
        milestone: 'P1',
        metadata: { projectId, action, noteId: noteId || null },
      });
    }

    if (!noteId || noteId.length > MAX_NOTE_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_NOTE_ID', message: 'noteId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    await logUserFeedback(user.userId, projectId, noteId, action);
    return capabilityResponse({
      error: 'DIRECTOR_ACTION_RECORDED',
      message: 'Director feedback recorded in preview mode.',
      status: 202,
      capability: 'AI_DIRECTOR_FEEDBACK',
      capabilityStatus: 'PARTIAL',
      milestone: 'P1',
      runtimeMode: 'simulated_preview',
      metadata: { projectId, noteId, action },
    });
  } catch (error) {
    console.error('Director action error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

async function logUserFeedback(
  userId: string,
  projectId: string,
  noteId: string,
  action: string
) {
  console.log(`[Director Feedback] User ${userId} ${action} note ${noteId} in project ${projectId}`);
}
