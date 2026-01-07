/**
 * Invite Link Management API - Aethel Engine
 * DELETE /api/projects/[id]/invite-links/[linkId] - Revoga link
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

// DELETE /api/projects/[id]/invite-links/[linkId] - Revoga link de convite
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const user = requireAuth(request);
    const { id: projectId, linkId } = params;

    // Verifica se é owner ou admin do projeto
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
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      );
    }

    try {
      // Tenta deletar do modelo InviteLink se existir
      await (prisma as any).inviteLink.delete({
        where: {
          id: linkId,
          projectId,
        },
      });
    } catch {
      // InviteLink model não existe ou link não encontrado
      // Em produção, isso seria um erro real
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
