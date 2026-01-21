/**
 * Feature Flag Toggle API - Aethel Engine
 * POST /api/feature-flags/[key]/toggle - Toggle uma flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { withAdminAuth } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

async function toggleHandler(
  request: NextRequest,
  context: { user: { id: string } }
) {
  try {
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
