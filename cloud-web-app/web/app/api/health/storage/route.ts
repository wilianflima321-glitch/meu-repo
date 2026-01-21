import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/storage
 * 
 * Verifica saúde do S3/Storage
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const s3Bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;
    const s3Endpoint = process.env.S3_ENDPOINT || process.env.AWS_S3_ENDPOINT;
    
    if (!s3Bucket) {
      return NextResponse.json({
        status: 'unknown',
        latency: 0,
        storage: {
          configured: false,
          message: 'S3/Storage não configurado',
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
        type: s3Endpoint ? 'S3-compatible' : 'AWS S3',
        bucket: s3Bucket,
        endpoint: s3Endpoint || 'aws',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('[health/storage] Error:', error);
    
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
