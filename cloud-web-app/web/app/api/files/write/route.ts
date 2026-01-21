import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

/**
 * POST /api/files/write
 * 
 * Escreve conteúdo em um arquivo (usado pela IA)
 */
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { projectId, path, content, createIfNotExists = true } = await req.json();

    if (!projectId || !path) {
      return NextResponse.json(
        { error: 'projectId e path são obrigatórios' },
        { status: 400 }
      );
    }

    if (content === undefined) {
      return NextResponse.json(
        { error: 'content é obrigatório' },
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

    // Detectar linguagem
    const extension = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'py': 'python',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'md': 'markdown',
    };
    const language = languageMap[extension || ''] || null;

    if (createIfNotExists) {
      // Upsert - cria ou atualiza
      const file = await prisma.file.upsert({
        where: {
          projectId_path: {
            projectId,
            path,
          },
        },
        update: {
          content,
        },
        create: {
          projectId,
          path,
          content,
          language,
        },
      });

      return NextResponse.json({
        success: true,
        file,
        created: !file.updatedAt || file.createdAt === file.updatedAt,
        message: 'Arquivo salvo com sucesso',
      });
    } else {
      // Apenas atualiza se existir
      const file = await prisma.file.update({
        where: {
          projectId_path: {
            projectId,
            path,
          },
        },
        data: {
          content,
        },
      });

      return NextResponse.json({
        success: true,
        file,
        message: 'Arquivo atualizado com sucesso',
      });
    }
  } catch (error) {
    console.error('[files/write] Error:', error);
    
    // Verificar se é erro de "not found"
    if ((error as any)?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      );
    }
    
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
