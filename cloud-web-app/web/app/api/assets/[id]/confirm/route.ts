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
import { prisma } from '@/lib/db';
import { headObject, isS3Available, S3_BUCKET } from '@/lib/storage/s3-client';
import { buildAssetQualityReport, inferAssetClassFromNameAndMime } from '@/lib/server/asset-quality';
import { evaluateAssetIntakePolicy } from '@/lib/server/asset-intake-policy';
import { requireEntitlementsForUser } from '@/lib/entitlements';

// ============================================================================
// POST - Confirm Upload
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const entitlements = await requireEntitlementsForUser(user.userId);

    // Find asset with access check
    const asset = await prisma.asset.findFirst({
      where: {
        id: params.id,
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
        status: true,
        metadata: true,
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

    const inferredAssetClass = inferAssetClassFromNameAndMime(asset.name, asset.mimeType)
    const quality = buildAssetQualityReport({
      name: asset.name,
      sizeBytes: actualSize,
      mimeType: asset.mimeType,
      assetClass: inferredAssetClass,
      warnings: ['POST_PROCESSING_PIPELINE_PARTIAL'],
    })
    const intakePolicy = evaluateAssetIntakePolicy({
      planId: entitlements.plan.id,
      source: entitlements.source,
      quality,
    })

    const existingMeta = (asset.metadata && typeof asset.metadata === 'object') ? asset.metadata as Record<string, unknown> : {}
    const updatedAsset = await prisma.asset.update({
      where: { id: params.id },
      data: {
        size: actualSize,
        status: 'ready',
        metadata: {
          ...existingMeta,
          quality,
          intakePolicy,
          uploadStage: 'confirmed',
          postProcessing: {
            queued: false,
            capabilityStatus: 'PARTIAL',
            reason: 'JOB_QUEUE_NOT_CONFIGURED',
            pendingSteps: [
              'thumbnail_generation',
              'metadata_enrichment',
              'search_indexing',
            ],
          },
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        mimeType: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      id: updatedAsset.id,
      name: updatedAsset.name,
      type: updatedAsset.type,
      size: updatedAsset.size,
      mimeType: updatedAsset.mimeType,
      status: updatedAsset.status,
      createdAt: updatedAsset.createdAt.toISOString(),
      quality,
      intakePolicy,
      postProcessing: {
        queued: false,
        capabilityStatus: 'PARTIAL',
        reason: 'JOB_QUEUE_NOT_CONFIGURED',
        pendingSteps: [
          'thumbnail_generation',
          'metadata_enrichment',
          'search_indexing',
        ],
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
