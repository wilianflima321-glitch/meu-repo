/**
 * AI Image Generation API
 * 
 * Unified endpoint for generating images using multiple AI providers:
 * - DALL-E 3 (OpenAI)
 * - Stable Diffusion (Stability AI)
 * - Flux (Black Forest Labs)
 * 
 * Used for:
 * - Concept art
 * - Textures
 * - UI elements
 * - Sprites
 * - Backgrounds
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthUser } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit';
import OpenAI from 'openai';
import { capabilityResponse } from '@/lib/server/capability-response';

// Rate limit: 20 images per hour
const IMAGE_RATE_LIMIT = { windowMs: 60 * 60 * 1000, maxRequests: 20 };

// Provider configurations
const PROVIDERS = {
  dalle: {
    name: 'DALL-E 3',
    envKey: 'OPENAI_API_KEY',
    sizes: ['1024x1024', '1024x1792', '1792x1024'],
    styles: ['vivid', 'natural'],
  },
  'stable-diffusion': {
    name: 'Stable Diffusion',
    envKey: 'STABILITY_API_KEY',
    sizes: ['512x512', '768x768', '1024x1024'],
    styles: ['photorealistic', 'anime', 'digital-art', '3d-model'],
  },
  flux: {
    name: 'Flux',
    envKey: 'FLUX_API_KEY',
    sizes: ['1024x1024', '1024x768', '768x1024'],
    styles: ['default', 'raw'],
  },
} as const;

type Provider = keyof typeof PROVIDERS;

interface GenerateRequest {
  prompt: string;
  provider?: Provider;
  size?: string;
  style?: string;
  quality?: 'standard' | 'hd';
  n?: number;
}

function getAvailableProviders(): Provider[] {
  return Object.entries(PROVIDERS)
    .filter(([, config]) => Boolean(process.env[config.envKey]))
    .map(([id]) => id as Provider);
}

// DALL-E Generation
async function generateWithDalle(
  prompt: string,
  size: string,
  style: string,
  quality: string,
  n: number
): Promise<{ url: string; revisedPrompt?: string }[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: Math.min(n, 1), // DALL-E 3 only supports n=1
    size: size as '1024x1024' | '1024x1792' | '1792x1024',
    style: style as 'vivid' | 'natural',
    quality: quality as 'standard' | 'hd',
    response_format: 'url',
  });

  if (!response.data || response.data.length === 0) {
    throw new Error('No images generated');
  }

  return response.data.map((img) => ({
    url: img.url!,
    revisedPrompt: img.revised_prompt,
  }));
}

// Stable Diffusion Generation
async function generateWithStableDiffusion(
  prompt: string,
  size: string,
  style: string,
  n: number
): Promise<{ url: string }[]> {
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    throw new Error('STABILITY_API_KEY not configured');
  }

  const [width, height] = size.split('x').map(Number);

  const response = await fetch(
    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: prompt,
            weight: 1,
          },
        ],
        cfg_scale: 7,
        width,
        height,
        steps: 30,
        samples: n,
        style_preset: style,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Stability API error');
  }

  const data = await response.json();

  // Convert base64 to data URLs
  return data.artifacts.map((artifact: { base64: string }) => ({
    url: `data:image/png;base64,${artifact.base64}`,
  }));
}

// Flux Generation (Black Forest Labs)
async function generateWithFlux(
  prompt: string,
  size: string,
  n: number
): Promise<{ url: string }[]> {
  const apiKey = process.env.FLUX_API_KEY;
  if (!apiKey) {
    throw new Error('FLUX_API_KEY not configured');
  }

  const [width, height] = size.split('x').map(Number);

  const response = await fetch('https://api.bfl.ml/v1/flux-pro-1.1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-key': apiKey,
    },
    body: JSON.stringify({
      prompt,
      width,
      height,
      steps: 28,
      guidance: 3,
    }),
  });

  if (!response.ok) {
    throw new Error('Flux API error');
  }

  const data = await response.json();

  // Poll for result
  const resultUrl = `https://api.bfl.ml/v1/get_result?id=${data.id}`;
  
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const resultResponse = await fetch(resultUrl, {
      headers: { 'x-key': apiKey },
    });
    
    const result = await resultResponse.json();
    
    if (result.status === 'Ready') {
      return [{ url: result.result.sample }];
    } else if (result.status === 'Error') {
      throw new Error('Flux generation failed');
    }
  }

  throw new Error('Flux generation timeout');
}

export async function POST(req: NextRequest) {
  // Auth check
  let user: AuthUser;
  try {
    user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-image-generate-post',
      key: user.userId,
      max: 30,
      windowMs: 60 * 60 * 1000,
      message: 'Too many image generation requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  const rateLimit = checkRateLimit(req, IMAGE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      },
      { status: 429 }
    );
  }

  try {
    const body: GenerateRequest = await req.json();
    const {
      prompt,
      provider = 'dalle',
      size = '1024x1024',
      style = provider === 'dalle' ? 'vivid' : 'default',
      quality = 'standard',
      n = 1,
    } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    if (prompt.length > 4000) {
      return NextResponse.json({ error: 'Prompt too long (max 4000 chars)' }, { status: 400 });
    }

    // Validate provider
    if (!PROVIDERS[provider as Provider]) {
      return NextResponse.json(
        { error: `Invalid provider. Valid: ${Object.keys(PROVIDERS).join(', ')}` },
        { status: 400 }
      );
    }

    // Keep provider selection explicit: do not auto-fallback to another provider.
    const providerConfig = PROVIDERS[provider as Provider];
    if (!process.env[providerConfig.envKey]) {
      const availableProviders = getAvailableProviders();
      return capabilityResponse({
        error: 'PROVIDER_NOT_CONFIGURED',
        status: 503,
        message:
          availableProviders.length === 0
            ? 'No image generation provider configured.'
            : `Requested provider "${provider}" is not configured.`,
        capability: 'AI_IMAGE_GENERATION',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1_PROVIDER_CONFIG',
        metadata: {
          requestedProvider: provider,
          requiredEnv: providerConfig.envKey,
          availableProviders,
        },
      });
    }

    // Generate based on provider
    let images: { url: string; revisedPrompt?: string }[];

    console.log(`[Image API] Generating with ${provider}: "${prompt.substring(0, 50)}..."`);

    switch (provider) {
      case 'dalle':
        images = await generateWithDalle(prompt, size, style, quality, n);
        break;
      case 'stable-diffusion':
        images = await generateWithStableDiffusion(prompt, size, style, n);
        break;
      case 'flux':
        images = await generateWithFlux(prompt, size, n);
        break;
      default:
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    console.log(`[Image API] Generated ${images.length} image(s)`);

    return NextResponse.json({
      success: true,
      provider,
      images,
      metadata: {
        prompt,
        size,
        style,
        quality,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Image API] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Generation failed';
    
    // Check for specific errors
    if (message.includes('content_policy')) {
      return NextResponse.json(
        { error: 'Content policy violation. Please modify your prompt.' },
        { status: 400 }
      );
    }
    
    if (message.includes('billing') || message.includes('quota')) {
      return NextResponse.json(
        { error: 'API quota exceeded. Please try again later.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - List available providers and their status
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  const rateLimitResponse = await enforceRateLimit({
    scope: 'ai-image-generate-get',
    key: auth.userId,
    max: 180,
    windowMs: 60 * 60 * 1000,
    message: 'Too many image provider status requests. Please try again later.',
  });
  if (rateLimitResponse) return rateLimitResponse;
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providers = Object.entries(PROVIDERS).map(([id, config]) => ({
    id,
    name: config.name,
    available: !!process.env[config.envKey],
    sizes: config.sizes,
    styles: config.styles,
  }));

  return NextResponse.json({
    providers,
    defaultProvider: providers.find(p => p.available)?.id || null,
  });
}
