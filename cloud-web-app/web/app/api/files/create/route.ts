import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

/**
 * POST /api/files/create
 * 
 * Cria um novo arquivo ou pasta
 */
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { projectId, path, content = '', type = 'file', language } = await req.json();

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

    // Verificar se já existe
    const existingFile = await prisma.file.findUnique({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
    });

    if (existingFile) {
      return NextResponse.json(
        { error: 'Arquivo já existe' },
        { status: 409 }
      );
    }

    // Detectar linguagem pelo path se não fornecida
    const detectedLanguage = language || detectLanguage(path);

    // Criar arquivo
    const file = await prisma.file.create({
      data: {
        projectId,
        path,
        content: type === 'folder' ? '' : content,
        language: detectedLanguage,
      },
    });

    return NextResponse.json({
      success: true,
      file,
      message: type === 'folder' ? 'Pasta criada com sucesso' : 'Arquivo criado com sucesso',
    });
  } catch (error) {
    console.error('[files/create] Error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

/**
 * Detecta linguagem baseado na extensão do arquivo
 */
function detectLanguage(path: string): string | null {
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
    'scss': 'scss',
    'md': 'markdown',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sql': 'sql',
    'sh': 'shellscript',
    'bash': 'shellscript',
    'ps1': 'powershell',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'lua': 'lua',
    'glsl': 'glsl',
    'hlsl': 'hlsl',
  };

  return languageMap[extension || ''] || null;
}
