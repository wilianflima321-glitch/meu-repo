/**
 * Marketplace Favorite Asset API
 *
 * Persists per-user favorites in UserPreferences.preferences.marketplaceFavorites.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';
type RouteContext = { params: Promise<{ assetId: string }> };

const MAX_ASSET_ID_LENGTH = 120;
const normalizeAssetId = (value?: string) => String(value ?? '').trim();

const FAVORITES_KEY = 'marketplaceFavorites';
type PreferencesObject = Record<string, unknown>;

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

function withFavorite(
  existingPreferences: unknown,
  assetId: string,
  mode: 'add' | 'remove'
): PreferencesObject {
  const preferences = toPreferencesObject(existingPreferences);
  const favorites = new Set(extractFavorites(preferences[FAVORITES_KEY]));

  if (mode === 'add') {
    favorites.add(assetId);
  } else {
    favorites.delete(assetId);
  }

  return {
    ...preferences,
    [FAVORITES_KEY]: Array.from(favorites),
  };
}

async function updateFavorites(
  userId: string,
  assetId: string,
  mode: 'add' | 'remove'
): Promise<string[]> {
  const current = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { preferences: true },
  });

  const nextPreferences = withFavorite(current?.preferences, assetId, mode);
  const row = await prisma.userPreferences.upsert({
    where: { userId },
    update: { preferences: nextPreferences as Prisma.InputJsonValue },
    create: {
      userId,
      preferences: nextPreferences as Prisma.InputJsonValue,
    },
    select: { preferences: true },
  });

  return extractFavorites(toPreferencesObject(row.preferences)[FAVORITES_KEY]);
}

async function handleMutation(
  userId: string,
  assetId: string,
  mode: 'add' | 'remove'
) {
  try {
    if (!assetId || assetId.length > MAX_ASSET_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_ASSET_ID', message: 'assetId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const favorites = await updateFavorites(userId, assetId, mode);
    return NextResponse.json({
      success: true,
      favorites,
      source: 'user-preferences',
      action: mode === 'add' ? 'added' : 'removed',
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
    console.error('[marketplace/favorites/:assetId] Error:', error);
    return NextResponse.json({ error: 'Failed to update favorite' }, { status: 500 });
  }
}

async function resolveAssetId(ctx: RouteContext): Promise<string> {
  const resolvedParams = await ctx.params;
  return normalizeAssetId(resolvedParams?.assetId);
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'marketplace-favorite-asset-post',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many favorite mutation requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const assetId = await resolveAssetId(ctx);
    return handleMutation(user.userId, assetId, 'add');
  } catch (error) {
    const err = error as Error & { code?: string };
    const message = err?.message || '';
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err?.code === 'AUTH_NOT_CONFIGURED' || message.includes('AUTH_NOT_CONFIGURED')) {
      return NextResponse.json({ error: 'AUTH_NOT_CONFIGURED' }, { status: 503 });
    }
    console.error('[marketplace/favorites/:assetId] POST error:', error);
    return NextResponse.json({ error: 'Failed to update favorite' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'marketplace-favorite-asset-delete',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many favorite mutation requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const assetId = await resolveAssetId(ctx);
    return handleMutation(user.userId, assetId, 'remove');
  } catch (error) {
    const err = error as Error & { code?: string };
    const message = err?.message || '';
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err?.code === 'AUTH_NOT_CONFIGURED' || message.includes('AUTH_NOT_CONFIGURED')) {
      return NextResponse.json({ error: 'AUTH_NOT_CONFIGURED' }, { status: 503 });
    }
    console.error('[marketplace/favorites/:assetId] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to update favorite' }, { status: 500 });
  }
}
