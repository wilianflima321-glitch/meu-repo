/**
 * Feature Flags API - Aethel Engine
 * GET /api/feature-flags - Lista todas as flags
 * POST /api/feature-flags - Cria/atualiza uma flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { withAdminAuth } from '@/lib/rbac';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';

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
    const rateLimitResponse = await enforceRateLimit({
      scope: 'feature-flags-get',
      key: getRequestIp(request),
      max: 480,
      windowMs: 60 * 60 * 1000,
      message: 'Too many feature flag requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    // Flags podem ser públicas para o cliente avaliar
    const flags = await prisma.featureFlag.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    const data = flags.length > 0 ? flags : defaultFlags;

    return NextResponse.json({
      success: true,
      flags: data,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Failed to get feature flags:', error);
    return apiInternalError();
  }
}

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const rateLimitResponse = await enforceRateLimit({
        scope: 'feature-flags-post',
        key: user.id,
        max: 180,
        windowMs: 60 * 60 * 1000,
        message: 'Too many feature flag update requests. Please wait before retrying.',
      });
      if (rateLimitResponse) return rateLimitResponse;

      const body = await request.json();
      const { key, name, enabled, type, percentage, rules, environments, description } = body;

      if (!key || !name) {
        return NextResponse.json(
          { success: false, error: 'Key and name are required' },
          { status: 400 }
        );
      }

      const flag = await prisma.featureFlag.upsert({
        where: { key },
        create: {
          key,
          name,
          description: description || null,
          enabled: enabled ?? true,
          type: type || 'boolean',
          percentage: typeof percentage === 'number' ? percentage : null,
          rules: rules ?? null,
          environments: environments ?? null,
          createdBy: user.id,
        },
        update: {
          name,
          description: description || null,
          enabled: enabled ?? true,
          type: type || 'boolean',
          percentage: typeof percentage === 'number' ? percentage : null,
          rules: rules ?? null,
          environments: environments ?? null,
        },
      });

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
  },
  'ops:settings:feature_flags'
);
