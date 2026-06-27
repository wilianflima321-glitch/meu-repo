/**
 * vision-provider.ts
 *
 * Production AI vision moderation adapters.
 * Supports: Amazon Rekognition, Hive Moderation API, OpenAI GPT-4o Vision
 *
 * Selection priority: MODERATION_PROVIDER env var (rekognition | hive | openai | none)
 */

import type { ModerationCategory } from './content-moderator';

export interface VisionModerationResult {
  score: number;
  categories: Partial<Record<ModerationCategory, number>>;
  raw?: unknown;
}

// ─────────────────────────────────────────────────────────────
// Hive Moderation API
// ─────────────────────────────────────────────────────────────

async function moderateWithHive(imageBase64: string): Promise<VisionModerationResult> {
  const apiKey = process.env.HIVE_API_KEY;
  if (!apiKey) throw new Error('HIVE_API_KEY not set');

  const res = await fetch('https://api.thehive.ai/api/v2/task/sync', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: [{ image: { format: 'base64', data: imageBase64 } }],
    }),
  });

  if (!res.ok) throw new Error(`Hive API error: ${res.status}`);

  const data = await res.json() as {
    status: { response: { output: Array<{ classes: Array<{ class: string; score: number }> }> } }[];
  };

  const classes = data.status?.[0]?.response?.output?.[0]?.classes ?? [];

  const categories: Partial<Record<ModerationCategory, number>> = {};
  let maxScore = 0;

  for (const cls of classes) {
    const s = cls.score;
    const name = cls.class.toLowerCase();

    if (name.includes('csam') || name.includes('minor')) {
      categories.dangerous_content = Math.max(categories.dangerous_content ?? 0, s);
    } else if (name.includes('sex') || name.includes('porn') || name.includes('nudity')) {
      categories.adult_content = Math.max(categories.adult_content ?? 0, s);
    } else if (name.includes('gore') || name.includes('violence')) {
      categories.violence = Math.max(categories.violence ?? 0, s);
    } else if (name.includes('hate') || name.includes('nazi')) {
      categories.hate_speech = Math.max(categories.hate_speech ?? 0, s);
    }

    maxScore = Math.max(maxScore, s);
  }

  return { score: maxScore, categories, raw: data };
}

// ─────────────────────────────────────────────────────────────
// Amazon Rekognition (via AWS SDK v3)
// ─────────────────────────────────────────────────────────────

async function moderateWithRekognition(imageBase64: string): Promise<VisionModerationResult> {
  // Dynamic import to avoid bundling AWS SDK in browser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rekognitionModule: any;
  try {
    // @ts-expect-error — optional peer dependency
    rekognitionModule = await import('@aws-sdk/client-rekognition');
  } catch {
    throw new Error('@aws-sdk/client-rekognition is not installed. Run: npm install @aws-sdk/client-rekognition');
  }
  const { RekognitionClient, DetectModerationLabelsCommand } = rekognitionModule;

  const client = new RekognitionClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
  const bytes = Buffer.from(imageBase64, 'base64');

  const cmd = new DetectModerationLabelsCommand({
    Image: { Bytes: bytes },
    MinConfidence: 50,
  });

  const result = await client.send(cmd);
  const labels = result.ModerationLabels ?? [];

  const categories: Partial<Record<ModerationCategory, number>> = {};
  let maxScore = 0;

  for (const label of labels) {
    const confidence = (label.Confidence ?? 0) / 100;
    const name = (label.Name ?? '').toLowerCase();
    const parent = (label.ParentName ?? '').toLowerCase();

    if (name.includes('explicit') || parent.includes('explicit')) {
      categories.adult_content = Math.max(categories.adult_content ?? 0, confidence);
    } else if (name.includes('violence') || parent.includes('violence')) {
      categories.violence = Math.max(categories.violence ?? 0, confidence);
    } else if (name.includes('hate') || parent.includes('hate')) {
      categories.hate_speech = Math.max(categories.hate_speech ?? 0, confidence);
    }

    maxScore = Math.max(maxScore, confidence);
  }

  return { score: maxScore, categories, raw: labels };
}

// ─────────────────────────────────────────────────────────────
// OpenAI GPT-4o Vision Fallback
// ─────────────────────────────────────────────────────────────

async function moderateWithOpenAI(imageBase64: string): Promise<VisionModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Rate this image for: adult_content, violence, hate_speech, dangerous_content. Return JSON only: {"scores":{"adult_content":0,"violence":0,"hate_speech":0,"dangerous_content":0}}. Scores 0=safe, 1=clearly violates policy.',
            },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI moderation error: ${res.status}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message?.content ?? '{}';

  let parsed: { scores: Record<string, number> } = { scores: {} };
  try {
    parsed = JSON.parse(content) as typeof parsed;
  } catch {
    // unable to parse — default safe
  }

  const categories: Partial<Record<ModerationCategory, number>> = {};
  let maxScore = 0;

  for (const [key, val] of Object.entries(parsed.scores ?? {})) {
    const cat = key as ModerationCategory;
    categories[cat] = val;
    maxScore = Math.max(maxScore, val);
  }

  return { score: maxScore, categories };
}

// ─────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────

export type VisionProvider = 'hive' | 'rekognition' | 'openai' | 'none';

export async function runVisionModeration(
  imageBase64: string,
  provider: VisionProvider = (process.env.MODERATION_PROVIDER as VisionProvider) ?? 'none'
): Promise<VisionModerationResult> {
  switch (provider) {
    case 'hive':
      return moderateWithHive(imageBase64);
    case 'rekognition':
      return moderateWithRekognition(imageBase64);
    case 'openai':
      return moderateWithOpenAI(imageBase64);
    default:
      return { score: 0, categories: {} };
  }
}
