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
import { evaluateAssetIntakePolicy } from '@/lib/server/asset-intake-policy';
import { evaluateAssetSourcePolicy } from '@/lib/server/asset-source-policy';
import { capabilityResponse } from '@/lib/server/capability-response';

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
    const declaredSource = formData.get('source') as string | null;
    const declaredLicense = formData.get('license') as string | null;
    const forCommercialUse = String(formData.get('forCommercialUse') ?? 'true').toLowerCase() !== 'false';

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
    
    const intakeDecision = validation.quality
      ? evaluateAssetIntakePolicy({
          planId: entitlements.plan.id,
          source: entitlements.source,
          quality: validation.quality,
        })
      : null

    const sourcePolicy = evaluateAssetSourcePolicy({
      planId: entitlements.plan.id,
      entitlementSource: entitlements.source,
      source: declaredSource,
      license: declaredLicense,
      forCommercialUse,
    })

    if (!sourcePolicy.allowed) {
      return capabilityResponse({
        error: 'ASSET_SOURCE_POLICY_BLOCKED',
        message: sourcePolicy.reason || 'Asset source policy blocked this upload.',
        status: 422,
        capability: 'asset_source_policy_gate',
        capabilityStatus: 'PARTIAL',
        metadata: {
          ...sourcePolicy.metadata,
          sourcePolicy,
        },
      })
    }

    if (intakeDecision && !intakeDecision.allowed) {
      return capabilityResponse({
        error: 'ASSET_QUALITY_GATE_FAILED',
        message: intakeDecision.reason || 'Asset quality policy blocked this upload.',
        status: 422,
        capability: 'asset_intake_quality_gate',
        capabilityStatus: 'PARTIAL',
        metadata: {
          ...intakeDecision.metadata,
          quality: validation.quality || null,
          intakePolicy: intakeDecision,
        },
      })
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
        extension: extensionFromName(file.name),
        path: assetPath,
        url: `/uploads/${filename}`,
        size: finalBuffer.byteLength, // Use optimized size
        mimeType: file.type,
        status: 'ready',
        uploaderId: user.userId,
        metadata: {
          source: sourcePolicy.source,
          license: sourcePolicy.license,
          forCommercialUse,
          sourcePolicy,
          intakePolicy: intakeDecision,
          quality: validation.quality || null,
          optimization: optimizationMeta,
        },
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
        quality: validation.quality || null,
      },
      intakePolicy: intakeDecision,
      sourcePolicy,
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

function extensionFromName(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : ''
}

function detectAssetType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'texture';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('model/')) return 'model';
  return 'other';
}
