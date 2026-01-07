/**
 * AI Music Generation API
 * 
 * Unified endpoint for music generation using multiple providers:
 * - Suno (high quality music)
 * - MusicGen (Meta's open model)
 * 
 * Used for:
 * - Game soundtracks
 * - Film scores
 * - Sound effects
 * - Ambient music
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthUser } from '@/lib/auth-server';
import { checkRateLimit } from '@/lib/rate-limit';

// Rate limit: 30 music generations per hour
const RATE_LIMIT = { windowMs: 60 * 60 * 1000, maxRequests: 30 };

// Provider configurations
const PROVIDERS = {
  suno: {
    name: 'Suno',
    envKey: 'SUNO_API_KEY',
    maxDuration: 240, // 4 minutes
    genres: [
      'pop', 'rock', 'electronic', 'classical', 'jazz', 'hip-hop', 
      'ambient', 'cinematic', 'orchestral', 'game', 'lofi', 'metal',
      'folk', 'country', 'r&b', 'disco', 'funk', 'indie', 'punk',
      'synthwave', 'retrowave', 'epic', 'trailer'
    ],
    moods: [
      'happy', 'sad', 'epic', 'mysterious', 'tense', 'relaxing',
      'energetic', 'melancholic', 'uplifting', 'dark', 'bright',
      'aggressive', 'peaceful', 'romantic', 'heroic', 'ominous'
    ],
  },
  musicgen: {
    name: 'MusicGen (Replicate)',
    envKey: 'REPLICATE_API_TOKEN',
    maxDuration: 30,
    genres: ['all'],
    moods: ['all'],
  },
} as const;

type Provider = keyof typeof PROVIDERS;

interface GenerateRequest {
  provider?: Provider;
  prompt: string;
  genre?: string;
  mood?: string;
  duration?: number; // seconds
  tempo?: 'slow' | 'medium' | 'fast';
  instrumental?: boolean;
  lyrics?: string;
  referenceUrl?: string; // for style reference
}

// Suno Generation
async function generateWithSuno(
  prompt: string,
  options: {
    genre?: string;
    mood?: string;
    duration?: number;
    instrumental?: boolean;
    lyrics?: string;
  }
): Promise<{ taskId: string; status: string }> {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) throw new Error('SUNO_API_KEY not configured');

  // Build enhanced prompt
  let enhancedPrompt = prompt;
  if (options.genre) enhancedPrompt += `, ${options.genre} style`;
  if (options.mood) enhancedPrompt += `, ${options.mood} mood`;

  const body: any = {
    prompt: enhancedPrompt,
    make_instrumental: options.instrumental ?? false,
    wait_audio: false,
  };

  if (options.lyrics) {
    body.custom_lyrics = options.lyrics;
  }

  const response = await fetch('https://api.suno.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.message || 'Suno API error');
  }

  const result = await response.json();
  
  return {
    taskId: result.id || result[0]?.id,
    status: 'processing',
  };
}

// MusicGen via Replicate
async function generateWithMusicGen(
  prompt: string,
  duration: number
): Promise<{ taskId: string; status: string }> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error('REPLICATE_API_TOKEN not configured');

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38', // MusicGen model
      input: {
        prompt,
        duration: Math.min(duration, 30),
        model_version: 'stereo-large',
        output_format: 'mp3',
        normalization_strategy: 'peak',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Replicate API error');
  }

  const result = await response.json();
  
  return {
    taskId: result.id,
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
  audioUrl?: string;
  error?: string;
  duration?: number;
}> {
  if (provider === 'suno') {
    const apiKey = process.env.SUNO_API_KEY;
    
    const response = await fetch(`https://api.suno.ai/v1/generate/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    if (!response.ok) {
      throw new Error('Failed to check Suno task status');
    }
    
    const result = await response.json();
    
    if (result.status === 'complete' || result.audio_url) {
      return {
        status: 'completed',
        progress: 100,
        audioUrl: result.audio_url,
        duration: result.duration,
      };
    } else if (result.status === 'failed') {
      return { status: 'failed', error: result.error };
    }
    
    return {
      status: 'processing',
      progress: result.progress || 50,
    };
  }

  if (provider === 'musicgen') {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    
    const response = await fetch(`https://api.replicate.com/v1/predictions/${taskId}`, {
      headers: { 'Authorization': `Token ${apiToken}` },
    });
    
    if (!response.ok) {
      throw new Error('Failed to check Replicate task status');
    }
    
    const result = await response.json();
    
    if (result.status === 'succeeded') {
      return {
        status: 'completed',
        progress: 100,
        audioUrl: result.output,
      };
    } else if (result.status === 'failed') {
      return { status: 'failed', error: result.error };
    }
    
    return {
      status: 'processing',
      progress: 50,
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
      provider = 'suno',
      prompt,
      genre,
      mood,
      duration = 30,
      instrumental = true,
      lyrics,
    } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Validate provider
    if (!PROVIDERS[provider as Provider]) {
      return NextResponse.json(
        { error: `Invalid provider. Valid: ${Object.keys(PROVIDERS).join(', ')}` },
        { status: 400 }
      );
    }

    const providerConfig = PROVIDERS[provider as Provider];
    
    // Check API key
    if (!process.env[providerConfig.envKey]) {
      const availableProvider = Object.entries(PROVIDERS).find(
        ([_, config]) => process.env[config.envKey]
      );
      
      if (!availableProvider) {
        return NextResponse.json(
          { 
            error: 'No music provider configured',
            message: 'Please configure SUNO_API_KEY or REPLICATE_API_TOKEN',
          },
          { status: 503 }
        );
      }
    }

    // Validate duration
    const maxDuration = providerConfig.maxDuration;
    if (duration > maxDuration) {
      return NextResponse.json(
        { error: `Duration exceeds maximum of ${maxDuration}s for ${provider}` },
        { status: 400 }
      );
    }

    console.log(`[Music API] Generating with ${provider}: "${prompt.substring(0, 50)}..."`);

    // Generate based on provider
    let result: { taskId: string; status: string };

    if (provider === 'suno') {
      result = await generateWithSuno(prompt, {
        genre,
        mood,
        duration,
        instrumental,
        lyrics,
      });
    } else if (provider === 'musicgen') {
      result = await generateWithMusicGen(prompt, duration);
    } else {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    console.log(`[Music API] Task created: ${result.taskId}`);

    return NextResponse.json({
      success: true,
      provider,
      task: {
        id: result.taskId,
        status: result.status,
        checkStatusUrl: `/api/ai/music/status?provider=${provider}&taskId=${result.taskId}`,
      },
      metadata: {
        prompt: prompt.substring(0, 100),
        genre,
        mood,
        duration,
        instrumental,
        createdAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Music API] Error:', error);
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Check status or list providers
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
    maxDuration: config.maxDuration,
    genres: config.genres,
    moods: config.moods,
  }));

  return NextResponse.json({
    providers,
    defaultProvider: providers.find(p => p.available)?.id || null,
    usage: {
      generate: 'POST with { prompt, genre?, mood?, duration?, instrumental?, lyrics? }',
      checkStatus: 'GET with ?provider=suno&taskId=xxx',
    },
    examples: {
      gameMusic: {
        prompt: 'Epic orchestral battle theme with drums and brass',
        genre: 'orchestral',
        mood: 'epic',
        duration: 60,
        instrumental: true,
      },
      ambientMusic: {
        prompt: 'Calm forest ambiance with soft piano',
        genre: 'ambient',
        mood: 'relaxing',
        duration: 120,
        instrumental: true,
      },
    },
  });
}
