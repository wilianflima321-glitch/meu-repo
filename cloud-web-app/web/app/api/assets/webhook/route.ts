import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/observability/logger';
import crypto from 'node:crypto';

import { queueAssetProcess } from '@/lib/queue-system';

const WEBHOOK_SECRET = process.env.ASSET_WEBHOOK_SECRET || 'local-secret';

function verifySignature(payload: string, signature: string): boolean {
  if (process.env.NODE_ENV === 'development' && signature === 'dev-bypass') return true;
  
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-aethel-signature');

    if (!signature || !verifySignature(rawBody, signature)) {
      logger.warn('api.assets.webhook.invalid_signature');
      return NextResponse.json({ error: 'Unauthorized. Invalid HMAC Signature.' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    
    // Support S3 EventBridge payload structure
    const records = payload.Records || [];
    
    for (const record of records) {
      // Depending on the exact S3 Notification format (SNS vs EventBridge)
      const storageKey = record.s3?.object?.key;
      const eventName = record.eventName;

      if (!storageKey || !eventName?.includes('ObjectCreated')) continue;

      // Find the asset by storageKey
      const asset = await prisma.asset.findFirst({
        where: { storagePath: storageKey, status: 'pending' }
      });

      if (!asset) {
        logger.warn('api.assets.webhook.asset_not_found', { storageKey });
        continue;
      }

      // Mark as processing
      await prisma.asset.update({
        where: { id: asset.id },
        data: { status: 'processing' }
      });

      logger.info('api.assets.webhook.processing_started', { assetId: asset.id });

      // Dispatch to Redis Worker
      const queued = await queueAssetProcess({
        assetId: asset.id,
        storageKey,
        userId: asset.uploaderId || undefined,
        operation: 'optimize',
      });
      if (!queued) {
        logger.warn('api.assets.webhook.queue_unavailable', { assetId: asset.id });
      } else {
        logger.info('api.assets.webhook.queued', { assetId: asset.id, jobId: queued.id });
      }
    }

    return NextResponse.json({ success: true, processed: records.length });
    
  } catch (error) {
    logger.error('api.assets.webhook.fatal', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
