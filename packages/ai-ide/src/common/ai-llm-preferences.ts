export const AI_LLM_PROVIDERS_PREF = 'ai.externalProviders';
export const AI_LLM_DEFAULT_PROVIDER_PREF = 'ai.defaultProvider';

export interface LlmProviderConfig {
  id: string;
  name: string;
  type: 'custom' | 'aethel';
  endpoint?: string; // user-provided API endpoint for 'custom'
  apiKey?: string; // optional api key stored in preferences (warning: may be insecure)
  description?: string;
  isEnabled?: boolean;
  // billing fields
  billingMode?: 'platform' | 'self' | 'sponsored';
  ownerId?: string; // user or org id that owns this provider (null for global/platform-owned)
  promoId?: string; // optional promotional id applied to this provider
}

export const aiLlmPreferenceSchema = {
  type: 'object',
  properties: {
    [AI_LLM_PROVIDERS_PREF]: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['custom', 'aethel'] },
          endpoint: { type: 'string' },
          apiKey: { type: 'string' },
          description: { type: 'string' },
          isEnabled: { type: 'boolean' }
          ,
              billingMode: { type: 'string', enum: ['platform', 'self', 'sponsored'] },
              ownerId: { type: 'string' },
              promoId: { type: 'string' }
        },
        required: ['id', 'name', 'type']
      },
      default: []
    },
    [AI_LLM_DEFAULT_PROVIDER_PREF]: { type: 'string', default: '' }
  }
};
