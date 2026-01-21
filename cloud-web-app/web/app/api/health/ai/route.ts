import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/ai
 * 
 * Verifica saúde do backend de IA
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const aiApiUrl = process.env.AI_API_URL || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!aiApiUrl) {
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

    // Determinar provider
    let provider = 'unknown';
    if (process.env.OPENAI_API_KEY) provider = 'openai';
    if (process.env.ANTHROPIC_API_KEY) provider = 'anthropic';
    if (process.env.AI_API_URL) provider = 'custom';

    const latency = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      latency,
      ai: {
        configured: true,
        provider,
        models: getAvailableModels(provider),
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

function getAvailableModels(provider: string): string[] {
  switch (provider) {
    case 'openai':
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
    case 'anthropic':
      return ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'];
    default:
      return [];
  }
}
