/**
 * Marketplace Cart API
 *
 * Persists cart in UserPreferences.preferences.marketplaceCart.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

type CartItem = {
  assetId: string;
  addedAt: string;
};

type PreferencesObject = Record<string, unknown>;

const CART_KEY = 'marketplaceCart';

function toPreferencesObject(input: unknown): PreferencesObject {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  return { ...(input as PreferencesObject) };
}

function parseCart(input: unknown): CartItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const assetId = typeof (item as any).assetId === 'string' ? (item as any).assetId.trim() : '';
      const addedAt =
        typeof (item as any).addedAt === 'string' && (item as any).addedAt.trim()
          ? (item as any).addedAt
          : new Date().toISOString();
      if (!assetId) return null;
      return { assetId, addedAt };
    })
    .filter((item): item is CartItem => !!item);
}

async function readPreferences(userId: string): Promise<PreferencesObject> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { preferences: true },
  });
  return toPreferencesObject(prefs?.preferences);
}

async function writePreferences(userId: string, preferences: PreferencesObject) {
  await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      preferences: preferences as any,
    },
    update: {
      preferences: preferences as any,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'marketplace-cart-get',
      key: user.userId,
      max: 600,
      windowMs: 60 * 60 * 1000,
      message: 'Too many cart read requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const preferences = await readPreferences(user.userId);
    const items = parseCart(preferences[CART_KEY]);

    return NextResponse.json({
      items,
      count: items.length,
      source: 'user-preferences',
    });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('[marketplace/cart:GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load cart' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'marketplace-cart-post',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many cart add requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json().catch(() => ({}));
    const assetId = typeof body?.assetId === 'string' ? body.assetId.trim() : '';

    if (!assetId) {
      return NextResponse.json(
        { error: 'ASSET_ID_REQUIRED', message: 'assetId is required' },
        { status: 400 }
      );
    }

    const assetExists = await prisma.marketplaceItem.findUnique({
      where: { id: assetId },
      select: { id: true },
    });
    if (!assetExists) {
      return NextResponse.json(
        { error: 'ASSET_NOT_FOUND', message: 'Marketplace asset not found' },
        { status: 404 }
      );
    }

    const preferences = await readPreferences(user.userId);
    const current = parseCart(preferences[CART_KEY]);

    if (current.some((item) => item.assetId === assetId)) {
      return NextResponse.json(
        { error: 'ASSET_ALREADY_IN_CART', message: 'Asset already in cart' },
        { status: 409 }
      );
    }

    const next = [{ assetId, addedAt: new Date().toISOString() }, ...current];
    const updated = {
      ...preferences,
      [CART_KEY]: next,
    };
    await writePreferences(user.userId, updated);

    return NextResponse.json({
      success: true,
      message: 'Asset added to cart',
      count: next.length,
    });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('[marketplace/cart:POST] Error:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'marketplace-cart-delete',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many cart remove requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId')?.trim() || '';

    const preferences = await readPreferences(user.userId);
    const current = parseCart(preferences[CART_KEY]);
    const next = assetId ? current.filter((item) => item.assetId !== assetId) : [];

    const updated = {
      ...preferences,
      [CART_KEY]: next,
    };
    await writePreferences(user.userId, updated);

    return NextResponse.json({
      success: true,
      message: assetId ? 'Cart item removed' : 'Cart cleared',
      count: next.length,
    });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('[marketplace/cart:DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}
