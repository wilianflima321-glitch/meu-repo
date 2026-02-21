/**
 * AETHEL ENGINE - Project Share API
 * 
 * Compartilha um projeto com outros usuarios ou gera link publico.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { notImplementedCapability } from '@/lib/server/capability-response';
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
    if (!session.user.email) {
      return NextResponse.json(
        { error: 'Nao autorizado', message: 'Missing user email for session.' },
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

    const owner = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!owner) {
      return NextResponse.json(
        { error: 'Nao autorizado', message: 'User not found for session.' },
        { status: 401 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: owner.id },
          { members: { some: { userId: owner.id } } },
        ],
      },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json(
        { error: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' },
        { status: 404 }
      );
    }

    const body: ShareConfig = await request.json();
    const { type, emails, teamId, permissions } = body;

    if (!type || !permissions) {
      return NextResponse.json(
        { error: 'Tipo de compartilhamento e permissoes sao obrigatorios' },
        { status: 400 }
      );
    }

    return notImplementedCapability({
      message: 'Project sharing is not wired to persistence yet.',
      capability: 'PROJECT_SHARE',
      milestone: 'P1',
      metadata: { projectId, type, permissions, hasEmails: Boolean(emails?.length), hasTeam: Boolean(teamId) },
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
    if (!session.user.email) {
      return NextResponse.json(
        { error: 'Nao autorizado', message: 'Missing user email for session.' },
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

    const owner = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!owner) {
      return NextResponse.json(
        { error: 'Nao autorizado', message: 'User not found for session.' },
        { status: 401 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: owner.id },
          { members: { some: { userId: owner.id } } },
        ],
      },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json(
        { error: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' },
        { status: 404 }
      );
    }

    return notImplementedCapability({
      message: 'Project share listing is not wired to persistence yet.',
      capability: 'PROJECT_SHARE',
      milestone: 'P1',
      metadata: { projectId },
    });
  } catch (error) {
    console.error('Erro ao buscar compartilhamentos:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar compartilhamentos' },
      { status: 500 }
    );
  }
}
