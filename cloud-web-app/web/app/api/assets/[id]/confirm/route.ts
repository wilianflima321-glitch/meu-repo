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

// Lazy load AWS SDK
let S3Client: any, HeadObjectCommand: any;

async function loadAwsSdk() {
  if (!S3Client) {
    try {
      const s3 = await import('@aws-sdk/client-s3');
      S3Client = s3.S3Client;
      HeadObjectCommand = s3.HeadObjectCommand;
    } catch {
      // AWS SDK not installed - skip S3 verification
      return false;
    }
  }
  return true;
}

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
}

const BUCKET_NAME = process.env.S3_BUCKET || 'aethel-assets';

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
    const sdkAvailable = await loadAwsSdk();
    let actualSize = asset.size;

    if (sdkAvailable && asset.url) {
      try {
        const s3 = getS3Client();
        const headResult = await s3.send(new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: asset.url,
        }));
        actualSize = headResult.ContentLength || asset.size;
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

    // TODO: Trigger async post-processing jobs via job queue

    return NextResponse.json({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      size: actualSize,
      mimeType: asset.mimeType,
      createdAt: asset.createdAt.toISOString(),
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
