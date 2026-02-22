/**
 * Asset Duplicate API
 * POST /api/assets/[id]/duplicate - Duplicate an asset within a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { copyObject, headObject, isS3Available, S3_BUCKET } from '@/lib/storage/s3-client';
import { copyFile, mkdir, stat } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
const MAX_ASSET_ID_LENGTH = 120;
const normalizeAssetId = (value?: string) => String(value ?? '').trim();
type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

async function resolveAssetId(ctx: RouteContext) {
  const resolvedParams = await ctx.params;
  return normalizeAssetId(resolvedParams?.id);
}

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
  });
}

function parseS3Url(value: string): { bucket: string; key: string } | null {
  if (!value?.startsWith('s3://')) return null;
  const withoutScheme = value.replace('s3://', '');
  const firstSlash = withoutScheme.indexOf('/');
  if (firstSlash === -1) return null;
  const bucket = withoutScheme.slice(0, firstSlash);
  const key = withoutScheme.slice(firstSlash + 1);
  if (!bucket || !key) return null;
  return { bucket, key };
}

function buildCopyName(original: string) {
  const ext = path.extname(original);
  const base = original.slice(0, original.length - ext.length) || original;
  return `${base}_copy_${Date.now()}${ext}`;
}

function ensureLeadingSlash(value: string) {
  if (!value.startsWith('/')) return `/${value}`;
  return value;
}

async function copyLocalUpload(sourceUrl: string, baseName: string) {
  const uploadsBase = path.join(process.cwd(), 'public', 'uploads');
  const relativeDir = path.posix.dirname(sourceUrl.replace(/^\/uploads\/?/, '')).replace(/^[./]+/, '');
  const uploadsDir = relativeDir ? path.join(uploadsBase, relativeDir) : uploadsBase;
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  const sourcePath = path.join(process.cwd(), 'public', sourceUrl.replace(/^\/+/, ''));
  if (!existsSync(sourcePath)) {
    throw new Error('Source file not found');
  }

  const fileName = `${Date.now()}_${baseName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const destinationPath = path.join(uploadsDir, fileName);
  await copyFile(sourcePath, destinationPath);
  const stats = await stat(destinationPath);

  const urlPath = relativeDir ? `/uploads/${relativeDir}/${fileName}` : `/uploads/${fileName}`;
  return {
    url: urlPath,
    size: stats.size,
  };
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'assets-duplicate-post',
      key: user.userId,
      max: 40,
      windowMs: 60 * 60 * 1000,
      message: 'Too many asset duplication attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const assetId = await resolveAssetId(ctx);
    if (!assetId || assetId.length > MAX_ASSET_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_ASSET_ID', message: 'assetId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }
    const asset = await verifyAssetAccess(assetId, user.userId);

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found or access denied' }, { status: 404 });
    }

    const newName = buildCopyName(asset.name);
    const assetDir = asset.path ? path.posix.dirname(asset.path) : '/Content';
    const normalizedDir = assetDir === '.' ? '/Content' : assetDir;
    const newPath = ensureLeadingSlash(`${normalizedDir.replace(/\/$/, '')}/${newName}`);

    let newUrl = asset.url || null;
    let newSize = asset.size || 0;
    let newStoragePath = asset.storagePath || null;
    let newThumbnail = asset.thumbnail || null;

    if (asset.url?.startsWith('/uploads/')) {
      const localCopy = await copyLocalUpload(asset.url, newName);
      newSize = localCopy.size;
      newUrl = localCopy.url;
      newStoragePath = null;

      if (asset.thumbnail?.startsWith('/uploads/')) {
        const thumbName = buildCopyName(path.basename(asset.thumbnail));
        const thumbCopy = await copyLocalUpload(asset.thumbnail, thumbName);
        newThumbnail = thumbCopy.url;
      }
    } else if (asset.storagePath || asset.url?.startsWith('s3://')) {
      const s3Ok = await isS3Available();
      const parsed = asset.storagePath
        ? { bucket: S3_BUCKET, key: asset.storagePath }
        : parseS3Url(asset.url || '');
      if (!s3Ok || !parsed || parsed.bucket !== S3_BUCKET) {
        return NextResponse.json({ error: 'S3 not available for duplication' }, { status: 400 });
      }

      const destKey = `${path.posix.dirname(parsed.key)}/${Date.now()}_${newName}`;
      const copied = await copyObject(parsed.key, destKey);
      if (!copied) {
        return NextResponse.json({ error: 'Failed to copy asset in S3' }, { status: 500 });
      }

      const head = await headObject(destKey);
      newSize = head?.size || asset.size || 0;
      newUrl = `s3://${S3_BUCKET}/${destKey}`;
      newStoragePath = destKey;

      if (asset.thumbnail?.startsWith('s3://')) {
        const thumbParsed = parseS3Url(asset.thumbnail);
        if (thumbParsed?.bucket === S3_BUCKET) {
          const thumbDest = `${path.posix.dirname(thumbParsed.key)}/${Date.now()}_${path.posix.basename(thumbParsed.key)}`;
          const thumbCopied = await copyObject(thumbParsed.key, thumbDest);
          if (thumbCopied) {
            newThumbnail = `s3://${S3_BUCKET}/${thumbDest}`;
          }
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported asset storage for duplication' }, { status: 400 });
    }

    const duplicated = await prisma.asset.create({
      data: {
        projectId: asset.projectId,
        name: newName,
        type: asset.type,
        extension: asset.extension,
        path: newPath,
        url: newUrl,
        storagePath: newStoragePath,
        size: newSize,
        mimeType: asset.mimeType,
        thumbnail: newThumbnail,
        metadata: asset.metadata ?? undefined,
        tags: asset.tags,
        status: asset.status,
        isFavorite: asset.isFavorite,
        uploaderId: user.userId,
      },
    });

    return NextResponse.json({
      success: true,
      asset: duplicated,
    });
  } catch (error) {
    console.error('Duplicate asset error:', error);
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if ((error as Error).message === 'Source file not found') {
      return NextResponse.json({ error: 'Asset file not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to duplicate asset' }, { status: 500 });
  }
}
