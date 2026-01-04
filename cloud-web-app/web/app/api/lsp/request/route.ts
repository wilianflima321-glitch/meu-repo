import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { getOrCreateLspSession } from '@/lib/server/lsp-runtime';
import { resolveWorkspaceRoot } from '@/lib/server/workspace-path';

interface LSPRequest {
  language: string;
  method: string;
  params: any;
  id: number;
}

export async function POST(request: NextRequest) {
  let safeId: number | null = null;
  try {
    const user = requireAuth(request);
		await requireFeatureForUser(user.userId, 'lsp');

    const body: LSPRequest = await request.json();
    const { language, method, params, id } = body;

    safeId = typeof id === 'number' ? id : null;

    if (!language || !method) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: safeId,
          error: {
            code: -32602,
            message: 'Invalid params',
            data: 'Language and method are required'
          }
        },
        { status: 400 }
      );
    }

    console.log(`LSP Request [${language}]: ${method}`);

    // Deriva workspace a partir do initialize.rootUri/workspaceFolders quando disponível.
    let workspaceRoot = process.env.AETHEL_WORKSPACE_ROOT || process.cwd();
    if (method === 'initialize' && params && typeof params === 'object') {
      const rootUri = (params as any).rootUri;
      const folders = (params as any).workspaceFolders;
      const candidate =
        (typeof rootUri === 'string' && rootUri) ||
        (Array.isArray(folders) && folders[0] && typeof folders[0].uri === 'string' ? folders[0].uri : null);
      if (candidate) workspaceRoot = candidate;
    }

    const session = await getOrCreateLspSession({
      userId: user.userId,
      language,
      workspaceRoot: resolveWorkspaceRoot(workspaceRoot),
    });

    const result = await session.rpc.sendRequest(safeId ?? 0, method, params ?? {});
    return NextResponse.json({ jsonrpc: '2.0', id: safeId, result });
  } catch (error) {
    console.error('LSP request failed:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    const code = (error as any)?.code;
    if (code === 'UNSUPPORTED_LSP_LANGUAGE') {
      return NextResponse.json(
        { jsonrpc: '2.0', id: safeId ?? null, error: { code: -32601, message: 'Method not found', data: String(error) } },
        { status: 422 }
      );
    }
    if (code === 'TYPESCRIPT_LANGUAGE_SERVER_NOT_INSTALLED') {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: safeId ?? null,
          error: {
            code: -32010,
            message: 'LSP_RUNTIME_NOT_READY',
            data: 'typescript-language-server não encontrado no workspace (instale dependências do web).',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: safeId ?? null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}
