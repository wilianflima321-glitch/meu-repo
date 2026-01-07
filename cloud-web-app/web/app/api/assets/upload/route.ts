/**
 * Assets Upload API
 * POST /api/assets/upload - Upload asset files
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
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
    const validation = AssetProcessor.validate(file);
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
    // Assuming processImage returns a Buffer. For non-images it might just filter through
    let finalBuffer: Buffer;
    
    if (file.type.startsWith('image/')) {
       finalBuffer = await AssetProcessor.processImage(rawBuffer, file.type);
    } else {
       finalBuffer = Buffer.from(rawBuffer);
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Save processed file
    await writeFile(filepath, new Uint8Array(finalBuffer));

    // Create asset record
    const asset = await prisma.asset.create({
      data: {
        projectId,
        name: file.name,
        type: assetType || detectAssetType(file.type),
        url: `/uploads/${filename}`,
        size: finalBuffer.byteLength, // Use optimized size
        mimeType: file.type,
      },
    });

    return NextResponse.json({
      success: true,
      asset,
      message: 'File uploaded and optimized successfully',
      optimization: {
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
