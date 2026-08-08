/**
 * Project Commits API - Para TimeMachine
 * GET /api/projects/[id]/commits
 *
 * P2b HIGH (re-grep) — fail-closed empty until a real git/snapshot store is wired.
 * Never fabricate random commit stats or synthetic history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/projects/[id]/commits/route');

export const dynamic = 'force-dynamic';

export const PROJECT_COMMITS_SHIP_STATUS = 'HELD' as const;
export const PROJECT_COMMITS_HELD_REASON = 'real_git_snapshot_store_not_wired' as const;

interface ProjectCommit {
  id: string;
  hash: string;
  shortHash: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  date: string;
  timestamp: number;
  type: 'feature' | 'fix' | 'refactor' | 'asset' | 'config' | 'auto';
  filesChanged: number;
  additions: number;
  deletions: number;
  thumbnail?: string;
  tags?: string[];
  isBookmarked: boolean;
  isAutoSave: boolean;
}

/** Honesty surface for TimeMachine — empty commits, never fabricated. */
export function listProjectCommitsHonesty(): {
  commits: ProjectCommit[];
  shipStatus: typeof PROJECT_COMMITS_SHIP_STATUS;
  heldReason: typeof PROJECT_COMMITS_HELD_REASON;
  total: number;
  hasMore: false;
} {
  return {
    commits: [],
    shipStatus: PROJECT_COMMITS_SHIP_STATUS,
    heldReason: PROJECT_COMMITS_HELD_REASON,
    total: 0,
    hasMore: false,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(req);
    const { id: projectId } = await params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { id: true, name: true, createdAt: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const honesty = listProjectCommitsHonesty();

    routeLogger.info('project_commits_held', {
      projectId,
      shipStatus: honesty.shipStatus,
      heldReason: honesty.heldReason,
    });

    return NextResponse.json({
      projectId,
      commits: honesty.commits,
      total: honesty.total,
      hasMore: honesty.hasMore,
      shipStatus: honesty.shipStatus,
      heldReason: honesty.heldReason,
    });
  } catch (error) {
    routeLogger.error('Commits API error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
