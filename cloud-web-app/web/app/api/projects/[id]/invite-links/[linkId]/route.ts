/**
 * Invite Link Management API - Aethel Engine
 * DELETE /api/projects/[id]/invite-links/[linkId] - revoke invite link
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { notImplementedCapability } from '@/lib/server/capability-response';

export const dynamic = 'force-dynamic';

const MAX_PROJECT_ID_LENGTH = 120;
const MAX_LINK_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();
const normalizeLinkId = (value?: string) => String(value ?? '').trim();

// DELETE /api/projects/[id]/invite-links/[linkId] - revoke invite link
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-invite-link-delete',
      key: user.userId,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many invite link revocations. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = normalizeProjectId(params?.id);
    const linkId = normalizeLinkId(params?.linkId);

    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PROJECT_ID',
          message: 'projectId is required and must be under 120 characters.',
        },
        { status: 400 }
      );
    }

    if (!linkId || linkId.length > MAX_LINK_ID_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_LINK_ID',
          message: 'linkId is required and must be under 120 characters.',
        },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: user.userId },
          { members: { some: { userId: user.userId, role: 'admin' } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    try {
      await (prisma as any).inviteLink.delete({
        where: {
          id: linkId,
          projectId,
        },
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'INVITE_LINK_NOT_FOUND', message: 'Invite link not found.' },
          { status: 404 }
        );
      }

      return notImplementedCapability({
        message: 'Invite links storage is not available. Run migrations to enable this feature.',
        capability: 'PROJECT_INVITE_LINKS',
        milestone: 'P1',
        metadata: { projectId, linkId },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Invite link revoked',
    });
  } catch (error) {
    console.error('[Invite Link Delete API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
