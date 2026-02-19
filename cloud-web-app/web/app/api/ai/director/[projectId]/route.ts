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
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

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
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-director-get',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many director analysis requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { projectId } = await params;

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
    console.error('Director API error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

async function getOrCreateDirectorSession(
  projectId: string, 
  project: any
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

function detectProjectType(project: any): DirectorSession['projectType'] {
  const name = (project.name || '').toLowerCase();
  const tags = project.tags || [];
  
  if (tags.includes('game') || name.includes('game') || name.includes('jogo')) {
    return 'game';
  }
  if (tags.includes('film') || name.includes('film') || name.includes('filme')) {
    return 'film';
  }
  if (tags.includes('archviz') || name.includes('arch') || name.includes('arq')) {
    return 'archviz';
  }
  return 'general';
}

async function generateDirectorNotes(
  project: any,
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
      description: 'Efeitos de partículas e screen shake em colisões aumentam a sensação de peso e impacto.',
      suggestion: 'Adicione um componente de CameraShake às armas e um sistema de partículas para impactos.',
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
      title: 'Iluminação de 3 pontos incompleta',
      description: 'A cena principal não possui luz de preenchimento (fill light), resultando em sombras muito duras.',
      suggestion: 'Adicione uma luz suave a 45° do lado oposto à luz principal com intensidade de 30-50%.',
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
    title: 'Regra dos terços pode melhorar',
    description: 'O ponto focal está centralizado. Considere posicioná-lo em uma das interseções da grade.',
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
      title: 'Tutorial implícito',
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
    strengths.push('Composição visual sólida');
  }
  if (!criticalCategories.includes('color')) {
    strengths.push('Paleta de cores coerente');
  }
  if (!criticalCategories.includes('lighting')) {
    strengths.push('Iluminação bem executada');
  } else {
    improvements.push('Refinar sistema de iluminação');
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
