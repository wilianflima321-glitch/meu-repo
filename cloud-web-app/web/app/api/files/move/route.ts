import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

/**
 * POST /api/files/move
 * 
 * Move ou renomeia arquivos
 */
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { projectId, sourcePath, targetPath } = await req.json();

    if (!projectId || !sourcePath || !targetPath) {
      return NextResponse.json(
        { error: 'projectId, sourcePath e targetPath são obrigatórios' },
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

    // Atualizar caminho do arquivo
    const movedFile = await prisma.file.update({
      where: {
        projectId_path: {
          projectId,
          path: sourcePath,
        },
      },
      data: {
        path: targetPath,
      },
    });

    return NextResponse.json({
      success: true,
      file: movedFile,
      message: 'Arquivo movido com sucesso',
    });
  } catch (error) {
    console.error('[files/move] Error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
