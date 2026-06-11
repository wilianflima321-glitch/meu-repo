import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AdvancedAIClients {
  openai: OpenAI | null;
  openrouter: OpenAI | null;
  anthropic: Anthropic | null;
  google: GoogleGenerativeAI | null;
}

export function initializeAdvancedAIClients(): AdvancedAIClients {
  const clients: AdvancedAIClients = {
    openai: null,
    openrouter: null,
    anthropic: null,
    google: null,
  };

  if (process.env.OPENAI_API_KEY) {
    clients.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  if (process.env.OPENROUTER_API_KEY) {
    clients.openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://aethel.local',
        'X-Title': 'Aethel Engine',
      },
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    clients.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  if (process.env.GOOGLE_API_KEY) {
    clients.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }

  return clients;
}

export function selectDefaultAdvancedAIModel(clients: AdvancedAIClients): string {
  if (clients.openrouter) return 'google/gemini-3.1-flash-lite-preview';
  if (clients.google) return 'gemini-1.5-flash';
  if (clients.openai) return 'gpt-4o-mini';
  if (clients.anthropic) return 'claude-3-5-haiku-20241022';
  throw new Error('No AI provider configured');
}
