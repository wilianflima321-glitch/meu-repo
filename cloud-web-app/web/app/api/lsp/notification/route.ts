import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { getOrCreateLspSession } from '@/lib/server/lsp-runtime';

interface LSPNotification {
  language: string;
  method: string;
  params: any;
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
		await requireFeatureForUser(user.userId, 'lsp');

    const body: LSPNotification = await request.json();
    const { language, method, params } = body;

    if (!language || !method) {
      return NextResponse.json(
        { error: 'Language and method are required' },
        { status: 400 }
      );
    }

    console.log(`LSP Notification [${language}]: ${method}`);

    const workspaceRoot = process.env.AETHEL_WORKSPACE_ROOT || process.cwd();
    const session = await getOrCreateLspSession({
      userId: user.userId,
      language,
      workspaceRoot,
    });

    session.rpc.sendNotification(method, params ?? {});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LSP notification failed:', error);
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;
    const code = (error as any)?.code;
    if (code === 'UNSUPPORTED_LSP_LANGUAGE') {
      return NextResponse.json(
        { success: false, error: 'UNSUPPORTED_LSP_LANGUAGE' },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: 'Notification failed' }, { status: 500 });
  }
}
