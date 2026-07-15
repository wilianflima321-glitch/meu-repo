/**
 * AI Suggestions API
 * GET /api/ai/suggestions - Obtem sugestoes proativas
 * POST /api/ai/suggestions/[id]/action - Acao em sugestao
 * 
 * Sugestoes baseadas em contexto do usuario
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { AI_SUGGESTIONS_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/ai/suggestions/route');

export const dynamic = 'force-dynamic';

interface AISuggestion {
  id: string;
  type: 'optimization' | 'feature' | 'workflow' | 'learning' | 'warning';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action?: {
    label: string;
    command: string;
    params?: Record<string, any>;
  };
  dismissable: boolean;
  expiresAt?: number;
  context?: {
    trigger: string;
    relevance: number;
  };
}

// Sugestoes contextualizadas (em producao, ML-driven)
const suggestionPool: AISuggestion[] = [
  {
    id: 'sug_perf_1',
    type: 'optimization',
    priority: 'medium',
    title: 'Otimizar texturas nao utilizadas',
    description: 'Detectamos 12 texturas que nao estao sendo referenciadas. Remove-las pode economizar 340MB.',
    action: {
      label: 'Limpar agora',
      command: 'aethel.cleanUnusedTextures',
    },
    dismissable: true,
    context: {
      trigger: 'memory_usage_high',
      relevance: 0.85,
    },
  },
  {
    id: 'sug_feat_1',
    type: 'feature',
    priority: 'low',
    title: 'Tune viewport fidelity for your machine',
    description:
      'Use the single Fidelity control (Performance → Ultra) for honest WebGL2 preview quality. Final offline/native render remains [HELD].',
    action: {
      label: 'Open Fidelity',
      command: 'aethel.openViewportFidelity',
    },
    dismissable: true,
    context: {
      trigger: 'lighting_setup',
      relevance: 0.7,
    },
  },
  {
    id: 'sug_workflow_1',
    type: 'workflow',
    priority: 'high',
    title: 'Backup automatico configurado',
    description: 'Your project has unsaved changes for 30 minutes. Enable auto-save to avoid losing work.',
    action: {
      label: 'Ativar auto-save',
      command: 'aethel.enableAutoSave',
    },
    dismissable: true,
    context: {
      trigger: 'unsaved_changes',
      relevance: 0.95,
    },
  },
  {
    id: 'sug_learn_1',
    type: 'learning',
    priority: 'low',
    title: 'Dica: Atalho rapido',
    description: 'Use Ctrl+Shift+P para abrir a paleta de comandos e acessar qualquer funcao rapidamente.',
    dismissable: true,
    context: {
      trigger: 'new_user',
      relevance: 0.6,
    },
  },
  {
    id: 'sug_warn_1',
    type: 'warning',
    priority: 'high',
    title: 'Creditos baixos',
    description: 'Voce tem menos de 100 creditos. Considere adicionar mais para nao interromper seu trabalho.',
    action: {
      label: 'Adicionar creditos',
      command: 'aethel.openWallet',
    },
    dismissable: true,
    context: {
      trigger: 'low_balance',
      relevance: 1.0,
    },
  },
];

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimited = enforceAiCoreRateLimit({
      req,
      capability: 'ai.suggestions.read',
      route: '/api/ai/suggestions',
      config: AI_SUGGESTIONS_RATE_LIMIT,
    });
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(req.url);
    
    const limit = parseInt(searchParams.get('limit') || '5');
    const types = searchParams.get('types')?.split(',') || [];

    // Filtrar sugestoes baseado em contexto do usuario
    let suggestions = [...suggestionPool];
    
    if (types.length > 0) {
      suggestions = suggestions.filter(s => types.includes(s.type));
    }

    // Ordenar por relevancia e prioridade
    suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      const aRelevance = a.context?.relevance || 0.5;
      const bRelevance = b.context?.relevance || 0.5;
      return bRelevance - aRelevance;
    });

    // Adicionar expiracao
    suggestions = suggestions.slice(0, limit).map(s => ({
      ...s,
      expiresAt: Date.now() + 300000, // 5 min
    }));

    return NextResponse.json({
      suggestions,
      total: suggestionPool.length,
    });
  } catch (error) {
    routeLogger.error('Suggestions API error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
