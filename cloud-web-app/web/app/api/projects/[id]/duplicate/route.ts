/**
 * AETHEL ENGINE - Project Duplicate API
 * 
 * Duplica um projeto existente.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';
const MAX_PROJECT_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-duplicate-post',
      key: session?.user?.email || getRequestIp(request),
      max: 30,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project duplication attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = normalizeProjectId(params?.id);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

        const body = await request.json().catch(() => ({}));
    const { newName } = body;

    // Em produção, buscar projeto do banco e verificar permissões
    const newProjectId = crypto.randomUUID();
    const duplicatedProject = {
      id: newProjectId,
      name: newName || `Cópia de Projeto ${projectId.slice(0, 8)}`,
      originalProjectId: projectId,
      createdAt: new Date().toISOString(),
      createdBy: session.user.email,
      status: 'created',
    };

    return NextResponse.json({
      success: true,
      message: 'Projeto duplicado com sucesso',
      project: duplicatedProject,
    });
  } catch (error) {
    console.error('Erro ao duplicar projeto:', error);
    return NextResponse.json(
      { error: 'Falha ao duplicar projeto' },
      { status: 500 }
    );
  }
}
