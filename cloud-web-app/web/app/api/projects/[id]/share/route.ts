/**
 * AETHEL ENGINE - Project Share API
 *
 * Creates and lists persisted share links for a project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/projects/[id]/share/route');

interface ShareConfig {
  type: 'link' | 'email' | 'team';
  emails?: string[];
  teamId?: string;
  permissions: 'view' | 'edit' | 'admin';
  expiresIn?: number;
}

function shareBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return host ? `${proto}://${host}` : 'https://aethel.studio';
}

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { ok: false as const, status: 404, error: 'Project not found' };
  if (project.userId !== userId) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }
  return { ok: true as const, project };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = requireAuth(request);
    const projectId = params.id;
    const ownership = await assertProjectOwner(projectId, user.userId);
    if (!ownership.ok) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const body: ShareConfig = await request.json();
    const { type, emails, teamId, permissions, expiresIn } = body;

    if (!type || !permissions) {
      return NextResponse.json(
        { error: 'Sharing type and permissions are required' },
        { status: 400 },
      );
    }

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 60 * 60 * 1000)
      : null;

    const baseUrl = shareBaseUrl(request);

    if (type === 'email' && emails?.length) {
      const created = await Promise.all(
        emails.map((email) =>
          prisma.projectShareLink.create({
            data: {
              projectId,
              type: 'email',
              permissions,
              invitedEmail: email,
              createdBy: user.userId,
              expiresAt,
            },
          }),
        ),
      );

      return NextResponse.json({
        success: true,
        message: `Invites created for ${created.length} user(s)`,
        shares: created.map((share) => ({
          shareId: share.id,
          token: share.token,
          type: share.type,
          permissions: share.permissions,
          invitedEmail: share.invitedEmail,
          shareUrl: `${baseUrl}/share/${share.token}`,
          expiresAt: share.expiresAt,
        })),
      });
    }

    const share = await prisma.projectShareLink.create({
      data: {
        projectId,
        type,
        permissions,
        teamId: type === 'team' ? teamId : null,
        createdBy: user.userId,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Project shared successfully',
      share: {
        shareId: share.id,
        token: share.token,
        projectId,
        type: share.type,
        permissions: share.permissions,
        teamId: share.teamId,
        shareUrl: `${baseUrl}/share/${share.token}`,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    routeLogger.error('Error sharing project:', error);
    return NextResponse.json({ error: 'Failed to share project' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = requireAuth(request);
    const projectId = params.id;
    const ownership = await assertProjectOwner(projectId, user.userId);
    if (!ownership.ok) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const baseUrl = shareBaseUrl(request);
    const shares = await prisma.projectShareLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      projectId,
      shares: shares.map((share) => ({
        shareId: share.id,
        token: share.token,
        type: share.type,
        permissions: share.permissions,
        invitedEmail: share.invitedEmail,
        teamId: share.teamId,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        shareUrl: `${baseUrl}/share/${share.token}`,
      })),
      totalShares: shares.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    routeLogger.error('Error fetching shares:', error);
    return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
  }
}
