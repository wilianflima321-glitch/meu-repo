/**
 * AI 3D Model Generation API
 * 
 * Unified endpoint for 3D generation using multiple providers:
 * - Meshy (text-to-3D, image-to-3D)
 * - Tripo3D (fast generation)
 * - OpenAI Shap-E (experimental)
 * 
 * Used for:
 * - Game assets (characters, props, environments)
 * - Film assets
 * - Prototyping
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthUser } from '@/lib/auth-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { capabilityResponse } from '@/lib/server/capability-response';

// Rate limit: 20 3D generations per hour (expensive)
const RATE_LIMIT = { windowMs: 60 * 60 * 1000, maxRequests: 20 };

// Provider configurations
const PROVIDERS = {
  meshy: {
    name: 'Meshy',
    envKey: 'MESHY_API_KEY',
    baseUrl: 'https://api.meshy.ai',
    modes: ['text-to-3d', 'image-to-3d'],
    formats: ['glb', 'fbx', 'obj', 'usdz'],
    styles: ['realistic', 'cartoon', 'sculpture', 'pbr'],
  },
  tripo3d: {
    name: 'Tripo3D',
    envKey: 'TRIPO_API_KEY',
    baseUrl: 'https://api.tripo3d.ai',
    modes: ['text-to-3d', 'image-to-3d'],
    formats: ['glb', 'obj'],
    styles: ['realistic', 'stylized'],
  },
} as const;

type Provider = keyof typeof PROVIDERS;

interface GenerateRequest {
  provider?: Provider;
  mode: 'text-to-3d' | 'image-to-3d';
  prompt?: string;
  imageUrl?: string;
  imageBase64?: string;
  style?: string;
  format?: string;
  quality?: 'draft' | 'standard' | 'high';
  targetPolycount?: number;
  negativePrompt?: string;
}

function getAvailableProviders(): Provider[] {
  return Object.entries(PROVIDERS)
    .filter(([, config]) => Boolean(process.env[config.envKey]))
    .map(([id]) => id as Provider);
}

// Meshy: Text-to-3D
async function meshyTextTo3D(
  prompt: string,
  style: string,
  quality: string,
  negativePrompt?: string
): Promise<{ taskId: string; status: string }> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) throw new Error('MESHY_API_KEY not configured');

  // Step 1: Create task
  const createResponse = await fetch('https://api.meshy.ai/v2/text-to-3d', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: quality === 'draft' ? 'preview' : 'refine',
      prompt,
      art_style: style,
      negative_prompt: negativePrompt || 'low quality, blurry, distorted',
      ai_model: 'meshy-4',
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(error.message || 'Meshy API error');
  }

  const result = await createResponse.json();
  return {
    taskId: result.result,
    status: 'processing',
  };
}

// Meshy: Image-to-3D
async function meshyImageTo3D(
  imageUrl: string,
  quality: string
): Promise<{ taskId: string; status: string }> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) throw new Error('MESHY_API_KEY not configured');

  const createResponse = await fetch('https://api.meshy.ai/v2/image-to-3d', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      enable_pbr: true,
      ai_model: 'meshy-4',
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(error.message || 'Meshy API error');
  }

  const result = await createResponse.json();
  return {
    taskId: result.result,
    status: 'processing',
  };
}

// Tripo3D: Text-to-3D
async function tripoTextTo3D(
  prompt: string,
  style: string
): Promise<{ taskId: string; status: string }> {
  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) throw new Error('TRIPO_API_KEY not configured');

  const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'text_to_model',
      prompt,
      model_version: 'v2.0-20240919',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Tripo3D API error');
  }

  const result = await response.json();
  return {
    taskId: result.data.task_id,
    status: 'processing',
  };
}

// Tripo3D: Image-to-3D
async function tripoImageTo3D(
  imageUrl: string
): Promise<{ taskId: string; status: string }> {
  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) throw new Error('TRIPO_API_KEY not configured');

  const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'image_to_model',
      file: {
        type: 'url',
        url: imageUrl,
      },
      model_version: 'v2.0-20240919',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Tripo3D API error');
  }

  const result = await response.json();
  return {
    taskId: result.data.task_id,
    status: 'processing',
  };
}

// Check task status
async function checkTaskStatus(
  provider: Provider,
  taskId: string
): Promise<{
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  modelUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}> {
  if (provider === 'meshy') {
    const apiKey = process.env.MESHY_API_KEY;
    const response = await fetch(`https://api.meshy.ai/v2/text-to-3d/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const result = await response.json();
    
    if (result.status === 'SUCCEEDED') {
      return {
        status: 'completed',
        progress: 100,
        modelUrl: result.model_urls?.glb,
        thumbnailUrl: result.thumbnail_url,
      };
    } else if (result.status === 'FAILED') {
      return { status: 'failed', error: result.task_error?.message };
    }
    
    return {
      status: 'processing',
      progress: result.progress || 0,
    };
  }

  if (provider === 'tripo3d') {
    const apiKey = process.env.TRIPO_API_KEY;
    const response = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const result = await response.json();
    const data = result.data;
    
    if (data.status === 'success') {
      return {
        status: 'completed',
        progress: 100,
        modelUrl: data.output?.model,
        thumbnailUrl: data.output?.rendered_image,
      };
    } else if (data.status === 'failed') {
      return { status: 'failed', error: data.message };
    }
    
    return {
      status: 'processing',
      progress: data.progress || 0,
    };
  }

  throw new Error('Unknown provider');
}

export async function POST(req: NextRequest) {
  let user: AuthUser;
  try {
    user = requireAuth(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkRateLimit(req, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', remaining: rateLimit.remaining },
      { status: 429 }
    );
  }

  try {
    const body: GenerateRequest = await req.json();
    const {
      provider = 'meshy',
      mode = 'text-to-3d',
      prompt,
      imageUrl,
      imageBase64,
      style = 'realistic',
      quality = 'standard',
      negativePrompt,
    } = body;

    // Validate provider
    if (!PROVIDERS[provider as Provider]) {
      return NextResponse.json(
        { error: `Invalid provider. Valid: ${Object.keys(PROVIDERS).join(', ')}` },
        { status: 400 }
      );
    }

    const providerConfig = PROVIDERS[provider as Provider];
    
    // Keep provider selection explicit: do not auto-fallback to another provider.
    if (!process.env[providerConfig.envKey]) {
      const availableProviders = getAvailableProviders();
      return capabilityResponse({
        error: 'PROVIDER_NOT_CONFIGURED',
        status: 503,
        message:
          availableProviders.length === 0
            ? 'No 3D generation provider configured.'
            : `Requested provider "${provider}" is not configured.`,
        capability: 'AI_3D_GENERATION',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1_PROVIDER_CONFIG',
        metadata: {
          requestedProvider: provider,
          requiredEnv: providerConfig.envKey,
          availableProviders,
        },
      });
    }

    // Validate mode
    if (!providerConfig.modes.includes(mode as any)) {
      return NextResponse.json(
        { error: `Mode ${mode} not supported by ${provider}. Valid: ${providerConfig.modes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate input based on mode
    if (mode === 'text-to-3d') {
      if (!prompt || typeof prompt !== 'string') {
        return NextResponse.json({ error: 'Missing prompt for text-to-3d' }, { status: 400 });
      }
    }

    if (mode === 'image-to-3d') {
      if (!imageUrl && !imageBase64) {
        return NextResponse.json({ error: 'Missing image for image-to-3d' }, { status: 400 });
      }
    }

    console.log(`[3D API] Generating with ${provider} (${mode}): "${prompt?.substring(0, 50) || 'image'}..."`);

    // Generate based on provider and mode
    let result: { taskId: string; status: string };

    if (provider === 'meshy') {
      if (mode === 'text-to-3d') {
        result = await meshyTextTo3D(prompt!, style, quality, negativePrompt);
      } else {
        const resolvedImageUrl = imageUrl || `data:image/png;base64,${imageBase64}`;
        result = await meshyImageTo3D(resolvedImageUrl, quality);
      }
    } else if (provider === 'tripo3d') {
      if (mode === 'text-to-3d') {
        result = await tripoTextTo3D(prompt!, style);
      } else {
        const resolvedImageUrl = imageUrl || `data:image/png;base64,${imageBase64}`;
        result = await tripoImageTo3D(resolvedImageUrl);
      }
    } else {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    console.log(`[3D API] Task created: ${result.taskId}`);

    // Return task info for polling
    return NextResponse.json({
      success: true,
      provider,
      mode,
      task: {
        id: result.taskId,
        status: result.status,
        checkStatusUrl: `/api/ai/3d/status?provider=${provider}&taskId=${result.taskId}`,
      },
      metadata: {
        prompt: prompt?.substring(0, 100),
        style,
        quality,
        createdAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[3D API] Error:', error);
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Check task status or list providers
export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const taskId = url.searchParams.get('taskId');
  const provider = url.searchParams.get('provider') as Provider | null;

  // If taskId provided, check status
  if (taskId && provider) {
    if (!PROVIDERS[provider]) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    try {
      const status = await checkTaskStatus(provider, taskId);
      return NextResponse.json({
        provider,
        taskId,
        ...status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Status check failed';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Otherwise, list providers
  const providers = Object.entries(PROVIDERS).map(([id, config]) => ({
    id,
    name: config.name,
    available: !!process.env[config.envKey],
    modes: config.modes,
    formats: config.formats,
    styles: config.styles,
  }));

  return NextResponse.json({
    providers,
    defaultProvider: providers.find(p => p.available)?.id || null,
    usage: {
      textTo3D: 'POST with { prompt, provider?, style?, quality? }',
      imageTo3D: 'POST with { mode: "image-to-3d", imageUrl or imageBase64, provider? }',
      checkStatus: 'GET with ?provider=meshy&taskId=xxx',
    },
  });
}
