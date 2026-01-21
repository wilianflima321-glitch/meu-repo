import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

/**
 * POST /api/files/rename
 * 
 * Renomeia um arquivo ou pasta
 */
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { projectId, oldPath, newPath } = await req.json();

    if (!projectId || !oldPath || !newPath) {
      return NextResponse.json(
        { error: 'projectId, oldPath e newPath são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar propriedade do projeto
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se destino já existe
    const existingFile = await prisma.file.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: newPath,
        },
      },
    });

    if (existingFile) {
      return NextResponse.json(
        { error: 'Já existe um arquivo com esse nome' },
        { status: 409 }
      );
    }

    // Renomear arquivo
    const renamedFile = await prisma.file.update({
      where: {
        projectId_path: {
          projectId,
          path: oldPath,
        },
      },
      data: {
        path: newPath,
      },
    });

    return NextResponse.json({
      success: true,
      file: renamedFile,
      message: 'Arquivo renomeado com sucesso',
    });
  } catch (error) {
    console.error('[files/rename] Error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
