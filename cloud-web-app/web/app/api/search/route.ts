import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { getSearchRuntime } from '@/lib/server/search-runtime';
import { resolveWorkspaceRoot } from '@/lib/server/workspace-path';

/**
 * POST /api/search - Text Search in Workspace
 * 
 * Body:
 * - query: string (required)
 * - workspaceRoot: string (optional, defaults to AETHEL_WORKSPACE_ROOT)
 * - isRegex: boolean (optional, default false)
 * - isCaseSensitive: boolean (optional, default false)
 * - isWholeWord: boolean (optional, default false)
 * - includePattern: string (optional, comma-separated globs)
 * - excludePattern: string (optional, comma-separated globs)
 * - maxResults: number (optional, default 10000)
 * - useGitignore: boolean (optional, default true)
 * - contextLines: number (optional, default 2)
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await requireEntitlementsForUser(user.userId);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'search-post',
      key: user.userId,
      max: 480,
      windowMs: 60 * 60 * 1000,
      message: 'Too many workspace search requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const {
      query,
      workspaceRoot,
      isRegex = false,
      isCaseSensitive = false,
      isWholeWord = false,
      includePattern = '',
      excludePattern = '',
      maxResults = 10000,
      useGitignore = true,
      contextLines = 2,
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const resolvedRoot = resolveWorkspaceRoot(workspaceRoot || process.env.AETHEL_WORKSPACE_ROOT || process.cwd());
    const searchRuntime = getSearchRuntime();

    const result = await searchRuntime.search({
      query,
      workspaceRoot: resolvedRoot,
      isRegex,
      isCaseSensitive,
      isWholeWord,
      includePattern,
      excludePattern,
      maxResults,
      useGitignore,
      contextLines,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Search failed:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search?type=files&query=xxx - Quick File Search
 * 
 * Query params:
 * - type: 'files' | 'symbols' (required)
 * - query: string (required)
 * - workspaceRoot: string (optional)
 * - maxResults: number (optional, default 100)
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await requireEntitlementsForUser(user.userId);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'search-get',
      key: user.userId,
      max: 720,
      windowMs: 60 * 60 * 1000,
      message: 'Too many quick search requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const query = searchParams.get('query');
    const workspaceRoot = searchParams.get('workspaceRoot');
    const maxResults = parseInt(searchParams.get('maxResults') || '100', 10);

    if (!type || !query) {
      return NextResponse.json(
        { error: 'type and query are required' },
        { status: 400 }
      );
    }

    const resolvedRoot = resolveWorkspaceRoot(workspaceRoot || process.env.AETHEL_WORKSPACE_ROOT || process.cwd());
    const searchRuntime = getSearchRuntime();

    if (type === 'files') {
      const result = await searchRuntime.searchFiles({
        query,
        workspaceRoot: resolvedRoot,
        maxResults,
      });

      return NextResponse.json(result);
    }

    if (type === 'symbols') {
      const result = await searchRuntime.searchSymbols({
        query,
        workspaceRoot: resolvedRoot,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid type. Must be "files" or "symbols"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('File search failed:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
