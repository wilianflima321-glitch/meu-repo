/**
 * Feature Flag Toggle API - Aethel Engine
 * POST /api/feature-flags/[key]/toggle - Toggle uma flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { withAdminAuth } from '@/lib/rbac';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

async function toggleHandler(
  request: NextRequest,
  context: { user: { id: string } }
) {
  try {
    const rateLimitResponse = await enforceRateLimit({
      scope: 'feature-flag-toggle-post',
      key: context.user.id,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many feature flag toggle requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    // Extract key from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const key = pathParts[pathParts.indexOf('feature-flags') + 1];
    
    const { enabled } = await request.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled must be boolean' },
        { status: 400 }
      );
    }

    const flag = await prisma.featureFlag.update({
      where: { key },
      data: { enabled },
    });

    return NextResponse.json({
      success: true,
      key,
      enabled: flag.enabled,
      updatedAt: flag.updatedAt,
    });
  } catch (error) {
    console.error('Failed to toggle feature flag:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export const POST = withAdminAuth(toggleHandler, 'ops:settings:feature_flags');
