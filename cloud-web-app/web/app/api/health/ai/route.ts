import { NextRequest, NextResponse } from 'next/server';
import {
  getAvailableModelsForProvider,
  getPreferredConfiguredAiProvider,
  isAnyAiProviderConfigured,
} from '@/lib/ai-provider-config'

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/ai
 * 
 * Verifica saúde do backend de IA
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const provider = getPreferredConfiguredAiProvider()

    if (!isAnyAiProviderConfigured()) {
      return NextResponse.json({
        status: 'unknown',
        latency: 0,
        ai: {
          configured: false,
          message: 'Backend de IA não configurado',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const latency = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      latency,
      ai: {
        configured: true,
        provider,
        models: getAvailableModelsForProvider(provider),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('[health/ai] Error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        latency,
        ai: {
          connected: false,
          error: (error as Error).message,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
