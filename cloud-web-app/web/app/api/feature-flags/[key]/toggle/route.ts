/**
 * Feature Flag Toggle API - Aethel Engine
 * POST /api/feature-flags/[key]/toggle - Toggle uma flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const user = requireAuth(request);
    const { key } = params;
    const { enabled } = await request.json();
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled must be boolean' },
        { status: 400 }
      );
    }
    
    // Em produção, atualizar no banco de dados
    console.log(`[FeatureFlags] Toggle ${key} to ${enabled} by ${user.userId}`);
    
    return NextResponse.json({
      success: true,
      key,
      enabled,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to toggle feature flag:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
