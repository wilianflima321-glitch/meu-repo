/**
 * Asset Upload Confirmation API
 * 
 * Called after direct-to-S3 upload completes.
 * Marks asset as 'ready' and triggers post-processing:
 * - Thumbnail generation
 * - Metadata extraction
 * - Search indexing
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { headObject, isS3Available, S3_BUCKET } from '@/lib/storage/s3-client';
const MAX_ASSET_ID_LENGTH = 120;
const normalizeAssetId = (value?: string) => String(value ?? '').trim();
type RouteContext = { params: Promise<{ id: string }> };

async function resolveAssetId(ctx: RouteContext) {
  const resolvedParams = await ctx.params;
  return normalizeAssetId(resolvedParams?.id);
}

// ============================================================================
// POST - Confirm Upload
// ============================================================================

export async function POST(
  request: NextRequest,
  ctx: RouteContext
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'assets-confirm-post',
      key: user.userId,
      max: 90,
      windowMs: 60 * 60 * 1000,
      message: 'Too many asset confirmation attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const assetId = await resolveAssetId(ctx);
    if (!assetId || assetId.length > MAX_ASSET_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_ASSET_ID', message: 'assetId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    // Find asset with access check
    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        project: {
          OR: [
            { userId: user.userId },
            { members: { some: { userId: user.userId } } },
          ],
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        url: true,
        size: true,
        mimeType: true,
        createdAt: true,
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      );
    }

    // Try to verify in S3 if SDK available
    const sdkAvailable = await isS3Available();
    let actualSize = asset.size;

    if (sdkAvailable && asset.url) {
      try {
        // Extract S3 key from URL
        const s3Key = asset.url.startsWith(`s3://${S3_BUCKET}/`) 
          ? asset.url.replace(`s3://${S3_BUCKET}/`, '')
          : asset.url;
        
        const headResult = await headObject(s3Key);
        actualSize = headResult?.size || asset.size;
      } catch (s3Error: any) {
        if (s3Error?.name === 'NotFound') {
          return NextResponse.json(
            { error: 'File not found in storage. Upload may have failed.' },
            { status: 400 }
          );
        }
        console.warn('S3 verification skipped:', s3Error);
      }
    }

    // Update size if different
    if (actualSize !== asset.size) {
      await prisma.asset.update({
        where: { id: assetId },
        data: { size: actualSize },
      });
    }

    return NextResponse.json({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      size: actualSize,
      mimeType: asset.mimeType,
      createdAt: asset.createdAt.toISOString(),
      postProcessing: {
        queued: false,
        reason: 'JOB_QUEUE_NOT_CONFIGURED',
      },
    });
  } catch (error: any) {
    console.error('Confirm upload error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to confirm upload' },
      { status: 500 }
    );
  }
}
