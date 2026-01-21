import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';

const handler = async (_req: NextRequest) => {
  const integrations = [
    { id: 'openai', name: 'OpenAI', envKey: 'OPENAI_API_KEY' },
    { id: 'anthropic', name: 'Anthropic', envKey: 'ANTHROPIC_API_KEY' },
    { id: 'google', name: 'Google Gemini', envKey: 'GOOGLE_API_KEY' },
    { id: 'azure', name: 'Azure OpenAI', envKey: 'AZURE_OPENAI_API_KEY' },
    { id: 'elevenlabs', name: 'ElevenLabs', envKey: 'ELEVENLABS_API_KEY' },
    { id: 'meshy', name: 'Meshy', envKey: 'MESHY_API_KEY' },
    { id: 'suno', name: 'Suno', envKey: 'SUNO_API_KEY' },
  ];

  return NextResponse.json({
    success: true,
    integrations: integrations.map((integration) => ({
      id: integration.id,
      name: integration.name,
      envKey: integration.envKey,
      configured: Boolean(process.env[integration.envKey]),
    })),
  });
};

export const GET = withAdminAuth(handler, 'ops:settings:view');
