/**
 * Invite Links API - Aethel Engine
 * GET /api/projects/[id]/invite-links - Lista links de convite
 * POST /api/projects/[id]/invite-links - Cria novo link de convite
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { nanoid } from 'nanoid';
import { buildAppUrl } from '@/lib/server/app-origin';

export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/invite-links
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-invite-links-get',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many invite link list requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const projectId = params.id;

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

    // Busca links de convite existentes
    let inviteLinks: any[] = [];
    
    try {
      // Tenta buscar do modelo InviteLink se existir
      inviteLinks = await (prisma as any).inviteLink.findMany({
        where: { 
          projectId,
          OR: [
            { expiresAt: { gt: new Date() } },
            { expiresAt: null },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // InviteLink model não existe - retorna array vazio
      // Em produção, criar migration para adicionar modelo InviteLink
      inviteLinks = [];
    }

    return NextResponse.json({
      success: true,
      data: inviteLinks.map((link: any) => ({
        id: link.id,
        code: link.code,
        role: link.role,
        expiresAt: link.expiresAt?.toISOString() || null,
        usageCount: link.usageCount || 0,
        maxUsage: link.maxUsage || null,
      })),
    });
  } catch (error) {
    console.error('[Invite Links API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/invite-links - Cria link de convite
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-invite-links-post',
      key: user.userId,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many invite link creation attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const projectId = params.id;
    const body = await request.json();
    const { role = 'viewer', expiresIn, maxUsage } = body;

    // Validar role
    if (!['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

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

    // Gera código único
    const code = nanoid(16);
    
    // Calcula expiração (default: 7 dias)
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let inviteLink: any;
    
    try {
      // Tenta criar no modelo InviteLink se existir
      inviteLink = await (prisma as any).inviteLink.create({
        data: {
          projectId,
          code,
          role,
          expiresAt,
          maxUsage: maxUsage || null,
          usageCount: 0,
          createdBy: user.userId,
        },
      });
    } catch (err) {
      // InviteLink model não existe - retorna erro e instrução
      console.error('[Invite Links API] InviteLink model not available:', err);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invite links feature not available. Please run prisma generate to sync the database schema.',
          details: 'The InviteLink model may not be defined in your Prisma schema.'
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: inviteLink.id,
        code: inviteLink.code,
        role: inviteLink.role,
        expiresAt: inviteLink.expiresAt?.toISOString() || null,
        usageCount: inviteLink.usageCount,
        maxUsage: inviteLink.maxUsage,
        url: buildAppUrl(`/invite/${code}`, request),
      },
    });
  } catch (error) {
    console.error('[Invite Links API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
