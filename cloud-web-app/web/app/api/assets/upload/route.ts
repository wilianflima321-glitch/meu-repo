/**
 * Assets Upload API
 * POST /api/assets/upload - Upload asset files
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { AssetProcessor } from '@/lib/server/asset-processor';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'assets-upload-post',
      key: user.userId,
      max: 90,
      windowMs: 60 * 60 * 1000,
      message: 'Too many asset uploads. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const entitlements = await requireEntitlementsForUser(user.userId);
    const formData = await req.formData();

    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const assetType = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // 1. Validation Logic (AssetProcessor)
    const validation = await AssetProcessor.validate(file);
    if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    // 2. Storage Enforcements
    if (entitlements.plan.limits.storage !== -1) {
      const agg = await prisma.asset.aggregate({
        _sum: { size: true },
        where: {
          project: { userId: user.userId },
        },
      });
      const current = agg._sum.size || 0;
      if (current + file.size > entitlements.plan.limits.storage) {
        return NextResponse.json(
          {
            error: 'STORAGE_LIMIT_REACHED',
            message: 'Limite de storage do plano atingido. Faça upgrade para enviar mais assets.',
            plan: entitlements.plan.id,
          },
          { status: 402 }
        );
      }
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // 3. Asset Processing (Compression/Optimization)
    const rawBuffer = await file.arrayBuffer();
    let finalBuffer: Buffer;
    let optimizationMeta: {
      enabled: boolean;
      processor: string;
      reason: string | null;
    } = {
      enabled: false,
      processor: 'none',
      reason: null,
    };
    
    if (validation.assetClass === 'image') {
       const processed = await AssetProcessor.processImage(rawBuffer, file.type);
       finalBuffer = processed.buffer;
       optimizationMeta = {
        enabled: processed.optimized,
        processor: processed.processor,
        reason: processed.reason || null,
       };
    } else {
       finalBuffer = Buffer.from(rawBuffer);
       optimizationMeta = {
        enabled: false,
        processor: 'none',
        reason: validation.assetClass === 'model'
          ? 'MODEL_OPTIMIZATION_PIPELINE_NOT_CONFIGURED'
          : validation.assetClass === 'audio' || validation.assetClass === 'video'
            ? 'MEDIA_OPTIMIZATION_PIPELINE_NOT_CONFIGURED'
            : 'NON_IMAGE_ASSET',
       };
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Save processed file
    await writeFile(filepath, new Uint8Array(finalBuffer));

    // Create asset record
    const rawPath = (formData.get('path') as string) || '/Content';
    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const assetPath = `${normalizedPath.replace(/\/$/, '')}/${file.name}`;

    const asset = await prisma.asset.create({
      data: {
        projectId,
        name: file.name,
        type: assetType || detectAssetType(file.type),
        path: assetPath,
        url: `/uploads/${filename}`,
        size: finalBuffer.byteLength, // Use optimized size
        mimeType: file.type,
      },
    });

    return NextResponse.json({
      success: true,
      asset,
      capabilityStatus: optimizationMeta.enabled ? 'IMPLEMENTED' : (validation.capabilityStatus || 'PARTIAL'),
      message: optimizationMeta.enabled
        ? 'File uploaded and optimized successfully'
        : 'File uploaded successfully (optimization unavailable for current backend)',
      validation: {
        assetClass: validation.assetClass,
        warnings: validation.warnings || [],
      },
      optimization: {
          enabled: optimizationMeta.enabled,
          processor: optimizationMeta.processor,
          reason: optimizationMeta.reason,
          original: file.size,
          optimized: finalBuffer.byteLength,
          ratio: (finalBuffer.byteLength / file.size).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError('Failed to upload file');
  }
}

function detectAssetType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'texture';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('model/')) return 'model';
  return 'other';
}
