/**
 * Asset Download API - Presigned GET URLs
 * 
 * Generates temporary download URLs for assets stored in S3/MinIO.
 * 
 * NOTE: Full S3 functionality requires:
 * - npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

// ============================================================================
// LAZY S3 CLIENT (optional dependency)
// ============================================================================

let s3ClientInstance: any = null;

async function getS3Client() {
  if (s3ClientInstance) return s3ClientInstance;
  
  try {
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3ClientInstance = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    return s3ClientInstance;
  } catch {
    return null;
  }
}

const BUCKET_NAME = process.env.S3_BUCKET || 'aethel-assets';

// ============================================================================
// GET - Generate Download URL
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);

    // Find asset with access check (using only fields that exist in current schema)
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
        url: true,
        mimeType: true,
        size: true,
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      );
    }

    // If S3 is configured, generate presigned URL
    const s3Client = await getS3Client();
    
    if (s3Client && asset.url.startsWith('s3://')) {
      try {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        
        // Extract key from s3:// URL
        const s3Key = asset.url.replace(`s3://${BUCKET_NAME}/`, '');
        
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(asset.name)}"`,
          ResponseContentType: asset.mimeType || 'application/octet-stream',
        });

        const downloadUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 3600, // 1 hour
        });

        return NextResponse.json({
          assetId: asset.id,
          fileName: asset.name,
          downloadUrl,
          size: asset.size,
          mimeType: asset.mimeType || 'application/octet-stream',
          expiresIn: 3600,
        });
      } catch (err) {
        console.error('S3 presign error:', err);
        // Fall through to direct URL
      }
    }

    // Return direct URL if not S3 or presign failed
    return NextResponse.json({
      assetId: asset.id,
      fileName: asset.name,
      downloadUrl: asset.url,
      size: asset.size,
      mimeType: asset.mimeType || 'application/octet-stream',
      direct: true,
    });
  } catch (error: any) {
    console.error('Download URL error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Batch Download (returns URLs for multiple assets)
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);

    const body = await request.json();
    const { assetIds } = body;

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: 'assetIds array is required' },
        { status: 400 }
      );
    }

    if (assetIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 assets per batch download' },
        { status: 400 }
      );
    }

    // Find all assets with access check
    const assets = await prisma.asset.findMany({
      where: {
        id: { in: assetIds },
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
        url: true,
        mimeType: true,
        size: true,
      },
    });

    const s3Client = await getS3Client();

    // Generate URLs for each asset
    const downloads = await Promise.all(
      assets.map(async (asset) => {
        // If S3 URL and client available, generate presigned URL
        if (s3Client && asset.url.startsWith('s3://')) {
          try {
            const { GetObjectCommand } = await import('@aws-sdk/client-s3');
            const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
            
            const s3Key = asset.url.replace(`s3://${BUCKET_NAME}/`, '');
            
            const command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: s3Key,
              ResponseContentDisposition: `attachment; filename="${encodeURIComponent(asset.name)}"`,
            });

            const downloadUrl = await getSignedUrl(s3Client, command, {
              expiresIn: 3600,
            });

            return {
              assetId: asset.id,
              fileName: asset.name,
              downloadUrl,
              size: asset.size,
              mimeType: asset.mimeType,
            };
          } catch {
            // Fall through to direct URL
          }
        }

        // Return direct URL
        return {
          assetId: asset.id,
          fileName: asset.name,
          downloadUrl: asset.url,
          size: asset.size,
          mimeType: asset.mimeType,
          direct: true,
        };
      })
    );

    return NextResponse.json({
      downloads,
      totalSize: downloads.reduce((sum, d) => sum + (d.size || 0), 0),
      expiresIn: 3600,
    });
  } catch (error: any) {
    console.error('Batch download error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to generate download URLs' },
      { status: 500 }
    );
  }
}
