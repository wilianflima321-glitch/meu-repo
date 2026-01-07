/**
 * Presigned URL API - S3 Direct Upload
 * 
 * Generates presigned URLs for direct-to-S3 uploads, bypassing our server
 * for large files (multi-GB game assets). Supports both AWS S3 and MinIO.
 * 
 * Flow:
 * 1. Client requests presigned URL with file metadata
 * 2. Server validates and generates presigned POST URL
 * 3. Client uploads directly to S3/MinIO
 * 4. Client calls /api/assets/[id]/confirm to finalize
 * 
 * DEPENDENCIES REQUIRED:
 * npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/s3-presigned-post
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';
import { checkStorageQuota, createQuotaExceededResponse } from '@/lib/storage-quota';

// Lazy import AWS SDK to allow build without it
let S3Client: any, PutObjectCommand: any, getSignedUrl: any, createPresignedPost: any;

async function loadAwsSdk() {
  if (!S3Client) {
    try {
      const s3 = await import('@aws-sdk/client-s3');
      const presigner = await import('@aws-sdk/s3-request-presigner');
      const presignedPost = await import('@aws-sdk/s3-presigned-post');
      S3Client = s3.S3Client;
      PutObjectCommand = s3.PutObjectCommand;
      getSignedUrl = presigner.getSignedUrl;
      createPresignedPost = presignedPost.createPresignedPost;
    } catch {
      throw new Error('AWS SDK not installed. Run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/s3-presigned-post');
    }
  }
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
// FILE SIZE LIMITS
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB - AAA game assets
const MIN_FILE_SIZE = 1; // 1 byte minimum

// ============================================================================
// ALLOWED MIME TYPES - Game Engine Assets
// ============================================================================

const ALLOWED_MIME_TYPES = new Set([
  // 3D Models
  'model/gltf-binary',
  'model/gltf+json',
  'application/octet-stream', // .fbx, .blend
  
  // Textures
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/tga',
  'image/x-tga',
  'image/vnd.radiance', // HDR
  'image/x-exr', // OpenEXR
  
  // Audio
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/ogg',
  'audio/flac',
  
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
  
  // Scripts & Data
  'application/json',
  'text/plain',
  'application/javascript',
  'text/typescript',
  
  // Archives (for asset packs)
  'application/zip',
  'application/x-7z-compressed',
]);

// ============================================================================
// EXTENSION TO ASSET TYPE MAPPING
// ============================================================================

function getAssetType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const typeMap: Record<string, string> = {
    // 3D Models
    'fbx': 'mesh', 'obj': 'mesh', 'gltf': 'mesh', 'glb': 'mesh', 'blend': 'mesh',
    'dae': 'mesh', '3ds': 'mesh', 'stl': 'mesh', 'ply': 'mesh',
    
    // Textures
    'png': 'texture', 'jpg': 'texture', 'jpeg': 'texture', 'tga': 'texture',
    'webp': 'texture', 'hdr': 'texture', 'exr': 'texture', 'psd': 'texture',
    
    // Audio
    'wav': 'audio', 'mp3': 'audio', 'ogg': 'audio', 'flac': 'audio', 'aac': 'audio',
    
    // Video
    'mp4': 'video', 'webm': 'video', 'mov': 'video', 'avi': 'video',
    
    // Scripts
    'ts': 'script', 'js': 'script', 'lua': 'script',
    
    // Materials
    'material': 'material', 'mat': 'material',
    
    // Blueprints
    'blueprint': 'blueprint', 'bp': 'blueprint',
    
    // Animations
    'anim': 'animation',
    
    // Prefabs
    'prefab': 'prefab',
    
    // Levels
    'level': 'level', 'scene': 'level',
  };
  
  return typeMap[ext] || 'other';
}

// ============================================================================
// POST - Generate Presigned URL
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await loadAwsSdk();
    
    // 1. Authenticate
    const user = requireAuth(request);

    // 2. Parse request
    const body = await request.json();
    const { projectId, fileName, fileType, fileSize, path = '/Content' } = body;

    // 3. Validate required fields
    if (!projectId || !fileName || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, fileName, fileSize' },
        { status: 400 }
      );
    }

    // 4. Validate file size
    if (fileSize < MIN_FILE_SIZE || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be between 1 byte and 10GB. Got: ${fileSize}` },
        { status: 400 }
      );
    }

    // 5. Validate MIME type (if provided)
    if (fileType && !ALLOWED_MIME_TYPES.has(fileType)) {
      // Allow unknown types but log
      console.warn(`Unknown MIME type: ${fileType} for file: ${fileName}`);
    }

    // 6. Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: user.userId },
          { members: { some: { userId: user.userId } } },
        ],
      },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // 7. CIRCUIT BREAKER: Check storage quota before allowing upload
    const quotaCheck = await checkStorageQuota({
      userId: user.userId,
      projectId,
      additionalBytes: fileSize,
    });

    if (!quotaCheck.allowed) {
      return NextResponse.json(createQuotaExceededResponse(quotaCheck), { status: 402 });
    }

    // 8. Generate unique asset ID and S3 key
    const assetId = randomUUID();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `projects/${projectId}${path}/${assetId}/${sanitizedFileName}`;

    // 8. Create pending asset record in database
    const assetType = getAssetType(fileName);

    await prisma.asset.create({
      data: {
        id: assetId,
        projectId,
        name: fileName,
        type: assetType,
        url: s3Key, // Store S3 key in url field for now
        size: fileSize,
        mimeType: fileType || 'application/octet-stream',
      },
    });

    // 9. Generate presigned POST URL
    const expiresIn = 3600; // 1 hour
    const s3 = getS3Client();

    // Use presigned POST for browser compatibility
    const presignedPost = await createPresignedPost(s3, {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Conditions: [
        ['content-length-range', MIN_FILE_SIZE, MAX_FILE_SIZE],
        { 'Content-Type': fileType || 'application/octet-stream' },
      ],
      Fields: {
        'Content-Type': fileType || 'application/octet-stream',
      },
      Expires: expiresIn,
    });

    // 10. Return presigned data
    return NextResponse.json({
      assetId,
      uploadUrl: presignedPost.url,
      fields: presignedPost.fields,
      key: s3Key,
      expiresIn,
      maxSize: MAX_FILE_SIZE,
    });
  } catch (error: any) {
    console.error('Presign error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Get presigned download URL
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await loadAwsSdk();
    const user = requireAuth(request);

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');

    if (!assetId) {
      return NextResponse.json(
        { error: 'Missing assetId parameter' },
        { status: 400 }
      );
    }

    // Get asset and verify access
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
      select: { url: true, name: true },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      );
    }

    // Generate presigned GET URL
    const s3 = getS3Client();
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: asset.url,
    });

    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return NextResponse.json({
      downloadUrl,
      fileName: asset.name,
      expiresIn: 3600,
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
