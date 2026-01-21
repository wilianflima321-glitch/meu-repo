/**
 * AETHEL ENGINE - Project Share API
 * 
 * Compartilha um projeto com outros usuários ou gera link público.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';

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
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const projectId = params.id;
    const body: ShareConfig = await request.json();
    const { type, emails, teamId, permissions, expiresIn } = body;

    if (!type || !permissions) {
      return NextResponse.json(
        { error: 'Tipo de compartilhamento e permissões são obrigatórios' },
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
      shareResult.message = `Convites enviados para ${emails.length} usuário(s)`;
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
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
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
    console.error('Erro ao buscar compartilhamentos:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar compartilhamentos' },
      { status: 500 }
    );
  }
}
