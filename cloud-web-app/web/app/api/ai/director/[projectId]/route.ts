/**
 * AI Director API - Análise Artística por IA
 * GET /api/ai/director/[projectId] - Obtém notas do diretor
 * POST /api/ai/director/[projectId]/analyze - Solicita nova análise
 * 
 * A IA age como um diretor de cinema/jogos experiente
 * oferecendo feedback artístico e técnico.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { blockIfSimulationDisabled } from '@/lib/server/simulation-guard';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/ai/director/[projectId]/route');

export const dynamic = 'force-dynamic';

// Cache de análises (em produção, usar Redis)
const analysisCache = new Map<string, {
  session: DirectorSession;
  timestamp: number;
}>();

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

interface DirectorProject {
  name: string;
  template?: string | null;
  description?: string | null;
  settings?: unknown;
}

type DirectorSessionPayload = DirectorSession & {
  capabilityStatus: 'PARTIAL';
  analysisMode: 'heuristic_preview';
  warning: string;
};

const DIRECTOR_WARNING =
  'DIRECTOR_HEURISTIC_PREVIEW: notas geradas por heuristica local, sem inferencia LLM dedicada nesta rota.';

function withDirectorMeta(session: DirectorSession): DirectorSessionPayload {
  return {
    ...session,
    capabilityStatus: 'PARTIAL',
    analysisMode: 'heuristic_preview',
    warning: DIRECTOR_WARNING,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = requireAuth(req);
    const { projectId } = await params;

    const blocked = blockIfSimulationDisabled({
      capability: 'AI_DIRECTOR',
      reason: 'CAPABILITY_NOT_IMPLEMENTED',
      message: 'AI director is currently heuristic preview only. Provide real runtime to enable.',
    })
    if (blocked) return blocked

    // Verificar se projeto existe e pertence ao usuário
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.userId,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verificar cache
    const cached = analysisCache.get(projectId);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
      return NextResponse.json(withDirectorMeta(cached.session));
    }

    // Buscar ou criar sessão
    const session = await getOrCreateDirectorSession(projectId, project);
    
    // Cachear
    analysisCache.set(projectId, {
      session,
      timestamp: Date.now(),
    });

    return NextResponse.json(withDirectorMeta(session), {
      headers: {
        "x-aethel-capability-status": "PARTIAL",
        "x-aethel-analysis-mode": "heuristic_preview",
      },
    });
  } catch (error) {
    routeLogger.error('Director API error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

async function getOrCreateDirectorSession(
  projectId: string, 
  project: DirectorProject
): Promise<DirectorSession> {
  // Analisar projeto e gerar notas baseadas em heurísticas
  // Em produção, isso usaria IA real via Ollama/OpenAI
  
  const projectType = detectProjectType(project);
  const notes = await generateDirectorNotes(project, projectType);
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

function detectProjectType(project: DirectorProject): DirectorSession['projectType'] {
  const name = (project.name || '').toLowerCase();
  const template = (project.template || '').toLowerCase();
  const tags = extractProjectTags(project.settings);
  
  if (tags.includes('game') || template.includes('game') || name.includes('game') || name.includes('jogo')) {
    return 'game';
  }
  if (tags.includes('film') || template.includes('film') || name.includes('film') || name.includes('filme')) {
    return 'film';
  }
  if (tags.includes('archviz') || template.includes('archviz') || name.includes('arch') || name.includes('arq')) {
    return 'archviz';
  }
  return 'general';
}

function extractProjectTags(settings: unknown): string[] {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return [];
  }

  const tags = (settings as { tags?: unknown }).tags;
  return Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.toLowerCase())
    : [];
}

async function generateDirectorNotes(
  project: DirectorProject,
  projectType: DirectorSession['projectType']
): Promise<DirectorNote[]> {
  const notes: DirectorNote[] = [];
  const now = Date.now();

  // Análise baseada em tipo de projeto
  if (projectType === 'game') {
    notes.push({
      id: `note_${now}_1`,
      category: 'gameplay',
      severity: 'suggestion',
      title: 'Considere adicionar feedback de impacto',
      description: 'Particle effects and screen shake on collisions increase the feeling of weight and impact.',
      suggestion: 'Add a CameraShake component to weapons and a particle system for impacts.',
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
      title: 'Incomplete three-point lighting',
      description: 'The main scene has no fill light, resulting in shadows that are too harsh.',
      suggestion: 'Add a soft light at 45 degrees opposite the key light with 30-50% intensity.',
      autoFixAvailable: true,
      reference: {
        type: 'scene',
        id: 'main_scene',
        name: 'Cena Principal',
      },
      createdAt: now,
      status: 'new',
    });
  }

  notes.push({
    id: `note_${now}_3`,
    category: 'composition',
    severity: 'suggestion',
    title: 'Rule of thirds can improve',
    description: 'The focal point is centered. Consider positioning it on one of the grid intersections.',
    autoFixAvailable: false,
    createdAt: now,
    status: 'new',
  });

  notes.push({
    id: `note_${now}_4`,
    category: 'color',
    severity: 'suggestion',
    title: 'Paleta de cores harmoniosa',
    description: 'A paleta atual usa cores complementares de forma efetiva. Considere adicionar um accent color.',
    autoFixAvailable: false,
    createdAt: now,
    status: 'new',
  });

  if (projectType === 'game') {
    notes.push({
      id: `note_${now}_5`,
      category: 'ux',
      severity: 'recommendation',
      title: 'Implicit tutorial',
      description: 'Os primeiros 30 segundos devem ensinar os controles sem texto. Considere gating visual.',
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
  // Score base de 70, deduzir baseado em severidade
  let score = 85;
  
  for (const note of notes) {
    if (note.severity === 'critical') score -= 15;
    else if (note.severity === 'recommendation') score -= 5;
    else score -= 2;
  }

  score = Math.max(0, Math.min(100, score));

  // Strengths baseados em categorias sem notas críticas
  const criticalCategories = notes
    .filter(n => n.severity === 'critical')
    .map(n => n.category);

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (!criticalCategories.includes('composition')) {
    strengths.push('Solid visual composition');
  }
  if (!criticalCategories.includes('color')) {
    strengths.push('Paleta de cores coerente');
  }
  if (!criticalCategories.includes('lighting')) {
    strengths.push('Well-executed lighting');
  } else {
    improvements.push('Refine lighting system');
  }

  // Improvements baseados em notas
  if (notes.some(n => n.category === 'gameplay')) {
    improvements.push('Polir feedback de gameplay');
  }
  if (notes.some(n => n.category === 'ux')) {
    improvements.push('Melhorar onboarding do jogador');
  }

  return { score, strengths, improvements };
}
