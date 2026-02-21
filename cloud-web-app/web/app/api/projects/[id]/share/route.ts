/**
 * AETHEL ENGINE - Project Share API
 * 
 * Compartilha um projeto com outros usuarios ou gera link publico.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';
const MAX_PROJECT_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();

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
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-share-post',
      key: session?.user?.email || getRequestIp(request),
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project share operations. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const projectId = normalizeProjectId(params?.id);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const body: ShareConfig = await request.json();
    const { type, emails, teamId, permissions, expiresIn } = body;

    if (!type || !permissions) {
      return NextResponse.json(
        { error: 'Tipo de compartilhamento e permissoes sao obrigatorios' },
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
      // Em producao, enviar emails
      shareResult.invitedEmails = emails;
      shareResult.message = `Convites enviados para ${emails.length} usuario(s)`;
    } else if (type === 'team' && teamId) {
      shareResult.teamId = teamId;
      shareResult.message = 'Projeto compartilhado com o time';
    }

    return NextResponse.json({
      success: true,
      message: 'Projeto compartilhado com sucesso',
      share: shareResult,
    });
  } catch (error) {
    console.error('Erro ao compartilhar projeto:', error);
    return NextResponse.json(
      { error: 'Falha ao compartilhar projeto' },
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
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-share-get',
      key: session?.user?.email || getRequestIp(request),
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project share list requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const projectId = normalizeProjectId(params?.id);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    
    // Em producao, buscar compartilhamentos do banco
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
    console.error('Erro ao buscar compartilhamentos:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar compartilhamentos' },
      { status: 500 }
    );
  }
}
