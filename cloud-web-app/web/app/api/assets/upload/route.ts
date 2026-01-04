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

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'model/gltf-binary',
  'model/gltf+json',
  'application/json',
  'text/plain',
];

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
		const entitlements = await requireEntitlementsForUser(user.userId);
    const formData = await req.formData();

    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const assetType = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Enforce storage limit (sum of asset sizes across user's projects)
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

    // Create upload directory if it doesn't exist
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Save file
    const bytes = await file.arrayBuffer();
		await writeFile(filepath, new Uint8Array(bytes));

    // Create asset record
    const asset = await prisma.asset.create({
      data: {
        projectId,
        name: file.name,
        type: assetType || detectAssetType(file.type),
        url: `/uploads/${filename}`,
        size: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json({
      success: true,
      asset,
      message: 'File uploaded successfully',
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
