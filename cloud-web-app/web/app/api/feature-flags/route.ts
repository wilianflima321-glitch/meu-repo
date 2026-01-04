/**
 * Feature Flags API - Aethel Engine
 * GET /api/feature-flags - Lista todas as flags
 * POST /api/feature-flags - Cria/atualiza uma flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Feature flags default (fallback se DB não tiver)
const defaultFlags = [
  {
    key: 'new_dashboard',
    name: 'Novo Dashboard',
    enabled: true,
    type: 'percentage',
    percentage: 50,
  },
  {
    key: 'ai_code_review',
    name: 'AI Code Review',
    enabled: true,
    type: 'boolean',
  },
  {
    key: 'multiplayer_editing',
    name: 'Edição Multiplayer',
    enabled: true,
    type: 'boolean',
  },
  {
    key: 'advanced_analytics',
    name: 'Analytics Avançado',
    enabled: true,
    type: 'rule_based',
    rules: [{ attribute: 'user.plan', operator: 'in_list', value: ['pro', 'studio', 'enterprise'] }],
  },
];

export async function GET(request: NextRequest) {
  try {
    // Flags podem ser públicas para o cliente avaliar
    // Em produção, buscar do banco de dados
    
    // Por enquanto, retorna flags default
    return NextResponse.json({
      success: true,
      flags: defaultFlags,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Failed to get feature flags:', error);
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    
    // Apenas admins podem criar/editar flags
    // TODO: Verificar role de admin
    
    const body = await request.json();
    const { key, name, enabled, type, percentage, rules, environments } = body;
    
    if (!key || !name) {
      return NextResponse.json(
        { success: false, error: 'Key and name are required' },
        { status: 400 }
      );
    }
    
    // Em produção, salvar no banco de dados
    // Por enquanto, apenas retorna o que foi enviado
    const flag = {
      key,
      name,
      enabled: enabled ?? true,
      type: type || 'boolean',
      percentage,
      rules,
      environments,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.userId,
    };
    
    return NextResponse.json({
      success: true,
      flag,
    });
  } catch (error) {
    console.error('Failed to create feature flag:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
