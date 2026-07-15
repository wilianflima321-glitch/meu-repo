import { NextRequest, NextResponse } from 'next/server';
import { enforceQuota, addRateLimitHeaders } from '@/lib/server/quota-middleware';
import { createUploadUrl } from '@/lib/storage/s3-client';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-server';
import { logger } from '@/lib/observability/logger';
import { z } from 'zod';

const UploadRequestSchema = z.object({
  projectId: z.string(),
  assetType: z.enum(['mesh', 'texture', 'material', 'audio', 'video', 'blueprint', 'other']),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().positive(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Quota & Auth Check
    const quotaCheck = await enforceQuota(req, 'storage_write');
    if (!quotaCheck.allowed) {
      return quotaCheck.response; // Returns 429 Rate Limited with Headers
    }

    const user = getUserFromRequest(req);
    
    // 2. Body Validation
    const body = await req.json();
    const result = UploadRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload', details: result.error.issues }, { status: 400 });
    }
    
    const { projectId, assetType, fileName, mimeType, sizeBytes } = result.data;

    // 3. Project Access Verification
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user!.userId } }
    });
    
    if (!membership) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // 4. Generate Presigned URL
    const { uploadUrl, storageKey, assetId } = await createUploadUrl(
      projectId,
      assetType,
      fileName,
      mimeType,
      300 // 5 minutes expiration
    );

    // 5. Register Pending Asset in Database
    await prisma.asset.create({
      data: {
        id: assetId,
        projectId,
        name: fileName,
        type: assetType,
        path: `/Content/Uploads/${fileName}`,
        storagePath: storageKey,
        mimeType,
        size: sizeBytes,
        status: 'pending', // Waiting for S3 Webhook
        uploaderId: user!.userId,
      }
    });

    logger.info('api.assets.upload_url_generated', {
      assetId,
      projectId,
      userId: user!.userId,
      sizeBytes,
    });

    // 6. Return response with rate limit headers
    let response = NextResponse.json({
      success: true,
      uploadUrl,
      assetId,
      storageKey,
      expiresIn: 300
    });
    
    return addRateLimitHeaders(response, quotaCheck.quota);
    
  } catch (error) {
    logger.error('api.assets.upload_url.fatal', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
