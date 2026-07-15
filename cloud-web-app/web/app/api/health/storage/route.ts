import { NextRequest, NextResponse } from 'next/server';
import { createComponentLogger } from '@/lib/observability/logger';
import { isS3Available, S3_BUCKET, STORAGE_BACKEND, IS_R2_BACKEND } from '@/lib/storage/s3-client';

const routeLogger = createComponentLogger('api/health/storage/route');

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/storage
 * 
 * Verifica saúde do storage (Cloudflare R2 em produção — ver
 * lib/storage/s3-client.ts para a ordem de resolução do backend).
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const configured = await isS3Available();

    if (!configured) {
      return NextResponse.json({
        status: 'unknown',
        latency: Date.now() - startTime,
        storage: {
          configured: false,
          type: 'local-emulator',
          message: 'No object storage credentials configured (R2_*/S3_*/AWS_*) — using local filesystem emulator',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const latency = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      latency,
      storage: {
        configured: true,
        type: STORAGE_BACKEND,
        bucket: S3_BUCKET,
        zeroEgress: IS_R2_BACKEND,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    routeLogger.error('[health/storage] Error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        latency,
        storage: {
          connected: false,
          error: (error as Error).message,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
