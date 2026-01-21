import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

/**
 * POST /api/files/copy
 * 
 * Copia arquivos ou pastas
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

    // Buscar arquivo de origem
    const sourceFile = await prisma.file.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: sourcePath,
        },
      },
    });

    if (!sourceFile) {
      return NextResponse.json(
        { error: 'Arquivo de origem não encontrado' },
        { status: 404 }
      );
    }

    // Criar cópia
    const copiedFile = await prisma.file.create({
      data: {
        projectId,
        path: targetPath,
        content: sourceFile.content,
        language: sourceFile.language,
      },
    });

    return NextResponse.json({
      success: true,
      file: copiedFile,
      message: 'Arquivo copiado com sucesso',
    });
  } catch (error) {
    console.error('[files/copy] Error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
