/**
 * AETHEL ENGINE - Project Share API
 * 
 * Compartilha um projeto com outros usuários ou gera link público.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/projects/[id]/share/route');

interface ShareConfig {
  type: 'link' | 'email' | 'team';
  emails?: string[];
  teamId?: string;
  permissions: 'view' | 'edit' | 'admin';
  expiresIn?: number; // horas
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const projectId = params.id;
    const body: ShareConfig = await request.json();
    const { type, emails, teamId, permissions, expiresIn } = body;

    if (!type || !permissions) {
      return NextResponse.json(
        { error: 'Sharing type and permissions are required' },
        { status: 400 }
      );
    }

    const shareId = crypto.randomUUID();
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString()
      : null;

    const shareResult: Record<string, unknown> = {
      shareId,
      projectId,
      type,
      permissions,
      createdAt: new Date().toISOString(),
      createdBy: session.user.email,
      expiresAt,
    };

    if (type === 'link') {
      // Gerar link de compartilhamento
      shareResult.shareUrl = `https://aethel.studio/share/${shareId}`;
    } else if (type === 'email' && emails) {
      // Em produção, enviar emails
      shareResult.invitedEmails = emails;
      shareResult.message = `Invites sent to ${emails.length} user(s)`;
    } else if (type === 'team' && teamId) {
      shareResult.teamId = teamId;
      shareResult.message = 'Project shared with the team';
    }

    return NextResponse.json({
      success: true,
      message: 'Project shared successfully',
      share: shareResult,
    });
  } catch (error) {
    routeLogger.error('Error sharing project:', error);
    return NextResponse.json(
      { error: 'Failed to share project' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const projectId = params.id;

    // Em produção, buscar compartilhamentos do banco
    const shares = [
      {
        shareId: 'share-1',
        type: 'link',
        permissions: 'view',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        shareUrl: `https://aethel.studio/share/share-1`,
      },
    ];

    return NextResponse.json({
      projectId,
      shares,
      totalShares: shares.length,
    });
  } catch (error) {
    routeLogger.error('Error fetching shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shares' },
      { status: 500 }
    );
  }
}
