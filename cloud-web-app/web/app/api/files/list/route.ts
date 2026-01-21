import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

/**
 * GET /api/files/list?projectId=xxx&path=/folder
 * 
 * Lista conteúdo de um diretório
 */
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const path = searchParams.get('path') || '';

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId é obrigatório' },
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

    // Buscar arquivos no path especificado
    const allFiles = await prisma.file.findMany({
      where: {
        projectId,
        ...(path ? {
          path: {
            startsWith: path.endsWith('/') ? path : `${path}/`,
          },
        } : {}),
      },
      orderBy: { path: 'asc' },
    });

    // Filtrar apenas items no nível atual
    const normalizedPath = path.replace(/\/$/, '');
    const items = allFiles
      .filter(file => {
        const relativePath = normalizedPath 
          ? file.path.slice(normalizedPath.length + 1) 
          : file.path;
        // Apenas arquivos que não estão em subdiretórios
        return !relativePath.includes('/') || relativePath.split('/').length === 1;
      })
      .map(file => ({
        name: file.path.split('/').pop() || file.path,
        path: file.path,
        type: file.path.endsWith('/') ? 'folder' : 'file',
        language: file.language,
        size: file.content?.length || 0,
        updatedAt: file.updatedAt,
      }));

    // Extrair pastas únicas
    const folders = new Set<string>();
    allFiles.forEach(file => {
      const relativePath = normalizedPath 
        ? file.path.slice(normalizedPath.length + 1) 
        : file.path;
      const parts = relativePath.split('/');
      if (parts.length > 1) {
        folders.add(parts[0]);
      }
    });

    // Adicionar pastas à lista
    const folderItems = Array.from(folders).map(folderName => ({
      name: folderName,
      path: normalizedPath ? `${normalizedPath}/${folderName}` : folderName,
      type: 'folder' as const,
      language: null,
      size: 0,
      updatedAt: new Date(),
    }));

    // Combinar e ordenar (pastas primeiro)
    const sortedItems = [...folderItems, ...items.filter(i => i.type !== 'folder')]
      .sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      path: normalizedPath || '/',
      items: sortedItems,
      total: sortedItems.length,
    });
  } catch (error) {
    console.error('[files/list] Error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
