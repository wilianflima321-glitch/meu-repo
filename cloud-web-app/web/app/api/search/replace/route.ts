import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { getSearchRuntime } from '@/lib/server/search-runtime';
import { resolveWorkspaceRoot } from '@/lib/server/workspace-path';

/**
 * POST /api/search/replace - Search and Replace in Workspace
 * 
 * Body:
 * - query: string (required)
 * - replacement: string (required)
 * - workspaceRoot: string (optional)
 * - isRegex: boolean (optional, default false)
 * - isCaseSensitive: boolean (optional, default false)
 * - isWholeWord: boolean (optional, default false)
 * - includePattern: string (optional)
 * - excludePattern: string (optional)
 * - preserveCase: boolean (optional, default false)
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await requireEntitlementsForUser(user.userId);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'search-replace-post',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many replace requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const {
      query,
      replacement,
      workspaceRoot,
      isRegex = false,
      isCaseSensitive = false,
      isWholeWord = false,
      includePattern = '',
      excludePattern = '',
      preserveCase = false,
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    if (replacement === undefined) {
      return NextResponse.json(
        { error: 'replacement is required' },
        { status: 400 }
      );
    }

    const resolvedRoot = resolveWorkspaceRoot(workspaceRoot || process.env.AETHEL_WORKSPACE_ROOT || process.cwd());
    const searchRuntime = getSearchRuntime();

    const result = await searchRuntime.replace({
      query,
      replacement,
      workspaceRoot: resolvedRoot,
      isRegex,
      isCaseSensitive,
      isWholeWord,
      includePattern,
      excludePattern,
      preserveCase,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Replace failed:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { success: false, error: 'Replace failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
