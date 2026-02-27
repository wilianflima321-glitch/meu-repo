/**
 * AI Suggestions API
 * GET /api/ai/suggestions - Obtém sugestões proativas
 * POST /api/ai/suggestions/[id]/action - Ação em sugestão
 * 
 * Sugestões baseadas em contexto do usuário
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

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

// Sugestões contextualizada (em produção, ML-driven)
const suggestionPool: AISuggestion[] = [
  {
    id: 'sug_perf_1',
    type: 'optimization',
    priority: 'medium',
    title: 'Otimizar texturas não utilizadas',
    description: 'Detectamos 12 texturas que não estão sendo referenciadas. Removê-las pode economizar 340MB.',
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
    title: 'Experimente o novo sistema de iluminação',
    description: 'Lumen está disponível para seu projeto. Ative para iluminação global em tempo real.',
    action: {
      label: 'Ativar Lumen',
      command: 'aethel.enableLumen',
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
    title: 'Backup automático configurado',
    description: 'Seu projeto tem alterações não salvas há 30 minutos. Ative auto-save para não perder trabalho.',
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
    title: 'Dica: Atalho rápido',
    description: 'Use Ctrl+Shift+P para abrir a paleta de comandos e acessar qualquer função rapidamente.',
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
    title: 'Créditos baixos',
    description: 'Você tem menos de 100 créditos. Considere adicionar mais para não interromper seu trabalho.',
    action: {
      label: 'Adicionar créditos',
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
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-suggestions-get',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many suggestion requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { searchParams } = new URL(req.url);
    
    const limit = parseInt(searchParams.get('limit') || '5');
    const types = searchParams.get('types')?.split(',') || [];

    // Filtrar sugestões baseado em contexto do usuário
    let suggestions = [...suggestionPool];
    
    if (types.length > 0) {
      suggestions = suggestions.filter(s => types.includes(s.type));
    }

    // Ordenar por relevância e prioridade
    suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      const aRelevance = a.context?.relevance || 0.5;
      const bRelevance = b.context?.relevance || 0.5;
      return bRelevance - aRelevance;
    });

    // Adicionar expiração
    suggestions = suggestions.slice(0, limit).map(s => ({
      ...s,
      expiresAt: Date.now() + 300000, // 5 min
    }));

    return NextResponse.json({
      suggestions,
      total: suggestionPool.length,
    });
  } catch (error) {
    console.error('Suggestions API error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
