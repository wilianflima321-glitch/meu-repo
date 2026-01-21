import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

/**
 * POST /api/files/delete
 * 
 * Deleta arquivos ou pastas
 */
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { projectId, path, recursive } = await req.json();

    if (!projectId || !path) {
      return NextResponse.json(
        { error: 'projectId e path são obrigatórios' },
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

    if (recursive) {
      // Deletar pasta e todos os arquivos dentro
      const deleted = await prisma.file.deleteMany({
        where: {
          projectId,
          path: {
            startsWith: path,
          },
        },
      });

      return NextResponse.json({
        success: true,
        deletedCount: deleted.count,
        message: `${deleted.count} arquivo(s) deletado(s)`,
      });
    } else {
      // Deletar arquivo único
      await prisma.file.delete({
        where: {
          projectId_path: {
            projectId,
            path,
          },
        },
      });

      return NextResponse.json({
        success: true,
        path,
        message: 'Arquivo deletado com sucesso',
      });
    }
  } catch (error) {
    console.error('[files/delete] Error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

/**
 * DELETE /api/files/delete (alternativo)
 */
export async function DELETE(req: NextRequest) {
  return POST(req);
}
