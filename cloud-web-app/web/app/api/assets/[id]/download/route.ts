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
import { generateDownloadUrl, isS3Available, S3_BUCKET } from '@/lib/storage/s3-client';

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
        storagePath: true,
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

    if (!asset.url && !asset.storagePath) {
      return NextResponse.json(
        { error: 'Asset URL missing' },
        { status: 404 }
      );
    }

    // If S3 is configured, generate presigned URL
    const s3Available = await isS3Available();
    
    if (s3Available && (asset.storagePath || asset.url?.startsWith('s3://'))) {
      try {
        const s3Key = asset.storagePath
          ? asset.storagePath
          : asset.url!.replace(`s3://${S3_BUCKET}/`, '');
        
        const downloadUrl = await generateDownloadUrl(s3Key, {
          expiresIn: 3600,
          fileName: asset.name,
          contentType: asset.mimeType || 'application/octet-stream',
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
        storagePath: true,
        mimeType: true,
        size: true,
      },
    });

    const s3Available = await isS3Available();

    // Generate URLs for each asset
    const downloads = await Promise.all(
      assets.map(async (asset) => {
        if (!asset.url && !asset.storagePath) {
          return {
            assetId: asset.id,
            fileName: asset.name,
            error: 'Asset URL missing',
          };
        }

        // If S3 URL and client available, generate presigned URL
        if (s3Available && (asset.storagePath || asset.url?.startsWith('s3://'))) {
          try {
            const s3Key = asset.storagePath
              ? asset.storagePath
              : asset.url!.replace(`s3://${S3_BUCKET}/`, '');
            
            const downloadUrl = await generateDownloadUrl(s3Key, {
              expiresIn: 3600,
              fileName: asset.name,
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
