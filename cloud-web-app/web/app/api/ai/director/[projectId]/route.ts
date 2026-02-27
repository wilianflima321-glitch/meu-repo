/**
 * AI Director API
 * GET /api/ai/director/[projectId]
 *
 * Preview-only heuristic analysis with explicit PARTIAL capability status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const MAX_PROJECT_ID_LENGTH = 120;
const ANALYSIS_CACHE_TTL_MS = 5 * 60 * 1000;
const DIRECTOR_WARNING =
  'DIRECTOR_HEURISTIC_PREVIEW: local heuristic notes only; no dedicated LLM inference on this route.';

const normalizeProjectId = (value?: string) => String(value ?? '').trim();

interface DirectorNote {
  id: string;
  category: string;
  severity: 'suggestion' | 'recommendation' | 'critical';
  title: string;
  description: string;
  suggestion?: string;
  autoFixAvailable: boolean;
  reference?: {
    type: 'scene' | 'asset' | 'blueprint' | 'timeline';
    id: string;
    name: string;
  };
  createdAt: number;
  status: 'new' | 'acknowledged' | 'applied' | 'dismissed';
}

interface DirectorSession {
  id: string;
  projectType: 'game' | 'film' | 'archviz' | 'general';
  notes: DirectorNote[];
  overallScore: number;
  strengths: string[];
  improvements: string[];
  lastAnalysis: number;
  isAnalyzing: boolean;
}

type DirectorSessionPayload = DirectorSession & {
  capability: 'AI_DIRECTOR_NOTES';
  capabilityStatus: 'PARTIAL';
  analysisMode: 'heuristic_preview';
  runtimeMode: 'simulated_preview';
  warning: string;
};

const analysisCache = new Map<string, { session: DirectorSession; timestamp: number }>();

function withDirectorMeta(session: DirectorSession): DirectorSessionPayload {
  return {
    ...session,
    capability: 'AI_DIRECTOR_NOTES',
    capabilityStatus: 'PARTIAL',
    analysisMode: 'heuristic_preview',
    runtimeMode: 'simulated_preview',
    warning: DIRECTOR_WARNING,
  };
}

function detectProjectType(project: { name?: string | null }): DirectorSession['projectType'] {
  const name = (project.name || '').toLowerCase();
  if (name.includes('game') || name.includes('jogo')) return 'game';
  if (name.includes('film') || name.includes('filme')) return 'film';
  if (name.includes('archviz') || name.includes('arch') || name.includes('arq')) return 'archviz';
  return 'general';
}

function generateDirectorNotes(projectType: DirectorSession['projectType']): DirectorNote[] {
  const notes: DirectorNote[] = [];
  const now = Date.now();

  if (projectType === 'game') {
    notes.push({
      id: `note_${now}_1`,
      category: 'gameplay',
      severity: 'suggestion',
      title: 'Add stronger impact feedback',
      description: 'Particles and camera shake on collisions can improve perceived weight and responsiveness.',
      suggestion: 'Add a camera shake component to weapon impacts and trigger particles by collision material.',
      autoFixAvailable: true,
      createdAt: now,
      status: 'new',
    });
  }

  if (projectType === 'film' || projectType === 'general') {
    notes.push({
      id: `note_${now}_2`,
      category: 'lighting',
      severity: 'recommendation',
      title: 'Three-point lighting can be improved',
      description: 'Main scene appears to miss a fill light, causing hard shadows in key subject regions.',
      suggestion: 'Add a soft fill light at around 45 degrees opposite key light with 30-50% intensity.',
      autoFixAvailable: true,
      reference: {
        type: 'scene',
        id: 'main_scene',
        name: 'Main Scene',
      },
      createdAt: now,
      status: 'new',
    });
  }

  notes.push({
    id: `note_${now}_3`,
    category: 'composition',
    severity: 'suggestion',
    title: 'Rule of thirds opportunity',
    description: 'Primary focal point is centered. Consider moving it toward a thirds intersection.',
    autoFixAvailable: false,
    createdAt: now,
    status: 'new',
  });

  notes.push({
    id: `note_${now}_4`,
    category: 'color',
    severity: 'suggestion',
    title: 'Color palette is coherent',
    description: 'Current palette works well. Consider introducing one accent color for stronger hierarchy.',
    autoFixAvailable: false,
    createdAt: now,
    status: 'new',
  });

  if (projectType === 'game') {
    notes.push({
      id: `note_${now}_5`,
      category: 'ux',
      severity: 'recommendation',
      title: 'Strengthen implicit tutorial',
      description: 'First 30 seconds should communicate controls through interaction, not text prompts.',
      autoFixAvailable: false,
      createdAt: now,
      status: 'new',
    });
  }

  return notes;
}

function calculateOverallScore(notes: DirectorNote[]): {
  score: number;
  strengths: string[];
  improvements: string[];
} {
  let score = 85;
  for (const note of notes) {
    if (note.severity === 'critical') score -= 15;
    else if (note.severity === 'recommendation') score -= 5;
    else score -= 2;
  }
  score = Math.max(0, Math.min(100, score));

  const criticalCategories = notes.filter((n) => n.severity === 'critical').map((n) => n.category);
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (!criticalCategories.includes('composition')) strengths.push('Strong visual composition baseline');
  if (!criticalCategories.includes('color')) strengths.push('Consistent color language');
  if (!criticalCategories.includes('lighting')) strengths.push('Lighting baseline is stable');
  else improvements.push('Refine scene lighting balance');

  if (notes.some((n) => n.category === 'gameplay')) improvements.push('Improve gameplay impact feedback');
  if (notes.some((n) => n.category === 'ux')) improvements.push('Improve onboarding clarity');

  return { score, strengths, improvements };
}

function buildDirectorSession(projectId: string, project: { name?: string | null }): DirectorSession {
  const projectType = detectProjectType(project);
  const notes = generateDirectorNotes(projectType);
  const { score, strengths, improvements } = calculateOverallScore(notes);

  return {
    id: `dir_${projectId}_${Date.now()}`,
    projectType,
    notes,
    overallScore: score,
    strengths,
    improvements,
    lastAnalysis: Date.now(),
    isAnalyzing: false,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-director-get',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many director analysis requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { projectId: rawProjectId } = await params;
    const projectId = normalizeProjectId(rawProjectId);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { id: true, name: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'PROJECT_NOT_FOUND', message: 'Project not found.' }, { status: 404 });
    }

    const cached = analysisCache.get(projectId);
    const session =
      cached && Date.now() - cached.timestamp < ANALYSIS_CACHE_TTL_MS
        ? cached.session
        : buildDirectorSession(projectId, project);

    if (!cached || cached.session.id !== session.id) {
      analysisCache.set(projectId, { session, timestamp: Date.now() });
    }

    return NextResponse.json(withDirectorMeta(session), {
      headers: {
        'x-aethel-capability': 'AI_DIRECTOR_NOTES',
        'x-aethel-capability-status': 'PARTIAL',
        'x-aethel-runtime-mode': 'simulated_preview',
        'x-aethel-analysis-mode': 'heuristic_preview',
        'x-aethel-warning': DIRECTOR_WARNING,
      },
    });
  } catch (error) {
    console.error('Director API error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
