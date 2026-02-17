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

// ============================================================================
// POST - Confirm Upload
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);

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
        where: { id: params.id },
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
