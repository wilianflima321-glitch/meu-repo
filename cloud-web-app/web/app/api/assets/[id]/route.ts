/**
 * Asset CRUD API - Single Asset Operations
 * 
 * Handles individual asset operations:
 * - GET: Fetch asset details with metadata
 * - PATCH: Update asset name, metadata
 * - DELETE: Remove asset from project and storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { deleteObject, isS3Available, S3_BUCKET } from '@/lib/storage/s3-client';
const MAX_ASSET_ID_LENGTH = 120;
const normalizeAssetId = (value?: string) => String(value ?? '').trim();
type RouteContext = { params: Promise<{ id: string }> };

async function resolveAssetId(ctx: RouteContext) {
  const resolvedParams = await ctx.params;
  return normalizeAssetId(resolvedParams?.id);
}

// ============================================================================
// HELPER - Verify Asset Access
// ============================================================================

async function verifyAssetAccess(assetId: string, userId: string) {
  return prisma.asset.findFirst({
    where: {
      id: assetId,
      project: {
        OR: [
          { userId },
          { members: { some: { userId } } },
        ],
      },
    },
    include: {
      project: {
        select: { id: true, userId: true },
      },
    },
  });
}

// ============================================================================
// GET - Fetch Asset Details
// ============================================================================

export async function GET(
  request: NextRequest,
  ctx: RouteContext
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'assets-detail-get',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many asset detail requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const assetId = await resolveAssetId(ctx);
    if (!assetId || assetId.length > MAX_ASSET_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_ASSET_ID', message: 'assetId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }
    const asset = await verifyAssetAccess(assetId, user.userId);
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      );
    }

    // Format response
    return NextResponse.json({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      url: asset.url,
      size: asset.size,
      mimeType: asset.mimeType,
      createdAt: asset.createdAt.toISOString(),
      projectId: asset.projectId,
    });
  } catch (error: any) {
    console.error('Get asset error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update Asset
// ============================================================================

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'assets-detail-patch',
      key: user.userId,
      max: 90,
      windowMs: 60 * 60 * 1000,
      message: 'Too many asset update attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const assetId = await resolveAssetId(ctx);
    if (!assetId || assetId.length > MAX_ASSET_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_ASSET_ID', message: 'assetId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }
    const asset = await verifyAssetAccess(assetId, user.userId);
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      // Validate name
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid name' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    // Perform update
    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: updateData,
    });

    return NextResponse.json({
      id: updatedAsset.id,
      name: updatedAsset.name,
    });
  } catch (error: any) {
    console.error('Update asset error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Remove Asset
// ============================================================================

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'assets-detail-delete',
      key: user.userId,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many asset delete attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const assetId = await resolveAssetId(ctx);
    if (!assetId || assetId.length > MAX_ASSET_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_ASSET_ID', message: 'assetId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }
    const asset = await verifyAssetAccess(assetId, user.userId);
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      );
    }

    // Try to delete from S3 if SDK is available
    const s3Available = await isS3Available();
    
    if (s3Available && asset.url) {
      try {
        // Extract S3 key from URL if needed
        const s3Key = asset.url.startsWith(`s3://${S3_BUCKET}/`) 
          ? asset.url.replace(`s3://${S3_BUCKET}/`, '')
          : asset.url;
        await deleteObject(s3Key);
      } catch (s3Error) {
        console.error('S3 delete error:', s3Error);
        // Continue even if S3 delete fails - DB is source of truth
      }
    }

    // Delete from database
    await prisma.asset.delete({
      where: { id: assetId },
    });

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
      assetId: assetId,
    });
  } catch (error: any) {
    console.error('Delete asset error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
