/**
 * Project Commits API - Para TimeMachine
 * GET /api/projects/[id]/commits
 * 
 * Retorna historico de commits/snapshots do projeto
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
const MAX_PROJECT_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();

export const dynamic = 'force-dynamic';

const COMMITS_SIMULATED_WARNING = 'COMMITS_SIMULATED_PREVIEW: commit history is generated for UX preview only.';

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
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }
    const { searchParams } = new URL(req.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const since = searchParams.get('since'); // ISO date
    const until = searchParams.get('until'); // ISO date

    // Verificar projeto
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { id: true, name: true, createdAt: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Buscar commits do projeto (tabela projectSnapshot ou similar)
    // Em producao, isso viria do banco + Git real
    const commits = await generateProjectCommits(project, {
      limit,
      offset,
      since: since ? new Date(since) : undefined,
      until: until ? new Date(until) : undefined,
    });

    return NextResponse.json(
      {
        projectId,
        commits,
        total: commits.length + offset, // Simplified
        hasMore: commits.length === limit,
        capability: 'PROJECT_COMMITS',
        capabilityStatus: 'PARTIAL',
        runtimeMode: 'simulated_preview',
        warning: COMMITS_SIMULATED_WARNING,
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

async function generateProjectCommits(
  project: { id: string; name: string; createdAt: Date },
  options: { limit: number; offset: number; since?: Date; until?: Date }
): Promise<ProjectCommit[]> {
  const commits: ProjectCommit[] = [];
  const now = Date.now();
  
  // Gerar commits baseados na idade do projeto
  const commitMessages = [
    { msg: 'feat: Adicionado sistema de particulas', type: 'feature' as const },
    { msg: 'fix: Corrigido bug de colisao', type: 'fix' as const },
    { msg: 'asset: Novos modelos de personagem', type: 'asset' as const },
    { msg: 'refactor: Otimizado sistema de LOD', type: 'refactor' as const },
    { msg: 'feat: Implementado ciclo dia/noite', type: 'feature' as const },
    { msg: 'fix: Vazamento de memoria em texturas', type: 'fix' as const },
    { msg: 'asset: Texturas PBR atualizadas', type: 'asset' as const },
    { msg: 'config: Ajustes de qualidade grafica', type: 'config' as const },
    { msg: 'feat: Sistema de save/load', type: 'feature' as const },
    { msg: 'auto: Snapshot automatico', type: 'auto' as const },
  ];

  const numCommits = Math.min(options.limit, 50);
  
  for (let i = options.offset; i < options.offset + numCommits; i++) {
    const msgData = commitMessages[i % commitMessages.length];
    const hash = generateHash(project.id + i);
    const commitTime = new Date(now - (i * 3600000 * 6)); // 6 horas entre commits
    
    // Filtrar por data se especificado
    if (options.since && commitTime < options.since) continue;
    if (options.until && commitTime > options.until) continue;

    commits.push({
      id: `commit_${hash}`,
      hash,
      shortHash: hash.slice(0, 7),
      message: msgData.msg,
      author: {
        name: 'Voce',
        email: 'user@aethel.studio',
      },
      date: commitTime.toISOString(),
      timestamp: commitTime.getTime(),
      type: msgData.type,
      filesChanged: Math.floor(Math.random() * 15) + 1,
      additions: Math.floor(Math.random() * 200) + 10,
      deletions: Math.floor(Math.random() * 50),
      isBookmarked: Math.random() > 0.9,
      isAutoSave: msgData.type === 'auto',
    });
  }

  return commits;
}

function generateHash(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(40, '0').slice(0, 40);
}
