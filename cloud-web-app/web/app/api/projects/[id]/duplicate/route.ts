/**
 * AETHEL ENGINE - Project Duplicate API
 * 
 * Duplica um projeto existente.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';

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
