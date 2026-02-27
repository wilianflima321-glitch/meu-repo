/**
 * Project Commits API - TimeMachine feed
 * GET /api/projects/[id]/commits
 *
 * Current mode is partial and preview-oriented. Commit entries are generated
 * deterministically for UX continuity until real VCS persistence is integrated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const MAX_PROJECT_ID_LENGTH = 120;
const MAX_LIMIT = 100;
const MAX_OFFSET = 5000;
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;
const COMMITS_SIMULATED_WARNING =
  'COMMITS_SIMULATED_PREVIEW: commit history is generated for UX preview only.';

const normalizeProjectId = (value?: string) => String(value ?? '').trim();

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

function parseIntRange(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function parseIsoDate(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function stableNumber(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const span = max - min + 1;
  return min + (h % span);
}

function generateHash(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(40, '0').slice(0, 40);
}

async function generateProjectCommits(
  project: { id: string; name: string; createdAt: Date },
  options: { limit: number; offset: number; since?: Date; until?: Date }
): Promise<ProjectCommit[]> {
  const commits: ProjectCommit[] = [];
  const now = Date.now();

  const commitMessages = [
    { msg: 'feat: Added particle system', type: 'feature' as const },
    { msg: 'fix: Resolved collision bug', type: 'fix' as const },
    { msg: 'asset: Added new character meshes', type: 'asset' as const },
    { msg: 'refactor: Optimized LOD pipeline', type: 'refactor' as const },
    { msg: 'feat: Implemented day-night cycle', type: 'feature' as const },
    { msg: 'fix: Patched texture memory leak', type: 'fix' as const },
    { msg: 'asset: Updated PBR textures', type: 'asset' as const },
    { msg: 'config: Tuned graphics quality', type: 'config' as const },
    { msg: 'feat: Added save/load flow', type: 'feature' as const },
    { msg: 'auto: Automatic snapshot', type: 'auto' as const },
  ];

  const numCommits = Math.min(options.limit, 50);
  for (let i = options.offset; i < options.offset + numCommits; i += 1) {
    const msgData = commitMessages[i % commitMessages.length];
    const hash = generateHash(`${project.id}:${i}`);
    const commitTime = new Date(now - i * 6 * 60 * 60 * 1000);

    if (options.since && commitTime < options.since) continue;
    if (options.until && commitTime > options.until) continue;

    const deterministicSeed = `${project.id}:${hash}:${i}`;
    commits.push({
      id: `commit_${hash}`,
      hash,
      shortHash: hash.slice(0, 7),
      message: msgData.msg,
      author: {
        name: 'You',
        email: 'user@aethel.studio',
      },
      date: commitTime.toISOString(),
      timestamp: commitTime.getTime(),
      type: msgData.type,
      filesChanged: stableNumber(`${deterministicSeed}:files`, 1, 15),
      additions: stableNumber(`${deterministicSeed}:adds`, 10, 210),
      deletions: stableNumber(`${deterministicSeed}:dels`, 0, 50),
      isBookmarked: stableNumber(`${deterministicSeed}:bookmark`, 0, 9) === 0,
      isAutoSave: msgData.type === 'auto',
    });
  }

  return commits;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-commits-get',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many commit history requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { id: rawProjectId } = await params;
    const projectId = normalizeProjectId(rawProjectId);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        {
          error: 'INVALID_PROJECT_ID',
          message: 'projectId is required and must be under 120 characters.',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseIntRange(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = parseIntRange(searchParams.get('offset'), DEFAULT_OFFSET, 0, MAX_OFFSET);
    const since = parseIsoDate(searchParams.get('since'));
    const until = parseIsoDate(searchParams.get('until'));
    if (since && until && since > until) {
      return NextResponse.json(
        {
          error: 'INVALID_DATE_RANGE',
          message: 'since must be earlier than or equal to until.',
        },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { id: true, name: true, createdAt: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const commits = await generateProjectCommits(project, {
      limit,
      offset,
      since,
      until,
    });

    return NextResponse.json(
      {
        projectId,
        commits,
        total: commits.length + offset,
        hasMore: commits.length === limit,
        capability: 'PROJECT_COMMITS',
        capabilityStatus: 'PARTIAL',
        runtimeMode: 'simulated_preview',
        warning: COMMITS_SIMULATED_WARNING,
        metadata: {
          limit,
          offset,
          since: since?.toISOString() || null,
          until: until?.toISOString() || null,
        },
      },
      {
        headers: {
          'x-aethel-capability': 'PROJECT_COMMITS',
          'x-aethel-capability-status': 'PARTIAL',
          'x-aethel-runtime-mode': 'simulated_preview',
        },
      }
    );
  } catch (error) {
    console.error('Commits API error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
