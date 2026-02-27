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

const MAX_FLAG_KEY_LENGTH = 120;
const normalizeFlagKey = (value?: string) => String(value ?? '').trim();

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
    const rawKey = pathParts[pathParts.indexOf('feature-flags') + 1];
    const key = normalizeFlagKey(rawKey);
    if (!key || key.length > MAX_FLAG_KEY_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'INVALID_FLAG_KEY', message: 'key is required and must be under 120 characters.' },
        { status: 400 }
      );
    }
    
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
