/**
 * AI Voice Generation API
 * 
 * Unified endpoint for text-to-speech using multiple providers:
 * - ElevenLabs (highest quality)
 * - OpenAI TTS (fast, good quality)
 * - Azure Speech (enterprise)
 * 
 * Used for:
 * - Character dialogue
 * - Narration
 * - Tutorials
 * - Accessibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthUser } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit';
import OpenAI from 'openai';
import { capabilityResponse } from '@/lib/server/capability-response';

// Rate limit: 50 voice generations per hour
const VOICE_RATE_LIMIT = { windowMs: 60 * 60 * 1000, maxRequests: 50 };

// Provider configurations
const PROVIDERS = {
  elevenlabs: {
    name: 'ElevenLabs',
    envKey: 'ELEVENLABS_API_KEY',
    voices: ['rachel', 'drew', 'clyde', 'paul', 'domi', 'dave', 'fin', 'bella', 'antoni', 'thomas', 'charlie', 'emily', 'elli', 'callum', 'patrick', 'harry', 'liam', 'dorothy', 'josh', 'arnold', 'charlotte', 'matilda', 'matthew', 'james', 'joseph', 'jeremy', 'michael', 'ethan', 'gigi', 'freya', 'grace', 'daniel', 'serena', 'adam', 'nicole', 'jessie', 'ryan', 'sam', 'glinda', 'giovanni', 'mimi'],
    emotions: ['neutral', 'happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted'],
  },
  openai: {
    name: 'OpenAI TTS',
    envKey: 'OPENAI_API_KEY',
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    emotions: [], // OpenAI doesn't support emotions directly
  },
  azure: {
    name: 'Azure Speech',
    envKey: 'AZURE_SPEECH_KEY',
    voices: ['en-US-JennyNeural', 'en-US-GuyNeural', 'en-US-AriaNeural', 'en-US-DavisNeural', 'en-US-AmberNeural', 'en-US-AnaNeural', 'en-US-AshleyNeural', 'en-US-BrandonNeural', 'en-US-ChristopherNeural', 'en-US-CoraNeural'],
    emotions: ['neutral', 'cheerful', 'sad', 'angry', 'fearful', 'surprised', 'excited', 'friendly', 'hopeful', 'shouting', 'whispering'],
  },
} as const;

type Provider = keyof typeof PROVIDERS;

interface GenerateRequest {
  text: string;
  provider?: Provider;
  voice?: string;
  emotion?: string;
  speed?: number; // 0.5 to 2.0
  pitch?: number; // -50 to +50
  format?: 'mp3' | 'wav' | 'ogg';
}

function getAvailableProviders(): Provider[] {
  return Object.entries(PROVIDERS)
    .filter(([, config]) => Boolean(process.env[config.envKey]))
    .map(([id]) => id as Provider);
}

// ElevenLabs Generation
async function generateWithElevenLabs(
  text: string,
  voiceId: string,
  emotion: string,
  speed: number
): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');

  // Map voice name to ID (using default mapping)
  const voiceIdMap: Record<string, string> = {
    rachel: '21m00Tcm4TlvDq8ikWAM',
    drew: '29vD33N1CtxCmqQRPOHJ',
    clyde: '2EiwWnXFnvU5JabPnv8n',
    paul: '5Q0t7uMcjvnagumLfvZi',
    domi: 'AZnzlk1XvdvUeBnXmlld',
    dave: 'CYw3kZ02Hs0563khs1Fj',
    fin: 'D38z5RcWu1voky8WS1ja',
    bella: 'EXAVITQu4vr4xnSDxMaL',
    antoni: 'ErXwobaYiN019PkySvjV',
    thomas: 'GBv7mTt0atIp3Br8iCZE',
    // Add more as needed
  };

  const resolvedVoiceId = voiceIdMap[voiceId] || voiceId;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: emotion === 'neutral' ? 0 : 0.5,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.message || 'ElevenLabs API error');
  }

  return response.arrayBuffer();
}

// OpenAI TTS Generation
async function generateWithOpenAI(
  text: string,
  voice: string,
  speed: number,
  format: string
): Promise<ArrayBuffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey });

  const response = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
    input: text,
    speed: Math.max(0.25, Math.min(4.0, speed)),
    response_format: format as 'mp3' | 'opus' | 'aac' | 'flac',
  });

  return response.arrayBuffer();
}

// Azure Speech Generation
async function generateWithAzure(
  text: string,
  voice: string,
  emotion: string,
  speed: number,
  pitch: number
): Promise<ArrayBuffer> {
  const apiKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  
  if (!apiKey) throw new Error('AZURE_SPEECH_KEY not configured');

  // Build SSML
  const rate = speed >= 1 ? `+${((speed - 1) * 100).toFixed(0)}%` : `-${((1 - speed) * 100).toFixed(0)}%`;
  const pitchValue = pitch >= 0 ? `+${pitch}%` : `${pitch}%`;
  
  let ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
           xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
      <voice name="${voice}">
        <prosody rate="${rate}" pitch="${pitchValue}">`;
  
  if (emotion && emotion !== 'neutral') {
    ssml += `<mstts:express-as style="${emotion}">${text}</mstts:express-as>`;
  } else {
    ssml += text;
  }
  
  ssml += `</prosody></voice></speak>`;

  const response = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      body: ssml,
    }
  );

  if (!response.ok) {
    throw new Error('Azure Speech API error');
  }

  return response.arrayBuffer();
}

export async function POST(req: NextRequest) {
  // Auth check
  let user: AuthUser;
  try {
    user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-voice-generate-post',
      key: user.userId,
      max: 50,
      windowMs: 60 * 60 * 1000,
      message: 'Too many voice generation requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  const rateLimit = checkRateLimit(req, VOICE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', remaining: rateLimit.remaining },
      { status: 429 }
    );
  }

  try {
    const body: GenerateRequest = await req.json();
    const {
      text,
      provider = 'openai',
      voice,
      emotion = 'neutral',
      speed = 1.0,
      pitch = 0,
      format = 'mp3',
    } = body;

    // Validate text
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text too long (max 5000 chars)' }, { status: 400 });
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
            ? 'No voice generation provider configured.'
            : `Requested provider "${provider}" is not configured.`,
        capability: 'AI_VOICE_GENERATION',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1_PROVIDER_CONFIG',
        metadata: {
          requestedProvider: provider,
          requiredEnv: providerConfig.envKey,
          availableProviders,
        },
      });
    }

    // Get default voice for provider
    const defaultVoice = voice || providerConfig.voices[0];

    console.log(`[Voice API] Generating with ${provider}: "${text.substring(0, 50)}..."`);

    // Generate based on provider
    let audioBuffer: ArrayBuffer;

    switch (provider) {
      case 'elevenlabs':
        audioBuffer = await generateWithElevenLabs(text, defaultVoice, emotion, speed);
        break;
      case 'openai':
        audioBuffer = await generateWithOpenAI(text, defaultVoice, speed, format);
        break;
      case 'azure':
        audioBuffer = await generateWithAzure(text, defaultVoice, emotion, speed, pitch);
        break;
      default:
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    console.log(`[Voice API] Generated ${audioBuffer.byteLength} bytes`);

    // Return audio as base64
    const base64 = Buffer.from(audioBuffer).toString('base64');
    const mimeType = format === 'wav' ? 'audio/wav' : format === 'ogg' ? 'audio/ogg' : 'audio/mpeg';

    return NextResponse.json({
      success: true,
      provider,
      audio: {
        data: base64,
        mimeType,
        format,
        size: audioBuffer.byteLength,
      },
      metadata: {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        voice: defaultVoice,
        emotion,
        speed,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Voice API] Error:', error);
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - List available providers and voices
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-voice-generate-get',
      key: auth.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many voice provider status requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providers = Object.entries(PROVIDERS).map(([id, config]) => ({
    id,
    name: config.name,
    available: !!process.env[config.envKey],
    voices: config.voices,
    emotions: config.emotions,
  }));

  return NextResponse.json({
    providers,
    defaultProvider: providers.find(p => p.available)?.id || null,
  });
}
