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
import { prisma } from '@/lib/db';

// Lazy load AWS SDK
let S3Client: any, DeleteObjectCommand: any;

async function loadAwsSdk() {
  if (!S3Client) {
    try {
      const s3 = await import('@aws-sdk/client-s3');
      S3Client = s3.S3Client;
      DeleteObjectCommand = s3.DeleteObjectCommand;
    } catch {
      // AWS SDK not available - S3 deletion will be skipped
    }
  }
}

function getS3Client() {
  if (!S3Client) return null;
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
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const asset = await verifyAssetAccess(params.id, user.userId);
    
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
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const asset = await verifyAssetAccess(params.id, user.userId);
    
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
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const asset = await verifyAssetAccess(params.id, user.userId);
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      );
    }

    // Try to delete from S3 if SDK is available
    await loadAwsSdk();
    const s3 = getS3Client();
    
    if (s3 && asset.url) {
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: asset.url,
        }));
      } catch (s3Error) {
        console.error('S3 delete error:', s3Error);
        // Continue even if S3 delete fails - DB is source of truth
      }
    }

    // Delete from database
    await prisma.asset.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
      assetId: params.id,
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
