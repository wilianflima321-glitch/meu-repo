/**
 * Marketplace Favorites API
 *
 * Uses persistent storage in UserPreferences.preferences.marketplaceFavorites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { createComponentLogger } from '@/lib/observability/logger';
import { enforceRouteRateLimit, MARKETPLACE_READ_RATE_LIMIT } from '@/lib/server/route-rate-limit';

const routeLogger = createComponentLogger('api/marketplace/favorites/route');

export const dynamic = 'force-dynamic';

type PreferencesObject = Record<string, unknown>;
const FAVORITES_KEY = 'marketplaceFavorites';

function toPreferencesObject(input: unknown): PreferencesObject {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  return { ...(input as PreferencesObject) };
}

function extractFavorites(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const rateLimited = await enforceRouteRateLimit({
      req: request,
      capability: 'MARKETPLACE_FAVORITES_LIST',
      route: '/api/marketplace/favorites',
      config: MARKETPLACE_READ_RATE_LIMIT,
      identifier: user.userId,
    });
    if (rateLimited) return rateLimited;

    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: user.userId },
      select: { preferences: true },
    });

    const preferences = toPreferencesObject(prefs?.preferences);
    const favorites = extractFavorites(preferences[FAVORITES_KEY]);

    return NextResponse.json({
      favorites,
      source: 'user-preferences',
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    const message = err?.message || '';
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err?.code === 'AUTH_NOT_CONFIGURED' || message.includes('AUTH_NOT_CONFIGURED')) {
      return NextResponse.json({ error: 'AUTH_NOT_CONFIGURED' }, { status: 503 });
    }
    routeLogger.error('[marketplace/favorites] Error:', error);
    return NextResponse.json({ error: 'Failed to load favorites' }, { status: 500 });
  }
}
