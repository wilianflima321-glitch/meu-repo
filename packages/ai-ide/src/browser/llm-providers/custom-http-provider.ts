import { ILlmProvider, SendRequestOptions, LlmProviderResponse } from '../../common/llm-provider';

export class CustomHttpProvider implements ILlmProvider {
  id: string;
  name: string;
  type: 'custom' = 'custom';
  description?: string;
  isEnabled?: boolean;
  endpoint?: string;
  apiKey?: string;

  constructor(cfg: { id: string; name: string; endpoint?: string; apiKey?: string; description?: string; isEnabled?: boolean }) {
    this.id = cfg.id;
    this.name = cfg.name;
    this.endpoint = cfg.endpoint;
    this.apiKey = cfg.apiKey;
    this.description = cfg.description;
    this.isEnabled = cfg.isEnabled ?? true;
  }

  async sendRequest(payload: SendRequestOptions): Promise<LlmProviderResponse> {
    if (!this.endpoint) {
      throw new Error('No endpoint configured for provider ' + this.id);
    }
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    const resp = await fetch(this.endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`Provider ${this.name} returned ${resp.status}: ${txt}`);
    }
    const text = await resp.text();
    let parsed: any = text;
    try { parsed = JSON.parse(text); } catch {}
    return { status: resp.status, body: parsed } as LlmProviderResponse;
  }
}
